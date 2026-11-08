"""Volunteer Hub & Dashboard (`routes/volunteers.js`)."""
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from ..auth import verify_token
from ..database import get_collection
from ..services.notifications import create_notification
from ..services.points import add_points
from ..utils import serialize_mongo, to_oid, utcnow

router = APIRouter(prefix="/volunteers", tags=["Volunteers"])


@router.get("/status")
def volunteer_status(auth_user: dict = Depends(verify_token)):
    doc = get_collection("volunteers").find_one({"email": auth_user["email"]})
    return serialize_mongo({"isRegistered": bool(doc), "volunteer": doc})


@router.post("/register")
def register_volunteer(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    skills = payload.get("skills") or []
    if not skills:
        raise HTTPException(400, "Select at least one skill.")
    col = get_collection("volunteers")
    users_col = get_collection("users")
    db_user = users_col.find_one({"email": auth_user["email"]}) or {}
    actual_name = db_user.get("name") or auth_user["name"] or auth_user["email"].split("@")[0]
    actual_photo = db_user.get("photoURL") or auth_user["picture"] or None

    existing = col.find_one({"email": auth_user["email"]})
    approval_status = existing.get("approvalStatus", "pending") if existing else "pending"
    is_available = existing.get("isAvailable", False) if existing else False

    col.update_one(
        {"email": auth_user["email"]},
        {
            "$set": {
                "email": auth_user["email"],
                "name": actual_name,
                "photoURL": actual_photo,
                "skills": skills,
                "availability": payload.get("availability") or "Anytime",
                "area": payload.get("area") or "",
                "phone": payload.get("phone") or "",
                "contactMethod": payload.get("contactMethod") or "Email",
                "isAvailable": is_available,
                "approvalStatus": approval_status,
                "registeredAt": utcnow(),
            }
        },
        upsert=True,
    )
    return {"success": True}


@router.get("/stats")
def volunteer_stats(auth_user: dict = Depends(verify_token)):
    email = auth_user["email"]
    events = list(get_collection("cleanupevents").find({"going.email": email}))
    total_hours = 0
    total_points = 0
    verified_count = 0
    pending_count = 0
    history = []

    for event in events:
        entry = next((v for v in (event.get("going") or []) if v.get("email") == email), None)
        hours = int(event.get("durationHours") or 3)
        verified = (entry or {}).get("status") == "attended"
        pts = hours * 10 if verified else 0
        total_hours += hours
        total_points += pts
        if verified:
            verified_count += 1
        elif (entry or {}).get("status") == "going":
            pending_count += 1
        history.append({
            "_id": event["_id"],
            "title": event.get("title"),
            "date": event.get("eventDate"),
            "area": (event.get("location") or {}).get("area", ""),
            "coverImage": (event.get("coverImages") or [None])[0],
            "hours": hours,
            "points": pts,
            "status": "verified" if verified else "pending",
            "verificationStatus": (entry or {}).get("verificationStatus"),
        })

    history.sort(key=lambda x: str(x.get("date") or ""), reverse=True)

    level, next_level, to_next = "Bronze", "Silver", 100 - total_points
    if total_points >= 500:
        level, next_level, to_next = "Platinum", "Max", 0
    elif total_points >= 300:
        level, next_level, to_next = "Gold", "Platinum", 500 - total_points
    elif total_points >= 100:
        level, next_level, to_next = "Silver", "Gold", 300 - total_points

    user = get_collection("users").find_one({"email": email}, {"points": 1}) or {}
    return serialize_mongo({
        "totalHours": total_hours,
        "totalEvents": verified_count,
        "totalPoints": total_points,
        "platformPoints": user.get("points", 0),
        "currentLevel": level,
        "nextLevel": next_level,
        "pointsToNextLevel": max(0, to_next),
        "pendingVerifications": pending_count,
        "history": history,
    })


@router.get("/opportunities")
def volunteer_opportunities(
    area: Optional[str] = None,
    skill: Optional[str] = None,
    _auth_user: dict = Depends(verify_token),
):
    now = utcnow()
    event_query: dict = {
        "approvalStatus": "approved",
        "status": "upcoming",
        "$or": [{"eventDate": {"$gte": now}}, {"eventDate": {"$gte": now.isoformat()}}],
    }
    if area:
        event_query["location.area"] = {"$regex": area, "$options": "i"}
    cleanup_events = list(get_collection("cleanupevents").find(event_query).sort("eventDate", 1).limit(20))
    event_opps = [
        {
            "_id": e["_id"],
            "type": "cleanup_event",
            "title": e.get("title"),
            "subtitle": e.get("slogan") or "Community cleanup drive",
            "location": (e.get("location") or {}).get("address", ""),
            "area": (e.get("location") or {}).get("area", ""),
            "date": e.get("eventDate"),
            "time": e.get("eventTime"),
            "image": (e.get("coverImages") or [None])[0],
            "spotsLeft": (int(e.get("maxVolunteers") or 0) - int(e.get("goingCount") or 0)) if int(e.get("maxVolunteers") or 0) > 0 else None,
            "skills": e.get("requiredSkills") or [],
            "organizer": (e.get("organizer") or {}).get("name", ""),
            "link": f"/cleanup-events/{e['_id']}",
            "actionLabel": "RSVP & Go",
        }
        for e in cleanup_events
    ]

    drive_query: dict = {"status": "upcoming"}
    if area:
        drive_query["area"] = {"$regex": area, "$options": "i"}
    feeding_drives = list(get_collection("feedingDrives").find(drive_query).sort("date", 1).limit(10))
    drive_opps = [
        {
            "_id": d["_id"],
            "type": "feeding_drive",
            "title": d.get("title"),
            "subtitle": f"Feeding drive — {d.get('foodType') or 'community meal'}",
            "location": d.get("location") or "",
            "area": d.get("area") or "",
            "date": d.get("date"),
            "time": d.get("time") or "",
            "image": None,
            "spotsLeft": (int(d.get("volunteersNeeded") or 0) - len(d.get("volunteers") or [])) if int(d.get("volunteersNeeded") or 0) > 0 else None,
            "skills": ["General Cleanup"],
            "organizer": d.get("createdBy") or "",
            "link": "/animals/feeding-drives",
            "actionLabel": "Join Drive",
        }
        for d in feeding_drives
    ]

    issue_query: dict = {"approvalStatus": "approved", "status": {"$in": ["open", "action_taken"]}, "isHidden": {"$ne": True}}
    if area:
        issue_query["area"] = {"$regex": area, "$options": "i"}
    vol_issues = list(get_collection("issues").find(issue_query).sort("submittedAt", -1).limit(10))
    issue_opps = [
        {
            "_id": i["_id"],
            "type": "issue_help",
            "title": f"Help resolve: {i.get('title')}",
            "subtitle": f"Urgency: {i.get('urgency') or 'medium'}",
            "location": i.get("location") or "",
            "area": i.get("area") or "",
            "date": None,
            "time": None,
            "image": (i.get("images") or [None])[0],
            "spotsLeft": None,
            "skills": ["General Cleanup"],
            "organizer": "",
            "link": f"/issues/{i['_id']}",
            "actionLabel": "Volunteer to Help",
        }
        for i in vol_issues
    ]

    all_opps = [*event_opps, *drive_opps, *issue_opps]
    if skill:
        all_opps = [
            o for o in all_opps
            if not o["skills"] or any(skill.lower() in s.lower() for s in o["skills"])
        ]

    return serialize_mongo({"opportunities": all_opps, "total": len(all_opps)})


@router.post("/verify")
def submit_volunteer_verification(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    event_id = payload.get("eventId")
    method = payload.get("method")
    if not event_id or not method:
        raise HTTPException(400, "Event ID and method are required.")
    oid = to_oid(event_id, "event ID")
    col = get_collection("cleanupevents")
    event = col.find_one({"_id": oid})
    if not event:
        raise HTTPException(404, "Event not found.")
    going = list(event.get("going") or [])
    idx = next((i for i, v in enumerate(going) if v.get("email") == auth_user["email"]), -1)
    if idx == -1:
        raise HTTPException(403, "You are not registered for this event.")
    going[idx]["verificationMethod"] = method
    going[idx]["verificationData"] = payload.get("proofData") or {}
    going[idx]["verificationSubmittedAt"] = utcnow()
    going[idx]["verificationStatus"] = "pending"
    col.update_one({"_id": oid}, {"$set": {"going": going}})
    org_email = (event.get("organizer") or {}).get("email")
    if org_email:
        create_notification(org_email, org_email, f"{auth_user['name'] or auth_user['email']} submitted verification for \"{event.get('title')}\"", "verification_request", f"/cleanup-events/{event_id}")
    return {"success": True}


@router.post("/approve-verification")
def approve_volunteer_verification(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    event_id = payload.get("eventId")
    vol_email = payload.get("volunteerEmail")
    oid = to_oid(event_id, "event ID")
    col = get_collection("cleanupevents")
    event = col.find_one({"_id": oid})
    if not event:
        raise HTTPException(404, "Event not found.")
    if (event.get("organizer") or {}).get("email") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Only the organizer can approve.")
    going = list(event.get("going") or [])
    idx = next((i for i, v in enumerate(going) if v.get("email") == vol_email), -1)
    if idx == -1:
        raise HTTPException(404, "Volunteer not found.")
    going[idx]["status"] = "attended"
    going[idx]["verificationStatus"] = "approved"
    going[idx]["verifiedAt"] = utcnow()
    going[idx]["verifiedBy"] = auth_user["email"]
    col.update_one({"_id": oid}, {"$set": {"going": going}})
    add_points(vol_email, "event_attended")
    create_notification(vol_email, vol_email, f'✅ Your participation in "{event.get("title")}" was verified! +30 points earned.', "verification_approved", "/volunteer-dashboard", "high")
    return {"success": True}


@router.post("/reject-verification")
def reject_volunteer_verification(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    event_id = payload.get("eventId")
    vol_email = payload.get("volunteerEmail")
    reason = payload.get("reason") or ""
    oid = to_oid(event_id, "event ID")
    col = get_collection("cleanupevents")
    event = col.find_one({"_id": oid})
    if not event:
        raise HTTPException(404, "Event not found.")
    if (event.get("organizer") or {}).get("email") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Only the organizer can reject.")
    going = list(event.get("going") or [])
    idx = next((i for i, v in enumerate(going) if v.get("email") == vol_email), -1)
    if idx == -1:
        raise HTTPException(404, "Volunteer not found.")
    going[idx]["status"] = "going"
    going[idx]["verificationStatus"] = "rejected"
    going[idx]["rejectionReason"] = reason
    col.update_one({"_id": oid}, {"$set": {"going": going}})
    create_notification(vol_email, vol_email, f'Your verification for "{event.get("title")}" was rejected. {reason or "Contact the organizer."}', "verification_rejected", f"/cleanup-events/{event_id}")
    return {"success": True}


@router.get("")
@router.get("/")
def list_volunteers(
    skill: Optional[str] = None,
    area: Optional[str] = None,
    available: Optional[str] = None,
):
    query: dict = {"approvalStatus": "approved"}
    if skill:
        query["skills"] = {"$in": [skill]}
    if area:
        query["area"] = {"$regex": area, "$options": "i"}
    if available == "true":
        query["isAvailable"] = True

    pipeline = [
        {"$match": query},
        {"$lookup": {"from": "users", "localField": "email", "foreignField": "email", "as": "userData"}},
        {"$unwind": {"path": "$userData", "preserveNullAndEmptyArrays": True}},
        {
            # Inclusion projection: email/phone are left out (Mongo forbids mixing 0 with computed fields).
            "$project": {
                "uid": "$userData.uid",
                "name": {"$ifNull": ["$userData.name", "$userData.displayName", "$name"]},
                "photoURL": {"$ifNull": ["$userData.photoURL", "$photoURL"]},
                "skills": 1,
                "area": 1,
                "availability": 1,
                "registeredAt": 1,
                "isAvailable": 1,
                "approvalStatus": 1,
            }
        },
        {"$sort": {"registeredAt": -1}},
        {"$limit": 50},
    ]
    volunteers = list(get_collection("volunteers").aggregate(pipeline))
    return serialize_mongo({"volunteers": volunteers})


@router.patch("/availability")
def toggle_availability(auth_user: dict = Depends(verify_token)):
    col = get_collection("volunteers")
    vol = col.find_one({"email": auth_user["email"]})
    if not vol:
        raise HTTPException(404, "Not registered as volunteer.")
    new_status = not bool(vol.get("isAvailable"))
    col.update_one({"email": auth_user["email"]}, {"$set": {"isAvailable": new_status}})
    return {"success": True, "isAvailable": new_status}

