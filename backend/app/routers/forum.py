"""Forum / Community Threads (`routes/forum.js`)."""
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from ..auth import verify_token
from ..database import get_collection
from ..services.credits import credit_status
from ..services.feed import create_feed_event
from ..services.notifications import create_notification
from ..utils import serialize_mongo, to_oid, utcnow

router = APIRouter(prefix="/forum", tags=["Forum"])


@router.get("")
@router.get("/")
@router.get("/threads")
def list_threads(
    category: Optional[str] = None,
    sort: str = Query("recent"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    col = get_collection("forum")
    query: dict = {"approvalStatus": "approved"}
    if category and category != "All":
        query["category"] = category

    sort_spec = [("upvoteCount", -1), ("date", -1)] if sort == "top" else [("isPinned", -1), ("date", -1)]
    threads = list(
        col.find(query, {"replies": 0})
        .sort(sort_spec)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    for t in threads:
        t["upvoteCount"] = len(t.get("upvotes") or [])
    return serialize_mongo({"threads": threads, "total": col.count_documents(query)})


@router.get("/users/search")
def search_users_for_mentions(q: str = Query(""), _auth_user: dict = Depends(verify_token)):
    query: dict = {}
    if q:
        query = {"$or": [{"name": {"$regex": q, "$options": "i"}}, {"email": {"$regex": q, "$options": "i"}}]}
    users = list(get_collection("users").find(query, {"name": 1, "email": 1, "photoURL": 1}).limit(25))
    return [
        {"email": u.get("email"), "name": u.get("name") or u.get("email"), "photo": u.get("photoURL")}
        for u in users
    ]


@router.get("/{thread_id}")
def get_thread(thread_id: str, limit: int = Query(50, ge=1, le=200), before: Optional[str] = None):
    oid = to_oid(thread_id, "thread ID")
    thread = get_collection("forum").find_one({"_id": oid})
    if not thread:
        raise HTTPException(404, "Thread not found.")

    replies = list(thread.get("replies") or [])
    if before:
        idx = next((i for i, r in enumerate(replies) if str(r.get("_id")) == before), -1)
        if idx != -1:
            start = max(0, idx - limit)
            thread["replies"] = replies[start:idx]
            thread["hasMore"] = start > 0
        else:
            thread["replies"] = []
            thread["hasMore"] = False
    else:
        start = max(0, len(replies) - limit)
        thread["replies"] = replies[start:]
        thread["hasMore"] = start > 0

    return serialize_mongo(thread)


@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_thread(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    title = (payload.get("title") or "").strip()
    body = (payload.get("body") or "").strip()
    if not title or not body:
        raise HTTPException(400, "Title and body are required.")

    user_for_credit = {**(auth_user["dbUser"] or {}), "role": auth_user["role"], "isVolunteer": auth_user["isVolunteer"], "points": auth_user["points"]}
    credit = credit_status(auth_user["email"], "forum", user_for_credit)
    if not credit.get("isAdmin") and credit.get("limit") == 0:
        raise HTTPException(403, {"message": "Only verified members can start forum threads.", "code": "NO_CREDIT_FOR_ROLE"})
    if not credit.get("isAdmin") and credit.get("remaining") == 0:
        raise HTTPException(429, {"message": "You have reached your forum thread limit for this 72h window.", "code": "CREDIT_LIMIT_REACHED"})

    db_user = auth_user.get("dbUser") or {}
    poster_name = db_user.get("name") or auth_user["name"] or auth_user["email"].split("@")[0]
    poster_photo = db_user.get("photoURL") or auth_user["picture"] or None
    now = utcnow()
    doc = {
        "title": title,
        "body": body,
        "category": payload.get("category") or "General",
        "postedBy": auth_user["email"],
        "author": auth_user["email"],
        "posterName": poster_name,
        "posterPhoto": poster_photo,
        "upvotes": [],
        "upvoteCount": 0,
        "replies": [],
        "replyCount": 0,
        "isPinned": False,
        "isLocked": False,
        "approvalStatus": "approved",
        "date": now,
        "createdAt": now,
    }
    res = get_collection("forum").insert_one(doc)
    create_feed_event("social_activity", {
        "title": title,
        "category": doc["category"],
        "authorName": poster_name,
        "threadId": str(res.inserted_id),
    })
    return serialize_mongo({"success": True, "_id": res.inserted_id, "creditsRemaining": credit.get("remaining")})


@router.post("/{thread_id}/reply")
def reply_to_thread(thread_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    body = (payload.get("body") or "").strip()
    if not body:
        raise HTTPException(400, "Reply body is required.")
    oid = to_oid(thread_id, "thread ID")
    col = get_collection("forum")
    thread = col.find_one({"_id": oid})
    if not thread:
        raise HTTPException(404, "Thread not found.")
    if thread.get("isLocked"):
        raise HTTPException(403, "This thread is locked.")

    db_user = auth_user.get("dbUser") or {}
    poster_name = db_user.get("name") or auth_user["name"] or auth_user["email"].split("@")[0]
    poster_photo = db_user.get("photoURL") or auth_user["picture"] or None
    reply = {
        "_id": ObjectId(),
        "body": body,
        "postedBy": auth_user["email"],
        "posterName": poster_name,
        "posterPhoto": poster_photo,
        "upvotes": [],
        "date": utcnow(),
    }
    if payload.get("replyTo"):
        reply["replyTo"] = payload["replyTo"]

    col.update_one(
        {"_id": oid},
        {
            "$push": {"replies": reply},
            "$inc": {"replyCount": 1},
            "$set": {"lastReply": {"senderName": poster_name, "preview": body[:60]}},
        },
    )
    if thread.get("postedBy") and thread.get("postedBy") != auth_user["email"]:
        create_notification(thread["postedBy"], thread["postedBy"], f'{poster_name} replied to your thread: "{thread.get("title")}"', "forum", f"/forum/{thread_id}")
    return serialize_mongo({"success": True, "reply": reply})


@router.post("/{thread_id}/upvote")
def toggle_thread_upvote(thread_id: str, auth_user: dict = Depends(verify_token)):
    oid = to_oid(thread_id, "thread ID")
    col = get_collection("forum")
    thread = col.find_one({"_id": oid})
    if not thread:
        raise HTTPException(404, "Not found.")
    email = auth_user["email"]
    upvotes = list(thread.get("upvotes") or [])
    already = email in upvotes
    if already:
        upvotes = [u for u in upvotes if u != email]
    else:
        upvotes.append(email)
    col.update_one({"_id": oid}, {"$set": {"upvotes": upvotes, "upvoteCount": len(upvotes)}})
    return {"upvoted": not already, "upvoteCount": len(upvotes)}


@router.delete("/{thread_id}")
def delete_thread(thread_id: str, auth_user: dict = Depends(verify_token)):
    oid = to_oid(thread_id, "thread ID")
    col = get_collection("forum")
    thread = col.find_one({"_id": oid})
    if not thread:
        raise HTTPException(404, "Not found.")
    if thread.get("postedBy") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Cannot delete someone else's thread.")
    col.delete_one({"_id": oid})
    return {"success": True}


@router.delete("/{thread_id}/reply/{reply_id}")
def delete_reply(thread_id: str, reply_id: str, auth_user: dict = Depends(verify_token)):
    oid = to_oid(thread_id, "thread ID")
    col = get_collection("forum")
    thread = col.find_one({"_id": oid})
    if not thread:
        raise HTTPException(404, "Thread not found.")
    reply = next((r for r in (thread.get("replies") or []) if str(r.get("_id")) == reply_id), None)
    if not reply:
        raise HTTPException(404, "Reply not found.")
    if reply.get("postedBy") != auth_user["email"] and thread.get("postedBy") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Unauthorized to delete this reply.")
    new_replies = [r for r in (thread.get("replies") or []) if str(r.get("_id")) != reply_id]
    col.update_one({"_id": oid}, {"$set": {"replies": new_replies, "replyCount": len(new_replies)}})
    return {"success": True}

