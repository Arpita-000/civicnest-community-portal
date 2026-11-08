"""User profile, streak, bookmarks and leaderboard (`routes/users.js` + `routes/leaderboard.js`)."""
import re
import time
from collections import defaultdict, deque

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request

from ..auth import verify_token
from ..database import get_collection
from ..schemas import UserUpsert
from ..utils import serialize_mongo, ttl_cached, utcnow

router = APIRouter(prefix="/users", tags=["Users"])
leaderboard_router = APIRouter(prefix="/leaderboard", tags=["Leaderboard"])

_email_hits: dict[str, deque] = defaultdict(deque)
EMAIL_CHECK_LIMIT, EMAIL_CHECK_WINDOW = 30, 15 * 60


def _public_user(doc: dict | None) -> dict:
    return serialize_mongo(doc or {})


def _find_user(email: str | None = None, uid: str | None = None, projection: dict | None = None) -> dict | None:
    users = get_collection("users")
    if email:
        norm = email.lower().strip()
        doc = users.find_one({"email": norm}, projection)
        if not doc:
            doc = users.find_one({"email": {"$regex": f"^{re.escape(norm)}$", "$options": "i"}}, projection)
        if doc:
            return doc
    if uid:
        doc = users.find_one({"uid": uid}, projection)
        if doc:
            return doc
    return None


def _find_user_by_email(email: str, projection: dict | None = None) -> dict | None:
    return _find_user(email=email, projection=projection)


def _auto_provision_user(auth_user: dict) -> dict:
    """Auto-provision a default resident user if one does not exist in MongoDB."""
    email = auth_user.get("email")
    if not email:
        return {}
    users = get_collection("users")
    existing = _find_user(email=email, uid=auth_user.get("uid"))
    if existing:
        return existing

    target_email = email.lower().strip()
    now = utcnow()
    new_doc = {
        "email": target_email,
        "uid": auth_user.get("uid"),
        "name": auth_user.get("name") or target_email.split("@")[0],
        "photoURL": auth_user.get("picture") or "",
        "role": "guest",
        "points": 0,
        "createdAt": now,
        "lastLogin": now,
        "issueCredits": 3,
        "creditRegenTimestamps": [],
        "streak": {"current": 0, "best": 0, "lastActiveDate": None},
    }
    res = users.insert_one(new_doc)
    new_doc["_id"] = res.inserted_id
    return new_doc


@router.get("/check-email")
def check_email(request: Request, email: str = Query(..., min_length=3)):
    ip = request.client.host if request.client else "unknown"
    hits, now = _email_hits[ip], time.monotonic()
    while hits and now - hits[0] > EMAIL_CHECK_WINDOW:
        hits.popleft()
    if len(hits) >= EMAIL_CHECK_LIMIT:
        raise HTTPException(429, "Too many requests. Please try again later.")
    hits.append(now)
    norm = email.lower().strip()
    exists = _find_user(email=norm, projection={"_id": 1}) is not None
    if not exists:
        try:
            import firebase_admin
            from firebase_admin import auth as fb_auth
            from firebase_admin.exceptions import NotFoundError
            if firebase_admin._apps:
                try:
                    fb_user = fb_auth.get_user_by_email(norm)
                    exists = fb_user is not None
                except (fb_auth.UserNotFoundError, NotFoundError):
                    exists = False
                except Exception:
                    # Non-fatal Firebase error: assume exists so we don't trigger false "Account Not Found" redirects
                    exists = True
            else:
                exists = True
        except Exception:
            exists = True
    return {"exists": exists}


@router.post("")
@router.post("/")
def upsert_user(payload: UserUpsert, auth_user: dict = Depends(verify_token)):
    """Create the profile on first sign-in; later calls only update the fields that were sent."""
    email = auth_user.get("email")
    if not email:
        raise HTTPException(400, "Token does not contain a valid email.")

    fields = payload.model_dump(exclude_none=True)
    if "name" in fields and not fields["name"].strip():
        fields.pop("name")
    users = get_collection("users")
    now = utcnow()

    existing = _find_user(email=email, uid=auth_user.get("uid"))
    if existing:
        target_email = existing.get("email") or email
        update_data = {"uid": auth_user["uid"], "lastLogin": now}
        if not existing.get("name") and (fields.get("name") or auth_user.get("name")):
            update_data["name"] = fields.get("name") or auth_user.get("name")
        if not existing.get("photoURL") and (fields.get("photoURL") or auth_user.get("picture")):
            update_data["photoURL"] = fields.get("photoURL") or auth_user.get("picture")
        for k, v in fields.items():
            if k not in ("email", "uid", "role", "points"):
                update_data[k] = v
        users.update_one({"_id": existing["_id"]}, {"$set": update_data})
    else:
        target_email = email.lower().strip()
        users.insert_one(
            {
                "email": target_email,
                "uid": auth_user["uid"],
                "name": fields.pop("name", None) or auth_user.get("name") or target_email.split("@")[0],
                "photoURL": fields.pop("photoURL", None) or auth_user.get("picture") or "",
                **fields,
                "role": "guest",
                "points": 0,
                "createdAt": now,
                "lastLogin": now,
                "issueCredits": 3,
                "creditRegenTimestamps": [],
                "streak": {"current": 0, "best": 0, "lastActiveDate": None},
            }
        )
    # keep a pending membership request's contact details in sync (as the original does)
    contact = {k: v for k, v in fields.items() if k in ("name", "phone", "area", "streetAddress", "apartmentNumber")}
    if contact:
        get_collection("membershipRequests").update_one({"email": target_email, "status": "pending"}, {"$set": contact})

    return {"message": "User updated" if existing else "User created", "user": _public_user(_find_user(email=target_email, uid=auth_user.get("uid")))}


