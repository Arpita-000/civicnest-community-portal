"""Lost & Found (`routes/lostFound.js`)."""
from datetime import timedelta
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from ..auth import verify_token
from ..database import get_collection
from ..services.credits import credit_status
from ..services.feed import create_feed_event
from ..services.notifications import create_notification
from ..services.points import add_points
from ..utils import serialize_mongo, to_oid, utcnow

router = APIRouter(prefix="/lost-found", tags=["Lost & Found"])


@router.get("/stats")
def lost_found_stats():
    col = get_collection("lostFound")
    week_ago = utcnow() - timedelta(days=7)
    return {
        "active": col.count_documents({"status": "open"}),
        "reunited": col.count_documents({"status": "reunited"}),
        "thisWeek": col.count_documents({"date": {"$gte": week_ago}}),
    }


@router.get("")
@router.get("/")
def list_lost_found(search: Optional[str] = None, type: Optional[str] = None, status: Optional[str] = None):
    col = get_collection("lostFound")
    query: dict = {}
    if type in ("lost", "found"):
        query["type"] = type
    if status:
        query["status"] = status
    if search:
        query["$or"] = [
            {"itemName": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    items = list(col.find(query).sort("date", -1))
    return serialize_mongo(items)


@router.get("/my")
def my_lost_found(auth_user: dict = Depends(verify_token)):
    email = auth_user["email"]
    query = {
        "$or": [
            {"reporter": email},
            {"reporter.email": email},
            {"contactInfo": email},
            {"postedBy": email},
        ]
    }
    items = list(get_collection("lostFound").find(query).sort("date", -1))
    return serialize_mongo(items)


@router.get("/{item_id}")
def get_lost_found_item(item_id: str):
    oid = to_oid(item_id, "item ID")
    item = get_collection("lostFound").find_one({"_id": oid})
    if not item:
        raise HTTPException(404, "Listing not found.")

    raw_rep = item.get("reporter") or item.get("postedBy") or item.get("contactInfo")
    rep_email = raw_rep.get("email") if isinstance(raw_rep, dict) else raw_rep
    if rep_email and isinstance(rep_email, str) and "@" in rep_email:
        u = get_collection("users").find_one({"email": rep_email}) or {}
        m = get_collection("membershipRequests").find_one({"email": rep_email}) or {}
        v = get_collection("volunteers").find_one({"email": rep_email}) or {}
        item["reporterDetails"] = {
            "name": u.get("name") or m.get("name") or v.get("name") or rep_email.split("@")[0],
            "phone": u.get("phone") or m.get("phone") or v.get("phone") or "",
            "address": u.get("area") or m.get("streetAddress") or v.get("area") or m.get("area") or "",
        }
    return serialize_mongo(item)


@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_lost_found(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    user_for_credit = {**(auth_user["dbUser"] or {}), "role": auth_user["role"], "isVolunteer": auth_user["isVolunteer"], "points": auth_user["points"]}
    credit = credit_status(auth_user["email"], "lostFound", user_for_credit)
    if not credit.get("isAdmin") and credit.get("remaining") == 0:
        raise HTTPException(429, {"message": "You have used all Lost & Found credits for this 72h window.", "code": "CREDIT_LIMIT_REACHED"})

    now = utcnow()
    doc = {
        **payload,
        "status": payload.get("status") or "open",
        "reporter": auth_user["email"],
        "postedBy": auth_user["email"],
        "date": now,
        "expiresAt": now + timedelta(days=30),
        "foundReports": [],
        "claims": [],
    }
    res = get_collection("lostFound").insert_one(doc)
    return serialize_mongo({"insertedId": res.inserted_id, "acknowledged": True})


@router.post("/{item_id}/found-report")
def report_found_sighting(item_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    statement = (payload.get("statement") or "").strip()
    if not statement:
        raise HTTPException(400, "Location/found details are required.")
    oid = to_oid(item_id, "item ID")
    col = get_collection("lostFound")
    item = col.find_one({"_id": oid})
    if not item or item.get("status") != "open":
        raise HTTPException(400, "Item listing is not open.")
    if item.get("type") != "lost":
        raise HTTPException(400, "Found reports can only be submitted for lost listings.")

    rep = item.get("reporter") or item.get("postedBy")
    rep_email = rep.get("email") if isinstance(rep, dict) else rep
    if rep_email == auth_user["email"]:
        raise HTTPException(400, "You cannot submit a found report on your own listing.")

    existing = next((r for r in (item.get("foundReports") or []) if r.get("email") == auth_user["email"]), None)
    if existing:
        raise HTTPException(400, "You have already submitted a report for this listing.")

    report = {
        "_id": ObjectId(),
        "email": auth_user["email"],
        "name": auth_user["name"] or auth_user["email"].split("@")[0],
        "statement": statement,
        "contactPhone": payload.get("contactPhone") or "",
        "photoUrl": payload.get("photoUrl") or "",
        "submittedAt": utcnow(),
        "isSuspicious": False,
        "status": "active",
        "rejectionReason": None,
        "dismissedAt": None,
    }
    col.update_one({"_id": oid}, {"$push": {"foundReports": report}})
    add_points(auth_user["email"], "lostfound_action_taken")
    return {"success": True}


@router.post("/{item_id}/claim")
def claim_found_item(item_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    statement = (payload.get("statement") or "").strip()
    if not statement:
        raise HTTPException(400, "Ownership statement required.")
    oid = to_oid(item_id, "item ID")
    col = get_collection("lostFound")
    item = col.find_one({"_id": oid})
    if not item or item.get("status") != "open":
        raise HTTPException(400, "Item is not available for claiming.")
    if item.get("type") != "found":
        raise HTTPException(400, "Claims can only be submitted for found listings.")

    rep = item.get("reporter") or item.get("postedBy")
    rep_email = rep.get("email") if isinstance(rep, dict) else rep
    if rep_email == auth_user["email"]:
        raise HTTPException(400, "You cannot claim your own listing.")

    existing = next((c for c in (item.get("claims") or []) if c.get("email") == auth_user["email"]), None)
    if existing:
        raise HTTPException(400, "You have already submitted a claim for this listing.")

    claim = {
        "_id": ObjectId(),
        "email": auth_user["email"],
        "name": auth_user["name"] or auth_user["email"].split("@")[0],
        "statement": statement,
        "photoUrl": payload.get("photoUrl") or "",
        "submittedAt": utcnow(),
        "isSuspicious": False,
        "status": "active",
        "rejectionReason": None,
        "dismissedAt": None,
    }
    col.update_one({"_id": oid}, {"$push": {"claims": claim}})
    add_points(auth_user["email"], "lostfound_action_taken")
    return {"success": True}


@router.post("/{item_id}/flag-suspicious")
def flag_suspicious_claim(item_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    oid = to_oid(item_id, "item ID")
    col = get_collection("lostFound")
    item = col.find_one({"_id": oid})
    if not item:
        raise HTTPException(404, "Listing not found.")
    rep = item.get("reporter") or item.get("postedBy")
    rep_email = rep.get("email") if isinstance(rep, dict) else rep
    if rep_email != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Only the poster can flag claims.")

    if item.get("type") == "lost":
        finder = payload.get("finderEmail")
        if not finder:
            raise HTTPException(400, "finderEmail is required")
        col.update_one({"_id": oid, "foundReports.email": finder}, {"$set": {"foundReports.$.isSuspicious": True}})
        create_notification(finder, finder, f'⚠️ Your sighting report for "{item.get("itemName")}" was flagged for insufficient proof.', "warning", f"/lost-found/{item_id}")
    else:
        claimant = payload.get("claimantEmail")
        if not claimant:
            raise HTTPException(400, "claimantEmail is required")
        col.update_one({"_id": oid, "claims.email": claimant}, {"$set": {"claims.$.isSuspicious": True}})
        create_notification(claimant, claimant, f'⚠️ Your ownership claim for "{item.get("itemName")}" was flagged for insufficient proof.', "warning", f"/lost-found/{item_id}")
    return {"success": True}


@router.post("/{item_id}/reunite")
def mark_reunited(item_id: str, payload: Optional[dict] = None, auth_user: dict = Depends(verify_token)):
    oid = to_oid(item_id, "item ID")
    col = get_collection("lostFound")
    item = col.find_one({"_id": oid})
    if not item:
        raise HTTPException(404, "Listing not found.")
    rep = item.get("reporter") or item.get("postedBy")
    rep_email = rep.get("email") if isinstance(rep, dict) else rep
    if rep_email != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Only the original poster can mark this as reunited.")

    body = payload or {}
    if item.get("type") == "lost":
        action_taker = body.get("finderEmail") or ((item.get("foundReports") or [{}])[0].get("email") if item.get("foundReports") else None)
    else:
        action_taker = body.get("claimantEmail") or ((item.get("claims") or [{}])[0].get("email") if item.get("claims") else None)

    updates: dict = {"status": "reunited", "reunitedAt": utcnow()}
    if action_taker:
        updates["claimedBy"] = action_taker
    col.update_one({"_id": oid}, {"$set": updates})
    if rep_email:
        add_points(rep_email, "lostfound_reunited")
    if action_taker:
        add_points(action_taker, "lostfound_reunited")
        create_notification(action_taker, action_taker, f'🎉 "{item.get("itemName")}" has been marked as reunited! You earned 20 points!', "info", f"/lost-found/{item_id}")
    create_feed_event("lostfound_reunited", {"itemName": item.get("itemName"), "location": item.get("location"), "link": f"/lost-found/{item_id}"})
    return {"success": True}

