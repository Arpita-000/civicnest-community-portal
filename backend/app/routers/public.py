"""Public (no login) endpoints used by the home page, status page and global search."""
import re
from datetime import timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import get_optional_user
from ..database import client, get_collection
from ..schemas import PublicIncidentIn
from ..services.feed import create_feed_event
from ..utils import serialize_mongo, ttl_cached, utcnow

router = APIRouter(prefix="/public", tags=["Public"])


@router.get("/stats")
def public_stats():
    def build():
        issues = get_collection("issues")
        events = get_collection("cleanupevents")
        now = utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)

        def between(lo, hi):
            # eventDate is a Date for app-created events and an ISO string for older seed data
            return {"approvalStatus": "approved", "$or": [{"eventDate": {"$gte": lo, "$lt": hi}}, {"eventDate": {"$gte": lo.isoformat(), "$lt": hi.isoformat()}}]}

        visible = {"isHidden": False, "approvalStatus": "approved"}
        return {
            "success": True,
            "data": {
                "activeMembers": get_collection("users").estimated_document_count(),
                "issuesResolved": issues.count_documents({**visible, "status": "solved"}),
                "totalIssuesReported": issues.count_documents(visible),
                "openIssues": issues.count_documents({**visible, "status": {"$ne": "solved"}}),
                "eventsThisMonth": events.count_documents(between(month_start, next_month)),
                "upcomingEvents": events.count_documents(between(now, now + timedelta(days=3650))),
            },
        }

    return ttl_cached("public:stats", 30, build)


@router.get("/status")
def public_status():
    try:
        db_ok = client.admin.command("ping").get("ok") == 1
    except Exception:
        db_ok = False
    state = "operational" if db_ok else "outage"
    return serialize_mongo(
        {
            "success": db_ok,
            "timestamp": utcnow(),
            "uptime": 99.98 if db_ok else 98.45,
            "systems": [
                {"name": "Core API", "status": "operational" if db_ok else "degraded"},
                {"name": "Database", "status": state},
                {"name": "Authentication Services", "status": "operational"},
                {"name": "Image Processing (Reports)", "status": "operational"},
                {"name": "Real-time Notifications", "status": "operational"},
                {"name": "Mapping Engine", "status": "operational"},
            ],
        }
    )


@router.get("/users/{uid}")
def public_user(uid: str):
    users = get_collection("users")
    user = users.find_one({"uid": uid})
    if not user:
        try:
            oid = to_oid(uid, "")
            user = users.find_one({"_id": oid})
        except Exception:
            pass
    if not user:
        # older accounts have no uid: resolve through a report they filed, then backfill it
        issue = get_collection("issues").find_one({"submittedBy.userId": uid}, {"submittedBy.email": 1})
        email = (issue or {}).get("submittedBy", {}).get("email")
        user = users.find_one({"email": email}) if email else None
        if user:
            users.update_one({"_id": user["_id"]}, {"$set": {"uid": uid}})
    if not user:
        raise HTTPException(404, "User not found")
    return serialize_mongo(
        {
            "success": True,
            "data": {
                "name": user.get("name"),
                "photoURL": user.get("photoURL"),
                "coverPhoto": user.get("coverPhoto") or "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=2000&auto=format&fit=crop",
                "bio": user.get("bio") or "Dedicated civic member.",
                "role": user.get("role"),
                "isVolunteer": user.get("isVolunteer", False),
                "area": user.get("area"),
                "points": user.get("points", 0),
                "memberId": user.get("memberId"),
                "joinedAt": user.get("createdAt"),
            },
        }
    )


@router.get("/users/{uid}/issues")
def public_user_issues(uid: str):
    users = get_collection("users")
    user = users.find_one({"uid": uid})
    if not user:
        try:
            user = users.find_one({"_id": to_oid(uid, "")})
        except Exception:
            pass
    match_conditions: list = [{"submittedBy.userId": uid}]
    if user and user.get("email"):
        match_conditions.append({"submittedBy.email": user["email"]})
    if user and user.get("uid") and user["uid"] != uid:
        match_conditions.append({"submittedBy.userId": user["uid"]})

    cursor = (
        get_collection("issues")
        .find({"$or": match_conditions, "isHidden": False, "approvalStatus": "approved", "isAnonymous": {"$ne": True}}, {"adminNote": 0, "spamFlags": 0})
        .sort("submittedAt", -1)
        .limit(20)
    )
    return serialize_mongo({"success": True, "data": list(cursor)})


