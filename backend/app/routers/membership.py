"""Membership, Contributions, Gallery & Notifications (`membership.js`, `contributions.js`, `gallery.js`, `notifications.js`)."""
from datetime import timedelta
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from ..auth import admin_only, verify_token
from ..database import get_collection
from ..services.feed import create_feed_event
from ..utils import serialize_mongo, to_oid, utcnow

membership_router = APIRouter(prefix="/membership", tags=["Membership"])
contributions_router = APIRouter(prefix="/contributions", tags=["Contributions"])
gallery_router = APIRouter(prefix="/gallery", tags=["Gallery"])
notifications_router = APIRouter(prefix="/notifications", tags=["Notifications"])


@membership_router.post("/request")
def request_membership(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    col = get_collection("membershipRequests")
    email = auth_user["email"]
    if col.find_one({"email": email, "status": "pending"}):
        raise HTTPException(400, "You already have a pending membership request.")

    doc = {
        **payload,
        "email": email,
        "status": "pending",
        "submittedAt": utcnow(),
    }
    res = col.insert_one(doc)
    contact = {
        k: payload[k]
        for k in ("name", "phone", "area", "streetAddress", "apartmentNumber")
        if payload.get(k) is not None
    }
    if contact:
        get_collection("users").update_one({"email": email}, {"$set": contact})
    return serialize_mongo({"insertedId": res.inserted_id, "acknowledged": True})


@membership_router.get("/status")
@membership_router.get("/my-request")
def membership_status(auth_user: dict = Depends(verify_token)):
    doc = get_collection("membershipRequests").find_one({"email": auth_user["email"]}, sort=[("submittedAt", -1)])
    return serialize_mongo(doc)


@contributions_router.post("")
@contributions_router.post("/")
def add_contribution(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    doc = {**payload, "email": payload.get("email") or auth_user["email"], "date": utcnow()}
    res = get_collection("contributions").insert_one(doc)
    donor = auth_user["name"] or auth_user["email"].split("@")[0]
    create_feed_event("donation_made", {
        "amount": doc.get("amount"),
        "title": doc.get("eventName") or doc.get("issueTitle") or "Community Drive",
        "donor": donor,
    })
    return serialize_mongo({"insertedId": res.inserted_id, "acknowledged": True})


def _attach_escrow(items: list[dict]) -> list[dict]:
    issues_col = get_collection("issues")
    for c in items:
        issue_id = c.get("issueId")
        if issue_id and ObjectId.is_valid(str(issue_id)):
            issue = issues_col.find_one({"_id": ObjectId(str(issue_id))}, {"crowdfunding": 1})
            if issue and issue.get("crowdfunding"):
                c["escrowStatus"] = issue["crowdfunding"].get("escrowStatus")
    return items


@contributions_router.get("/my")
def my_contributions(email: Optional[str] = None, auth_user: dict = Depends(verify_token)):
    target = email or auth_user["email"]
    if target.lower() != auth_user["email"].lower() and auth_user["role"] != "admin":
        raise HTTPException(403, "Forbidden access")
    items = list(get_collection("contributions").find({"email": target}).sort("date", -1))
    return serialize_mongo(_attach_escrow(items))


@contributions_router.get("/{email}")
def contributions_by_email(email: str, auth_user: dict = Depends(verify_token)):
    if email.lower() != auth_user["email"].lower() and auth_user["role"] != "admin":
        raise HTTPException(403, "Forbidden access")
    items = list(get_collection("contributions").find({"email": email}).sort("date", -1))
    return serialize_mongo(_attach_escrow(items))


@gallery_router.get("")
@gallery_router.get("/")
def get_gallery(area: Optional[str] = None, limit: int = Query(20, ge=1, le=100)):
    query: dict = {
        "approvalStatus": "approved",
        "status": "solved",
        "images.0": {"$exists": True},
        "resolutionProofs.0.images.0": {"$exists": True},
    }
    if area:
        query["area"] = area

    issues = list(get_collection("issues").find(query).sort("resolvedAt", -1).limit(limit))
    issue_items = [
        {
            "_id": str(i["_id"]),
            "title": i.get("title"),
            "category": i.get("category"),
            "location": i.get("location"),
            "area": i.get("area"),
            "beforeImage": (i.get("images") or [None])[0],
            "afterImage": (((i.get("resolutionProofs") or [{}])[0]).get("images") or [None])[0],
            "resolvedAt": i.get("resolvedAt") or i.get("updatedAt") or i.get("submittedAt"),
            "upvotesCount": len(i.get("upvotes") or []),
            "isCustom": False,
        }
        for i in issues
    ]

    custom_query: dict = {}
    if area:
        custom_query["area"] = area
    custom_stories = list(get_collection("gallery_stories").find(custom_query).sort("resolvedAt", -1).limit(limit))
    custom_items = [
        {
            "_id": str(s["_id"]),
            "title": s.get("title"),
            "category": s.get("category"),
            "location": s.get("location"),
            "area": s.get("area"),
            "beforeImage": s.get("beforeImage"),
            "afterImage": s.get("afterImage"),
            "resolvedAt": s.get("resolvedAt"),
            "upvotesCount": len(s.get("upvotes") or []),
            "isCustom": True,
        }
        for s in custom_stories
    ]

    merged = [*issue_items, *custom_items]
    merged.sort(key=lambda x: str(x.get("resolvedAt") or ""), reverse=True)
    return serialize_mongo({"issues": merged[:limit]})


@gallery_router.post("", status_code=201)
@gallery_router.post("/", status_code=201)
def add_gallery_story(payload: dict = Body(...), auth_user: dict = Depends(admin_only)):
    required = ("title", "category", "area", "location", "beforeImage", "afterImage")
    if any(not (payload.get(k) or "").strip() for k in required):
        raise HTTPException(400, "All fields are required")
    story = {
        "title": payload["title"].strip(),
        "category": payload["category"].strip(),
        "area": payload["area"].strip(),
        "location": payload["location"].strip(),
        "beforeImage": payload["beforeImage"].strip(),
        "afterImage": payload["afterImage"].strip(),
        "resolvedAt": utcnow(),
        "upvotes": [],
        "uploadedBy": auth_user["email"],
    }
    res = get_collection("gallery_stories").insert_one(story)
    story["_id"] = res.inserted_id
    return serialize_mongo({"success": True, "_id": res.inserted_id, "story": story})


@gallery_router.delete("/{story_id}")
def delete_gallery_story(story_id: str, _auth_user: dict = Depends(admin_only)):
    oid = to_oid(story_id, "story ID")
    res = get_collection("gallery_stories").delete_one({"_id": oid})
    if not res.deleted_count:
        raise HTTPException(404, "Custom story not found")
    return {"success": True, "message": "Custom success story deleted successfully"}


@notifications_router.get("")
@notifications_router.get("/")
def list_notifications(auth_user: dict = Depends(verify_token)):
    seven_days_ago = utcnow() - timedelta(days=7)
    cursor = (
        get_collection("notifications")
        .find({
            "$or": [
                {"userId": auth_user["email"]},
                {"email": auth_user["email"]},
                {"userId": auth_user["uid"]},
            ],
            "type": {"$ne": "announcement"},
            "createdAt": {"$gte": seven_days_ago},
        })
        .sort("createdAt", -1)
        .limit(20)
    )
    items = []
    for n in cursor:
        n["isRead"] = bool(n.get("isRead") or n.get("read") or False)
        items.append(n)
    return serialize_mongo(items)


@notifications_router.patch("/read-all")
def mark_all_notifications_read(auth_user: dict = Depends(verify_token)):
    res = get_collection("notifications").update_many(
        {
            "$or": [
                {"userId": auth_user["email"]},
                {"email": auth_user["email"]},
                {"userId": auth_user["uid"]},
            ]
        },
        {"$set": {"isRead": True, "read": True}},
    )
    return {"modifiedCount": res.modified_count, "acknowledged": True}


@notifications_router.patch("/{notif_id}/read")
def mark_notification_read(notif_id: str, auth_user: dict = Depends(verify_token)):
    oid = to_oid(notif_id, "notification ID")
    res = get_collection("notifications").update_one(
        {
            "_id": oid,
            "$or": [
                {"userId": auth_user["email"]},
                {"email": auth_user["email"]},
                {"userId": auth_user["uid"]},
            ],
        },
        {"$set": {"isRead": True, "read": True}},
    )
    return {"modifiedCount": res.modified_count, "acknowledged": True}