@router.get("/my")
@router.get("/me")
def my_profile(auth_user: dict = Depends(verify_token)):
    user = _find_user(email=auth_user.get("email"), uid=auth_user.get("uid"))
    if not user:
        user = _auto_provision_user(auth_user)
    if not user:
        raise HTTPException(404, "User not found")
    return _public_user(user)


@router.put("/me/profile")
def update_profile(payload: UserUpsert, auth_user: dict = Depends(verify_token)):
    fields = payload.model_dump(exclude_none=True)
    existing = _find_user(email=auth_user.get("email"), uid=auth_user.get("uid"), projection={"_id": 1})
    if not existing:
        existing = _auto_provision_user(auth_user)
    if not existing:
        raise HTTPException(404, "User not found")
    get_collection("users").update_one({"_id": existing["_id"]}, {"$set": {**fields, "updatedAt": utcnow()}})
    user = get_collection("users").find_one({"_id": existing["_id"]})
    return {"message": "Profile updated successfully", "user": _public_user(user)}


@router.get("/my/streak")
def my_streak(auth_user: dict = Depends(verify_token)):
    user = _find_user(email=auth_user.get("email"), uid=auth_user.get("uid"), projection={"streak": 1}) or {}
    s = user.get("streak") or {}
    return serialize_mongo({"current": s.get("current", 0), "best": s.get("best", 0), "lastActiveDate": s.get("lastActiveDate")})


@router.patch("/my/bookmark")
def toggle_bookmark(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    item_id = str(payload.get("id") or "")
    item_type = payload.get("type") or "issue"
    if not item_id:
        raise HTTPException(400, "ID is required")
    user = _find_user(email=auth_user.get("email"), uid=auth_user.get("uid"))
    if not user:
        user = _auto_provision_user(auth_user)
    if not user:
        raise HTTPException(404, "User not found")
    field = "bookmarkedEvents" if item_type == "cleanup_event" else "bookmarkedIssues"
    current = [str(x) for x in (user.get(field) or [])]
    is_bookmarked = item_id in current
    if is_bookmarked:
        get_collection("users").update_one({"_id": user["_id"]}, {"$pull": {field: item_id}})
    else:
        get_collection("users").update_one({"_id": user["_id"]}, {"$addToSet": {field: item_id}})
    return {"bookmarked": not is_bookmarked, "id": item_id, "type": item_type}


@router.get("/my/bookmarks")
def get_my_bookmarks(auth_user: dict = Depends(verify_token)):
    user = _find_user(email=auth_user.get("email"), uid=auth_user.get("uid"))
    if not user:
        return {"bookmarkedIssues": [], "bookmarkedEvents": []}
    issue_ids = [ObjectId(x) for x in (user.get("bookmarkedIssues") or []) if ObjectId.is_valid(str(x))]
    event_ids = [ObjectId(x) for x in (user.get("bookmarkedEvents") or []) if ObjectId.is_valid(str(x))]
    issues = list(get_collection("issues").find({"_id": {"$in": issue_ids}, "isHidden": {"$ne": True}})) if issue_ids else []
    events = list(get_collection("cleanupevents").find({"_id": {"$in": event_ids}})) if event_ids else []
    return serialize_mongo({"bookmarkedIssues": issues, "bookmarkedEvents": events})


@router.get("/role/{email}")
def get_user_role(email: str):
    user = _find_user(email=email, projection={"role": 1, "isVolunteer": 1})
    return {
        "role": (user or {}).get("role", "guest"),
        "isAdmin": (user or {}).get("role") == "admin",
        "isMember": (user or {}).get("role") in ("member", "admin"),
        "isVolunteer": bool((user or {}).get("isVolunteer", False)),
    }


def _leaderboard(limit: int) -> list[dict]:
    def build():
        cursor = get_collection("users").find({"role": {"$ne": "admin"}}, {"email": 0}).sort("points", -1).limit(limit)
        return serialize_mongo(list(cursor))

    return ttl_cached(f"leaderboard:{limit}", 15, build)


@router.get("/leaderboard")
def users_leaderboard(limit: int = Query(20, ge=1, le=50)):
    return _leaderboard(limit)


@leaderboard_router.get("")
@leaderboard_router.get("/")
def leaderboard(limit: int = Query(10, ge=1, le=50)):
    return _leaderboard(limit)
