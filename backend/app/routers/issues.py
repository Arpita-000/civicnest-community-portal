"""Issue feed, details, create/edit/delete and voting (same contract as the Node `routes/issues.js`)."""
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo import ReturnDocument

from ..auth import get_optional_user, verify_token
from ..database import get_collection
from ..models import STALE_DAYS
from ..schemas import IssueCreate, IssueEdit
from ..services.credits import credit_status
from ..services.feed import create_feed_event
from ..services.points import add_points, update_streak
from ..utils import clean_name, drop_cache, serialize_mongo, to_oid, ttl_cached, utcnow

router = APIRouter(prefix="/issues", tags=["Issues"])

# Never sent to the browser.
_PRIVATE = {"adminNote": 0, "spamFlags": 0, "editHistory": 0, "identityRevealLog": 0}
_EVENT_PRIVATE = {"going": 0, "interested": 0}


def _anonymise(issue: dict) -> dict:
    if issue.get("isAnonymous"):
        issue["submittedBy"] = {
            "name": "Anonymous Member",
            "photoURL": "",
            "userId": "hidden",
            "email": "hidden",
            "memberId": "hidden",
        }
    return issue


def _stale(issue: dict) -> dict:
    opened = issue.get("submittedAt") or issue.get("incidentDate") or utcnow()
    days_open = max(0, (utcnow() - opened).days) if hasattr(opened, "year") else 0
    solved = issue.get("status") in ("solved", "resolved")
    issue["daysOpen"] = days_open
    issue["isStale"] = (not solved) and days_open > STALE_DAYS.get(issue.get("urgency"), 14)
    return issue


def _personalise(issue: dict, uid: Optional[str]) -> dict:
    issue.setdefault("netScore", len(issue.get("upvotes", [])) - len(issue.get("downvotes", [])))
    issue.setdefault("commentCount", 0)
    if uid:
        issue["userVote"] = "up" if uid in issue.get("upvotes", []) else "down" if uid in issue.get("downvotes", []) else None
    return issue


def _attach_user_profiles(docs: list[dict], key: str) -> None:
    """Replace the name/photo stored on a post with the author's current profile."""
    emails = {d[key]["email"] for d in docs if isinstance(d.get(key), dict) and d[key].get("email")}
    if not emails:
        return
    profiles = {
        u["email"]: u
        for u in get_collection("users").find({"email": {"$in": list(emails)}}, {"email": 1, "name": 1, "displayName": 1, "photoURL": 1})
    }
    for d in docs:
        person = d.get(key)
        prof = profiles.get(person.get("email")) if isinstance(person, dict) else None
        if prof:
            person["name"] = clean_name(prof.get("name") or prof.get("displayName"), prof["email"]) or person.get("name")
            person["photoURL"] = prof.get("photoURL") or person.get("photoURL")


