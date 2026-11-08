"""Noticeboard / Announcements (`routes/announcements.js`)."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from ..auth import admin_only, verify_token
from ..database import get_collection
from ..services.notifications import log_audit
from ..utils import serialize_mongo, to_oid, utcnow

router = APIRouter(prefix="/announcements", tags=["Announcements"])


@router.get("")
@router.get("/")
def list_announcements(all: bool = Query(False)):
    col = get_collection("announcements")
    query: dict = {}
    if not all:
        now = utcnow()
        query = {"$or": [{"validUntil": None}, {"validUntil": {"$exists": False}}, {"validUntil": {"$gte": now}}]}

    notices = list(col.find(query).sort([("isPinned", -1), ("date", -1), ("createdAt", -1)]))
    users_col = get_collection("users")
    emails = [n.get("postedBy") for n in notices if n.get("postedBy")]
    user_map = {}
    if emails:
        for u in users_col.find({"email": {"$in": emails}}, {"email": 1, "name": 1, "role": 1}):
            user_map[u["email"]] = u

    for n in notices:
        poster = n.get("postedBy")
        u = user_map.get(poster) if poster else None
        n["posterName"] = (u.get("name") if u else None) or poster or "CivicNest Official"
        n["posterRole"] = (u.get("role") if u else None) or "admin"

    return serialize_mongo(notices)


@router.get("/{notice_id}")
def get_announcement(notice_id: str):
    col = get_collection("announcements")
    notice = col.find_one({"_id": to_oid(notice_id, "notice ID")})
    if not notice:
        raise HTTPException(404, "Announcement not found")
    poster = notice.get("postedBy")
    u = get_collection("users").find_one({"email": poster}) if poster else None
    notice["posterName"] = (u.get("name") if u else None) or poster or "CivicNest Official"
    notice["posterRole"] = (u.get("role") if u else None) or "admin"
    return serialize_mongo(notice)


@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_announcement(payload: dict = Body(...), auth_user: dict = Depends(admin_only)):
    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    if not title or not description:
        raise HTTPException(400, "Title and description are required.")

    valid_until = None
    if payload.get("validUntil"):
        try:
            valid_until = datetime.fromisoformat(str(payload["validUntil"]).replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            valid_until = None

    notice = {
        "title": title,
        "description": description,
        "type": payload.get("type") or "General",
        "priority": payload.get("priority") or "medium",
        "validUntil": valid_until,
        "attachmentUrl": payload.get("attachmentUrl") or None,
        "targetGroup": payload.get("targetGroup") or "All",
        "affectedArea": payload.get("affectedArea") or "All Areas",
        "organizerName": (payload.get("organizerName") or "").strip() or None,
        "organizerContact": (payload.get("organizerContact") or "").strip() or None,
        "actionRequired": (payload.get("actionRequired") or "").strip() or None,
        "coverImage": (payload.get("coverImage") or "").strip() or None,
        "attachments": payload.get("attachments") if isinstance(payload.get("attachments"), list) else [],
        "postedBy": auth_user["email"],
        "isPinned": payload.get("isPinned") in (True, "true"),
        "date": utcnow(),
    }
    inserted = get_collection("announcements").insert_one(notice).inserted_id
    notice["_id"] = inserted
    return serialize_mongo({"success": True, "_id": inserted, "notice": notice})


@router.patch("/{notice_id}")
def update_announcement(notice_id: str, payload: dict = Body(...), auth_user: dict = Depends(admin_only)):
    oid = to_oid(notice_id, "notice ID")
    allowed = [
        "title", "description", "type", "priority", "validUntil", "attachmentUrl",
        "targetGroup", "affectedArea", "isPinned", "organizerName", "organizerContact",
        "actionRequired", "coverImage", "attachments",
    ]
    updates: dict = {}
    for k in allowed:
        if k in payload:
            updates[k] = payload[k]
    if "validUntil" in updates and updates["validUntil"]:
        try:
            updates["validUntil"] = datetime.fromisoformat(str(updates["validUntil"]).replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            updates["validUntil"] = None
    res = get_collection("announcements").update_one({"_id": oid}, {"$set": updates})
    if not res.matched_count:
        raise HTTPException(404, "Notice not found")
    return {"success": True}


@router.patch("/{notice_id}/pin")
def toggle_pin_announcement(notice_id: str, _auth_user: dict = Depends(admin_only)):
    oid = to_oid(notice_id, "notice ID")
    col = get_collection("announcements")
    notice = col.find_one({"_id": oid})
    if not notice:
        raise HTTPException(404, "Notice not found")
    new_pin = not bool(notice.get("isPinned"))
    col.update_one({"_id": oid}, {"$set": {"isPinned": new_pin}})
    return {"success": True, "isPinned": new_pin}


@router.delete("/{notice_id}")
def delete_announcement(notice_id: str, auth_user: dict = Depends(admin_only)):
    oid = to_oid(notice_id, "notice ID")
    res = get_collection("announcements").delete_one({"_id": oid})
    if not res.deleted_count:
        raise HTTPException(404, "Notice not found")
    log_audit("ANNOUNCEMENT_DELETED", "announcement", notice_id, auth_user["email"])
    return {"success": True}