@router.get("/feed")
def public_feed(page: int = Query(1, ge=1), limit: int = Query(10, ge=1, le=50)):
    col = get_collection("feed_events")
    skip = (page - 1) * limit
    events = list(col.find({}).sort("createdAt", -1).skip(skip).limit(limit))
    total = col.count_documents({})
    return serialize_mongo({"success": True, "data": events, "hasMore": skip + len(events) < total})


@router.post("/incidents", status_code=201)
def report_incident(payload: PublicIncidentIn, auth_user: Optional[dict] = Depends(get_optional_user)):
    """Quick report from the home page. Works for guests; a logged-in user's profile name wins."""
    name = payload.reporterName or "Anonymous Neighbour"
    email = auth_user["email"] if auth_user else None
    if auth_user and name != "Anonymous Neighbour":
        name = (auth_user["dbUser"] or {}).get("name") or name

    incident = {
        "title": payload.title.strip(),
        "area": payload.area.strip(),
        "description": payload.description.strip(),
        "category": payload.category or "General Waste",
        "reporterName": name,
        "reporterEmail": email,
        "createdAt": utcnow(),
    }
    inserted = get_collection("incidents").insert_one(incident).inserted_id
    create_feed_event(
        "incident_reported",
        {"incidentId": str(inserted), "title": incident["title"], "area": incident["area"], "category": incident["category"], "reporterName": name},
    )
    return {"success": True, "_id": str(inserted), "message": "Incident reported successfully!"}


@router.get("/contributions/summary")
def contributions_summary(type: Optional[str] = None):
    start = utcnow().replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    match: dict = {"date": {"$gte": start}}
    if type:
        match["type"] = type
    rows = list(get_collection("contributions").aggregate([{"$match": match}, {"$group": {"_id": None, "totalRaised": {"$sum": "$amount"}, "donors": {"$addToSet": "$email"}}}]))
    return {"success": True, "totalRaised": rows[0]["totalRaised"] if rows else 0, "totalDonors": len(rows[0]["donors"]) if rows else 0}


@router.get("/search")
def global_search(q: str = ""):
    if len(q) < 2:
        return {"success": True, "results": []}
    rx = {"$regex": re.escape(q), "$options": "i"}

    def find(col, query, fields, limit=5):
        return list(get_collection(col).find(query, fields).limit(limit))

    issues = find("issues", {"$or": [{"title": rx}, {"description": rx}], "isHidden": False, "approvalStatus": "approved"}, {"title": 1})
    events = find("cleanupevents", {"$or": [{"title": rx}, {"description": rx}], "approvalStatus": "approved"}, {"title": 1})
    notices = find("announcements", {"$or": [{"title": rx}, {"description": rx}]}, {"title": 1})
    lost = find("lostFound", {"$or": [{"itemName": rx}, {"description": rx}], "approvalStatus": "approved"}, {"itemName": 1})
    animals = find("animals", {"$or": [{"animalType": rx}, {"condition": rx}], "approvalStatus": "approved"}, {"animalType": 1, "condition": 1})
    ngos = find("ngos", {"$or": [{"name": rx}, {"mission": rx}], "status": "verified"}, {"name": 1})
    forum = find("forum", {"$or": [{"title": rx}, {"body": rx}], "approvalStatus": "approved"}, {"title": 1})

    results = (
        [{"_id": i["_id"], "title": i["title"], "type": "Issue", "link": f"/issues/{i['_id']}"} for i in issues]
        + [{"_id": e["_id"], "title": e["title"], "type": "Event", "link": f"/cleanup-events/{e['_id']}"} for e in events]
        + [{"_id": n["_id"], "title": n["title"], "type": "Notice", "link": f"/noticeboard/{n['_id']}"} for n in notices]
        + [{"_id": l["_id"], "title": l.get("itemName"), "type": "Lost & Found", "link": f"/lost-found/{l['_id']}"} for l in lost]
        + [{"_id": a["_id"], "title": f"{a.get('animalType')} rescue: {(a.get('condition') or '')[:50]}", "type": "Animal Rescue", "link": f"/animals/{a['_id']}"} for a in animals]
        + [{"_id": n["_id"], "title": n["name"], "type": "NGO", "link": f"/ngos/{n['_id']}"} for n in ngos]
        + [{"_id": f["_id"], "title": f["title"], "type": "Forum Thread", "link": f"/forum/{f['_id']}"} for f in forum]
    )
    return serialize_mongo({"success": True, "results": results})