@router.get("")
@router.get("/")
def list_issues(
    category: Optional[str] = None,
    status: Optional[str] = None,
    area: Optional[str] = None,
    search: Optional[str] = None,
    crowdfunding: Optional[str] = None,
    sort: Optional[str] = "newest",
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
    auth_user: Optional[dict] = Depends(get_optional_user),
):
    import re

    issues_col = get_collection("issues")
    events_col = get_collection("cleanupevents")

    query: dict = {"approvalStatus": "approved", "isHidden": {"$ne": True}}
    event_query: dict = {"approvalStatus": "approved"}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
        event_query["status"] = status
    if area:
        rx = {"$regex": re.escape(area), "$options": "i"}
        query["area"] = rx
        event_query["location.area"] = rx
    if crowdfunding == "true":
        query["crowdfunding.enabled"] = True
        event_query["fundingEnabled"] = True
    if search:
        rx = {"$regex": re.escape(search), "$options": "i"}
        query["$or"] = [{"title": rx}, {"description": rx}]
        event_query["$or"] = [{"title": rx}, {"description": rx}]

    # Events only join the feed when no sector filter is applied (same rule as the original).
    include_events = not category

    need = page * limit
    if sort == "most_upvoted":
        issue_sort = [("netScore", -1), ("submittedAt", -1)]
    elif sort == "most_funded":
        issue_sort = [("crowdfunding.raisedAmount", -1), ("submittedAt", -1)]
    else:
        issue_sort = [("submittedAt", -1)]

    issues = list(issues_col.find(query, _PRIVATE).sort(issue_sort).limit(need))
    total = issues_col.count_documents(query)
    events: list[dict] = []
    if include_events:
        events = list(events_col.find(event_query, _EVENT_PRIVATE).sort([("createdAt", -1)]).limit(need))
        total += events_col.count_documents(event_query)

    _attach_user_profiles(issues, "submittedBy")
    _attach_user_profiles(events, "organizer")

    uid = auth_user["uid"] if auth_user else None
    merged = [_personalise(_stale(_anonymise(i)), uid) | {"_type": "issue"} for i in issues]
    for e in events:
        e["_type"] = "cleanup_event"
        e["submittedAt"] = e.get("createdAt") or e.get("eventDate")
        merged.append(e)

    def when(x):
        v = x.get("submittedAt")
        return v if hasattr(v, "year") else utcnow() - timedelta(days=3650)

    if sort == "most_upvoted":
        merged.sort(key=lambda x: (x.get("netScore", 0), when(x)), reverse=True)
    elif sort == "most_funded":
        merged.sort(
            key=lambda x: (
                (x.get("fundingRaised") or x.get("currentFunding") or 0)
                if x["_type"] == "cleanup_event"
                else (x.get("crowdfunding") or {}).get("raisedAmount", 0),
                when(x),
            ),
            reverse=True,
        )
    else:
        merged.sort(key=when, reverse=True)

    start = (page - 1) * limit
    return serialize_mongo(
        {
            "issues": merged[start : start + limit],
            "total": total,
            "totalPages": max(1, -(-total // limit)),
            "currentPage": page,
        }
    )


@router.get("/stats")
def issue_stats():
    """Real per-sector counts and the list of areas that have reports (feeds the feed's filters)."""

    def build():
        col = get_collection("issues")
        match = {"approvalStatus": "approved", "isHidden": {"$ne": True}}
        by_category = {r["_id"]: r["n"] for r in col.aggregate([{"$match": match}, {"$group": {"_id": "$category", "n": {"$sum": 1}}}])}
        return {
            "total": sum(by_category.values()),
            "byCategory": by_category,
            "areas": sorted(a for a in col.distinct("area", match) if a),
        }

    return ttl_cached("issues:stats", 30, build)


@router.get("/my")
def my_issues(auth_user: dict = Depends(verify_token)):
    cursor = get_collection("issues").find(
        {
            "isHidden": {"$ne": True},
            "$or": [{"submittedBy.userId": auth_user["uid"]}, {"submittedBy.email": auth_user["email"]}],
        },
        _PRIVATE,
    ).sort("submittedAt", -1)
    return serialize_mongo([_personalise(_stale(i), auth_user["uid"]) for i in cursor])


@router.get("/{issue_id}")
def get_issue(issue_id: str, auth_user: Optional[dict] = Depends(get_optional_user)):
    issue = get_collection("issues").find_one({"_id": to_oid(issue_id, "issue ID")}, _PRIVATE)
    if not issue:
        raise HTTPException(404, "Not found")

    is_owner = bool(auth_user) and (
        issue.get("submittedBy", {}).get("userId") == auth_user["uid"]
        or issue.get("submittedBy", {}).get("email") == auth_user["email"]
    )
    is_admin = bool(auth_user) and auth_user["role"] == "admin"
    # Unapproved / hidden reports are only visible to their author and admins.
    if (issue.get("approvalStatus") != "approved" or issue.get("isHidden")) and not (is_owner or is_admin):
        raise HTTPException(404, "Not found")

    _attach_user_profiles([issue], "submittedBy")
    issue = _personalise(_stale(_anonymise(issue) if not is_owner else issue), auth_user["uid"] if auth_user else None)
    return serialize_mongo(issue)


@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_issue(payload: IssueCreate, auth_user: dict = Depends(verify_token)):
    credit = credit_status(auth_user["email"], "issues", auth_user["dbUser"] and {**auth_user["dbUser"], "role": auth_user["role"]})
    if credit.get("limit") == 0:
        raise HTTPException(
            403,
            {"message": "Guests cannot post this content. Apply for membership to unlock this feature.", "code": "NO_CREDIT_FOR_ROLE"},
        )
    if credit.get("remaining") == 0:
        h, m = credit["hoursLeft"] or 0, credit["minutesLeft"] or 0
        wait = f"{h} hour{'s' if h != 1 else ''} {m} minute{'s' if m != 1 else ''}" if h else f"{m} minute{'s' if m != 1 else ''}"
        raise HTTPException(
            429,
            {
                "message": f"You've used all {credit['limit']} credits for this content type. Your next credit returns in {wait}.",
                "code": "CREDIT_LIMIT_REACHED",
                **{k: credit[k] for k in ("limit", "used", "hoursLeft", "minutesLeft")},
            },
        )

    now = utcnow()
    is_admin = auth_user["role"] == "admin"
    cf = payload.crowdfunding
    doc = {
        "title": payload.title.strip(),
        "description": payload.description.strip(),
        "category": payload.category,
        "customFlair": payload.customFlair,
        "location": payload.location.strip(),
        "area": payload.area.strip(),
        "coordinates": payload.coordinates.model_dump(),
        "images": payload.images,
        "incidentDate": payload.incidentDate.replace(tzinfo=None),
        "submittedAt": now,
        "updatedAt": now,
        "submittedBy": {
            "userId": auth_user["uid"],
            "name": auth_user["name"] or (auth_user["dbUser"] or {}).get("name") or auth_user["email"].split("@")[0],
            "email": auth_user["email"],
            "memberId": (auth_user["dbUser"] or {}).get("memberId") or "MEM-0000",
            "photoURL": auth_user["picture"] or (auth_user["dbUser"] or {}).get("photoURL") or "",
        },
        "isAnonymous": payload.isAnonymous,
        "isPremiumFeature": False,
        # Admins are trusted; everyone else waits for moderation exactly like the original app.
        "approvalStatus": "approved" if is_admin else "pending_review",
        "approvedAt": now if is_admin else None,
        "approvedBy": auth_user["email"] if is_admin else None,
        "rejectedAt": None,
        "rejectedBy": None,
        "rejectReason": None,
        "adminNote": None,
        "resolvedAt": None,
        "status": "open",
        "statusChangedAt": now,
        "upvotes": [],
        "downvotes": [],
        "netScore": 0,
        "commentCount": 0,
        "witnesses": [],
        "witnessDetails": [],
        "witnessCount": 0,
        "verifications": [],
        "verificationCount": 0,
        "assignedTo": {"email": None, "name": None, "type": None, "assignedAt": None, "deadline": None, "adminNote": None},
        "resolutionProofs": [],
        "crowdfunding": {
            "enabled": cf.enabled,
            "targetAmount": cf.targetAmount if cf.enabled else None,
            "purpose": cf.purpose if cf.enabled else None,
            "raisedAmount": 0,
            "escrowStatus": "holding",
            "releasedAt": None,
        },
        "urgency": payload.urgency,
        "spamFlags": [],
        "isHidden": False,
        "editHistory": [],
        "identityRevealLog": [],
    }
    inserted = get_collection("issues").insert_one(doc).inserted_id
    drop_cache("issues:")

    update_streak(auth_user["email"])
    if is_admin:
        add_points(auth_user["email"], "issue_reported")
        create_feed_event(
            "new_issue",
            {"issueId": str(inserted), "title": doc["title"], "area": doc["area"], "category": doc["category"], "reporterName": doc["submittedBy"]["name"]},
        )

    return {
        "success": True,
        "issueId": str(inserted),
        "approvalStatus": doc["approvalStatus"],
        "creditInfo": {"limit": credit["limit"], "used": credit["used"] + 1, "remaining": None if credit["remaining"] is None else credit["remaining"] - 1},
    }


def _owned_issue(issue_id: str, auth_user: dict) -> dict:
    issue = get_collection("issues").find_one({"_id": to_oid(issue_id, "issue ID")})
    if not issue:
        raise HTTPException(404, "Not found")
    if issue["submittedBy"]["userId"] != auth_user["uid"]:
        raise HTTPException(403, "Forbidden")
    return issue


@router.patch("/{issue_id}")
def edit_issue(issue_id: str, payload: IssueEdit, auth_user: dict = Depends(verify_token)):
    issue = _owned_issue(issue_id, auth_user)
    changes = payload.model_dump(exclude_none=True)
    if not changes:
        return {"success": True}
    previous = {k: issue.get(k) for k in changes}
    update: dict = {"$set": {**changes, "updatedAt": utcnow()}, "$push": {"editHistory": {"editedAt": utcnow(), "editedBy": auth_user["email"], "fieldsChanged": list(changes), "previousValues": previous}}}
    if issue.get("approvalStatus") == "rejected":
        update["$set"].update(approvalStatus="pending_review", status="open", rejectedAt=None, rejectedBy=None, rejectReason=None)
    get_collection("issues").update_one({"_id": issue["_id"]}, update)
    drop_cache("issues:")
    return {"success": True}


@router.delete("/{issue_id}")
def delete_issue(issue_id: str, auth_user: dict = Depends(verify_token)):
    issue = _owned_issue(issue_id, auth_user)
    get_collection("issues").update_one({"_id": issue["_id"]}, {"$set": {"isHidden": True}})
    drop_cache("issues:")
    return {"success": True}


def _vote(issue_id: str, auth_user: dict, kind: str) -> dict:
    """Toggle an up/down vote. A user holds at most one vote; voting the other way switches it."""
    oid = to_oid(issue_id, "issue ID")
    uid = auth_user["uid"]
    col = get_collection("issues")
    issue = col.find_one({"_id": oid}, {"upvotes": 1, "downvotes": 1, "approvalStatus": 1, "isHidden": 1})
    if not issue or issue.get("isHidden"):
        raise HTTPException(404, "Not found")
    if issue.get("approvalStatus") != "approved":
        raise HTTPException(400, "This report is still pending review.")

    mine, other = ("upvotes", "downvotes") if kind == "up" else ("downvotes", "upvotes")
    had = uid in issue.get(mine, [])
    update = {"$pull": {mine: uid}} if had else {"$addToSet": {mine: uid}, "$pull": {other: uid}}
    after = col.find_one_and_update(
        {"_id": oid}, update, return_document=ReturnDocument.AFTER, projection={"upvotes": 1, "downvotes": 1}
    )
    net = len(after["upvotes"]) - len(after["downvotes"])
    col.update_one({"_id": oid}, {"$set": {"netScore": net}})
    update_streak(auth_user["email"])
    return {"netScore": net, "userVote": None if had else kind, "upvotes": after["upvotes"], "downvotes": after["downvotes"]}


@router.patch("/{issue_id}/upvote")
@router.post("/{issue_id}/upvote")
def upvote(issue_id: str, auth_user: dict = Depends(verify_token)):
    return _vote(issue_id, auth_user, "up")


@router.patch("/{issue_id}/downvote")
@router.post("/{issue_id}/downvote")
def downvote(issue_id: str, auth_user: dict = Depends(verify_token)):
    return _vote(issue_id, auth_user, "down")


@router.patch("/{issue_id}/flag")
def flag_issue(issue_id: str, auth_user: dict = Depends(verify_token)):
    col = get_collection("issues")
    oid = to_oid(issue_id, "issue ID")
    issue = col.find_one_and_update({"_id": oid}, {"$addToSet": {"spamFlags": auth_user["uid"]}}, return_document=ReturnDocument.AFTER, projection={"spamFlags": 1})
    if not issue:
        raise HTTPException(404, "Not found")
    if len(issue["spamFlags"]) >= 3:
        col.update_one({"_id": oid}, {"$set": {"isHidden": True}})
    return {"success": True}


@router.post("/{issue_id}/witness")
def witness(issue_id: str, body: Optional[dict] = None, auth_user: dict = Depends(verify_token)):
    col = get_collection("issues")
    oid = to_oid(issue_id, "issue ID")
    issue = col.find_one({"_id": oid}, {"witnesses": 1})
    if not issue:
        raise HTTPException(404, "Not found")
    uid = auth_user["uid"]
    if uid in issue.get("witnesses", []):
        col.update_one({"_id": oid}, {"$pull": {"witnesses": uid, "witnessDetails": {"userId": uid}}})
    else:
        detail = {"userId": uid, "photoURL": (body or {}).get("photoURL") or auth_user["picture"], "name": (body or {}).get("name") or auth_user["name"] or "User"}
        col.update_one({"_id": oid}, {"$addToSet": {"witnesses": uid}, "$push": {"witnessDetails": detail}})
        add_points(auth_user["email"], "witness_added")
    after = col.find_one({"_id": oid}, {"witnesses": 1, "witnessDetails": 1})
    col.update_one({"_id": oid}, {"$set": {"witnessCount": len(after["witnesses"])}})
    return {"success": True, "witnesses": after["witnesses"], "witnessDetails": after.get("witnessDetails", [])}


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    import math
    r = 6371000.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    return r * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@router.post("/{issue_id}/claim")
@router.patch("/{issue_id}/claim")
def claim_issue(issue_id: str, auth_user: dict = Depends(verify_token)):
    oid = to_oid(issue_id, "issue ID")
    col = get_collection("issues")
    issue = col.find_one({"_id": oid})
    if not issue or issue.get("approvalStatus") != "approved" or issue.get("status") != "open":
        raise HTTPException(409, "This issue is no longer available for claiming.")
    assigned = issue.get("assignedTo") or {}
    if assigned.get("email"):
        raise HTTPException(409, "This issue is already claimed.")

    from datetime import timedelta
    from ..services.notifications import create_notification

    now = utcnow()
    name = auth_user["name"] or (auth_user["dbUser"] or {}).get("name") or auth_user["email"].split("@")[0]
    new_assigned = {
        "name": name,
        "email": auth_user["email"],
        "type": "volunteer",
        "assignedAt": now,
        "deadline": now + timedelta(days=7),
        "adminNote": None,
    }
    updated = col.find_one_and_update(
        {"_id": oid},
        {"$set": {"status": "action_taken", "assignedTo": new_assigned, "statusChangedAt": now}},
        return_document=ReturnDocument.AFTER,
    )
    add_points(auth_user["email"], "issue_claimed")
    sub = (updated or {}).get("submittedBy") or {}
    if sub.get("email"):
        create_notification(
            user_id=sub.get("userId"),
            email=sub.get("email"),
            message=f'A community member ({name}) has claimed your issue "{updated.get("title")}" and is working on a fix!',
            notif_type="assignment",
            link=f"/issues/{issue_id}",
        )
    drop_cache("issues:")
    return {"success": True, "issue": serialize_mongo(updated)}


@router.post("/{issue_id}/unclaim")
def unclaim_issue(issue_id: str, auth_user: dict = Depends(verify_token)):
    oid = to_oid(issue_id, "issue ID")
    col = get_collection("issues")
    issue = col.find_one({"_id": oid})
    if not issue:
        raise HTTPException(404, "Issue not found.")
    assigned = issue.get("assignedTo") or {}
    if assigned.get("email") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Only the current resolver or an admin can unclaim.")
    if issue.get("resolutionProofs"):
        raise HTTPException(400, "Cannot unclaim after uploading resolution proof.")
    col.update_one(
        {"_id": oid},
        {"$set": {"status": "open", "assignedTo": {"email": None, "name": None, "type": None, "assignedAt": None, "deadline": None, "adminNote": None}}},
    )
    drop_cache("issues:")
    return {"success": True}


@router.post("/{issue_id}/proofs")
def submit_proof(issue_id: str, body: dict, auth_user: dict = Depends(verify_token)):
    oid = to_oid(issue_id, "issue ID")
    col = get_collection("issues")
    issue = col.find_one({"_id": oid})
    if not issue:
        raise HTTPException(404, "Not found")
    assigned = issue.get("assignedTo") or {}
    if assigned.get("email") and assigned.get("email") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Only the assigned resolver can upload proof")

    coords = body.get("coordinates") or {}
    issue_coords = issue.get("coordinates") or {}
    gps_match = "skipped"
    if coords.get("lat") and coords.get("lng") and issue_coords.get("lat") and issue_coords.get("lng"):
        dist = _haversine_meters(float(coords["lat"]), float(coords["lng"]), float(issue_coords["lat"]), float(issue_coords["lng"]))
        if dist > 1000:
            raise HTTPException(403, f"GPS mismatch: you appear to be {round(dist)}m from the issue location. You must be within 1km to submit proof.")
        gps_match = "high" if dist <= 200 else ("medium" if dist <= 500 else "low")

    proof_images = body.get("photos") or body.get("images") or []
    proofs = issue.get("resolutionProofs") or []
    now = utcnow()
    proof_entry = {
        "uploadedBy": auth_user["email"],
        "images": proof_images,
        "notes": body.get("notes") or "",
        "gpsMatch": gps_match,
        "milestoneNo": len(proofs) + 1,
        "uploadedAt": now,
    }
    updated = col.find_one_and_update(
        {"_id": oid},
        {"$push": {"resolutionProofs": proof_entry}, "$set": {"status": "pending_verification", "statusChangedAt": now}},
        return_document=ReturnDocument.AFTER,
    )
    from ..services.notifications import create_notification
    sub = issue.get("submittedBy") or {}
    if sub.get("email"):
        create_notification(
            user_id=sub.get("userId"),
            email=sub.get("email"),
            message=f'Resolution proof uploaded for your issue "{issue.get("title")}". Needs 3 community verifications.',
            notif_type="verification",
            link=f"/issues/{issue_id}",
        )
    drop_cache("issues:")
    return {"success": True, "gpsMatch": gps_match, "issue": serialize_mongo(updated)}


@router.post("/{issue_id}/verify")
def verify_issue_fix(issue_id: str, body: Optional[dict] = None, auth_user: dict = Depends(verify_token)):
    oid = to_oid(issue_id, "issue ID")
    col = get_collection("issues")
    issue = col.find_one({"_id": oid})
    if not issue:
        raise HTTPException(404, "Not found")
    if issue.get("status") != "pending_verification":
        raise HTTPException(400, "Issue is not pending verification")
    sub = issue.get("submittedBy") or {}
    if sub.get("userId") == auth_user["uid"] or sub.get("email") == auth_user["email"]:
        raise HTTPException(400, "You cannot verify your own reported issue")
    assigned = issue.get("assignedTo") or {}
    if assigned.get("email") == auth_user["email"]:
        raise HTTPException(400, "You cannot verify your own proof")
    verifications = list(issue.get("verifications") or [])
    if auth_user["uid"] in verifications:
        raise HTTPException(400, "You have already verified this")

    verifications.append(auth_user["uid"])
    v_count = len(verifications)

    coords = (body or {}).get("coordinates") or {}
    issue_coords = issue.get("coordinates") or {}
    is_gps_near = False
    if coords.get("lat") and coords.get("lng") and issue_coords.get("lat") and issue_coords.get("lng"):
        if _haversine_meters(float(coords["lat"]), float(coords["lng"]), float(issue_coords["lat"]), float(issue_coords["lng"])) <= 200:
            is_gps_near = True

    pts = add_points(auth_user["email"], "issue_verified_onsite" if is_gps_near else "issue_verified")
    now = utcnow()
    solved = v_count >= 3
    set_fields: dict = {"verifications": verifications, "verificationCount": v_count}

    if solved:
        set_fields.update(status="solved", statusChangedAt=now, resolvedAt=now)
        if (issue.get("crowdfunding") or {}).get("enabled"):
            set_fields["crowdfunding.escrowStatus"] = "released"
            set_fields["crowdfunding.releasedAt"] = now
        if assigned.get("email"):
            add_points(assigned["email"], "issue_solved")
        if sub.get("email"):
            add_points(sub["email"], "issue_reporter_bonus")
        create_feed_event("issue_solved", {"issueId": str(oid), "title": issue.get("title"), "area": issue.get("area")})
        from ..services.notifications import create_notification
        if sub.get("email"):
            create_notification(sub.get("userId"), sub.get("email"), f'Your issue "{issue.get("title")}" has been officially solved by the community!', "achievement", f"/issues/{issue_id}")
        if assigned.get("email"):
            create_notification(assigned.get("email"), assigned.get("email"), f'Congratulations! Your resolution for "{issue.get("title")}" was verified and you earned 50 points!', "achievement", f"/issues/{issue_id}")

    col.update_one({"_id": oid}, {"$set": set_fields})
    update_streak(auth_user["email"])
    drop_cache("issues:")
    return {"success": True, "solved": solved, "pointsEarned": pts, "verificationCount": v_count, "status": "solved" if solved else "pending_verification"}


@router.post("/{issue_id}/donate")
def donate_to_issue(issue_id: str, body: dict, auth_user: dict = Depends(verify_token)):
    oid = to_oid(issue_id, "issue ID")
    amount = float(body.get("amount") or 0)
    if amount <= 0:
        raise HTTPException(400, "Invalid donation amount.")
    col = get_collection("issues")
    issue = col.find_one({"_id": oid})
    if not issue or not (issue.get("crowdfunding") or {}).get("enabled"):
        raise HTTPException(404, "Issue not found or crowdfunding not enabled.")
    now = utcnow()
    donor_name = body.get("name") or auth_user["name"] or auth_user["email"].split("@")[0]
    get_collection("contributions").insert_one(
        {
            "issueId": str(oid),
            "issueTitle": issue.get("title"),
            "type": "issue",
            "amount": amount,
            "name": donor_name,
            "email": auth_user["email"],
            "phone": body.get("phone") or "",
            "additionalInfo": body.get("additionalInfo") or "",
            "date": now,
        }
    )
    col.update_one({"_id": oid}, {"$inc": {"crowdfunding.raisedAmount": amount}})
    add_points(auth_user["email"], "contribution_made")
    update_streak(auth_user["email"])
    create_feed_event("donation_made", {"amount": amount, "title": issue.get("title"), "donor": donor_name})
    drop_cache("issues:")
    return {"success": True, "message": "Contribution recorded. Thank you!"}
