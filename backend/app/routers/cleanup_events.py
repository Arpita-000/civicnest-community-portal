"""Cleanup drives (`routes/cleanupEvents.js`). Uses the original `cleanupevents` collection."""
import random
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from ..auth import get_optional_user, verify_token
from ..database import get_collection
from ..services.credits import credit_status
from ..services.feed import create_feed_event
from ..services.notifications import create_notification
from ..services.points import add_points, update_streak
from ..utils import serialize_mongo, to_oid, utcnow

router = APIRouter(prefix="/cleanup-events", tags=["Cleanup Events"])


def _attach_organizer_profiles(events: list[dict]) -> None:
    emails = [e["organizer"]["email"] for e in events if (e.get("organizer") or {}).get("email")]
    if not emails:
        return
    users = {
        u["email"]: u
        for u in get_collection("users").find({"email": {"$in": emails}}, {"email": 1, "name": 1, "photoURL": 1})
    }
    for e in events:
        org = e.get("organizer") or {}
        u = users.get(org.get("email"))
        if u:
            org["name"] = u.get("name") or org.get("name")
            org["photoURL"] = u.get("photoURL") or org.get("photoURL")
        elif org.get("email") and not org.get("name"):
            org["name"] = org["email"].split("@")[0]


@router.get("")
@router.get("/")
def list_events(
    status: Optional[str] = None,
    area: Optional[str] = None,
    upcoming: bool = Query(False),
    page: int = Query(1, ge=1),
    limit: int = Query(12, ge=1, le=50),
):
    query: dict = {"approvalStatus": "approved"}
    if status:
        query["status"] = status
    if area:
        query["location.area"] = area
    if upcoming:
        query["$or"] = [{"eventDate": {"$gte": utcnow()}}, {"eventDate": {"$gte": utcnow().isoformat()}}]
        query["status"] = "upcoming"

    col = get_collection("cleanupevents")
    events = list(col.find(query).sort("eventDate", 1).skip((page - 1) * limit).limit(limit))
    _attach_organizer_profiles(events)
    return serialize_mongo({"success": True, "events": events, "total": col.count_documents(query)})


@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_event(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    user_for_credit = {**(auth_user["dbUser"] or {}), "role": auth_user["role"], "isVolunteer": auth_user["isVolunteer"], "points": auth_user["points"]}
    credit = credit_status(auth_user["email"], "cleanupEvents", user_for_credit)
    if not credit.get("isAdmin") and credit.get("limit") == 0:
        raise HTTPException(403, {"message": "Only verified members can organize cleanup events.", "code": "NO_CREDIT_FOR_ROLE"})
    if not credit.get("isAdmin") and credit.get("remaining") == 0:
        raise HTTPException(429, {"message": "You have reached your cleanup event creation limit for this 72h window.", "code": "CREDIT_LIMIT_REACHED"})

    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    event_date_raw = payload.get("eventDate")
    event_time = payload.get("eventTime") or "09:00 AM"
    loc = payload.get("location") or {}
    if not title or not description or not event_date_raw or not loc.get("address"):
        raise HTTPException(400, "Title, description, date, time and location are required.")

    try:
        event_date = datetime.fromisoformat(str(event_date_raw).replace("Z", "+00:00")).replace(tzinfo=None)
    except Exception:
        event_date = utcnow() + timedelta(days=7)

    is_admin = auth_user["role"] == "admin"
    now = utcnow()
    funding_enabled = bool(payload.get("fundingEnabled"))
    doc = {
        "title": title,
        "slogan": (payload.get("slogan") or "").strip(),
        "description": description,
        "coverImages": (payload.get("coverImages") or [])[:3],
        "eventDate": event_date,
        "eventTime": event_time,
        "durationHours": int(payload.get("durationHours") or 3),
        "location": {
            "address": loc.get("address", ""),
            "area": loc.get("area", ""),
            "coordinates": loc.get("coordinates") or [],
        },
        "organizer": {
            "email": auth_user["email"],
            "name": auth_user["name"] or (auth_user["dbUser"] or {}).get("name") or auth_user["email"].split("@")[0],
            "photoURL": auth_user["picture"] or (auth_user["dbUser"] or {}).get("photoURL") or None,
        },
        "maxVolunteers": int(payload.get("maxVolunteers") or 0),
        "requiredSkills": payload.get("requiredSkills") or [],
        "suppliesNeeded": payload.get("suppliesNeeded") or [],
        "meetingInstructions": payload.get("meetingInstructions") or "",
        "fundingEnabled": funding_enabled,
        "fundingGoal": float(payload.get("fundingGoal") or 0) if funding_enabled else 0,
        "fundingRaised": 0,
        "going": [],
        "goingCount": 0,
        "interested": [],
        "interestedCount": 0,
        "approvalStatus": "approved" if is_admin else "pending_review",
        "status": "upcoming",
        "createdAt": now,
    }
    inserted_id = get_collection("cleanupevents").insert_one(doc).inserted_id
    doc["_id"] = inserted_id
    add_points(auth_user["email"], "drive_created")
    return serialize_mongo({"success": True, "event": doc})


@router.get("/my")
def my_events(auth_user: dict = Depends(verify_token)):
    email = auth_user["email"]
    col = get_collection("cleanupevents")
    organized = list(col.find({"organizer.email": email}).sort("createdAt", -1))
    attending = list(col.find({"going.email": email}).sort("eventDate", 1))
    return serialize_mongo({"organized": organized, "attending": attending})


@router.get("/{event_id}")
def event_detail(event_id: str, auth_user: Optional[dict] = Depends(get_optional_user)):
    oid = to_oid(event_id, "event ID")
    event = get_collection("cleanupevents").find_one({"_id": oid})
    if not event:
        raise HTTPException(404, "Cleanup event not found")
    is_owner = bool(auth_user) and (event.get("organizer") or {}).get("email") == auth_user["email"]
    is_admin = bool(auth_user) and auth_user["role"] == "admin"
    if event.get("approvalStatus") != "approved" and not (is_owner or is_admin):
        raise HTTPException(404, "Cleanup event not found")
    _attach_organizer_profiles([event])
    return serialize_mongo(event)


@router.get("/{event_id}/attendees")
def event_attendees(event_id: str, auth_user: dict = Depends(verify_token)):
    event = get_collection("cleanupevents").find_one({"_id": to_oid(event_id, "event ID")})
    if not event:
        raise HTTPException(404, "Event not found")
    if (event.get("organizer") or {}).get("email") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Access denied")
    return serialize_mongo({
        "going": event.get("going") or [],
        "interested": event.get("interested") or [],
        "goingCount": event.get("goingCount") or len(event.get("going") or []),
        "interestedCount": event.get("interestedCount") or len(event.get("interested") or []),
    })


@router.put("/{event_id}")
@router.patch("/{event_id}")
def update_event(event_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    oid = to_oid(event_id, "event ID")
    col = get_collection("cleanupevents")
    event = col.find_one({"_id": oid})
    if not event:
        raise HTTPException(404, "Event not found")
    if (event.get("organizer") or {}).get("email") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Only the organizer can update this event.")
    allowed = [
        "title", "slogan", "description", "eventDate", "eventTime",
        "durationHours", "location", "coverImages", "maxVolunteers",
        "requiredSkills", "suppliesNeeded", "meetingInstructions", "fundingGoal",
    ]
    updates = {k: payload[k] for k in allowed if k in payload}
    if "eventDate" in updates and isinstance(updates["eventDate"], str):
        try:
            updates["eventDate"] = datetime.fromisoformat(updates["eventDate"].replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            pass
    if updates:
        col.update_one({"_id": oid}, {"$set": updates})
    return serialize_mongo({"success": True, "event": col.find_one({"_id": oid})})


@router.post("/{event_id}/interested")
def toggle_interested(event_id: str, auth_user: dict = Depends(verify_token)):
    oid = to_oid(event_id, "event ID")
    col = get_collection("cleanupevents")
    event = col.find_one({"_id": oid})
    if not event or event.get("approvalStatus") != "approved":
        raise HTTPException(404, "Event not found or not yet approved.")
    if event.get("status") in ("cancelled", "completed"):
        raise HTTPException(403, f"This event has been {event.get('status')}.")

    email = auth_user["email"]
    interested = [x for x in (event.get("interested") or []) if isinstance(x, str)]
    already = any(x.lower() == email.lower() for x in interested)
    if already:
        interested = [x for x in interested if x.lower() != email.lower()]
    else:
        interested.append(email)
    col.update_one({"_id": oid}, {"$set": {"interested": interested, "interestedCount": len(interested)}})
    return {
        "interested": not already,
        "interestedCount": len(interested),
        "message": "Interest removed successfully" if already else "Interest marked successfully",
    }


@router.post("/{event_id}/going")
@router.post("/{event_id}/rsvp")
def toggle_going(event_id: str, auth_user: dict = Depends(verify_token)):
    oid = to_oid(event_id, "event ID")
    col = get_collection("cleanupevents")
    event = col.find_one({"_id": oid})
    if not event or event.get("approvalStatus") != "approved":
        raise HTTPException(404, "Event not found or not yet approved.")
    if event.get("status") in ("cancelled", "completed"):
        raise HTTPException(403, f"This event has been {event.get('status')}.")

    email = auth_user["email"]
    going = list(event.get("going") or [])
    idx = next((i for i, a in enumerate(going) if (a.get("email") or "").lower() == email.lower()), -1)
    if idx > -1:
        going.pop(idx)
        col.update_one({"_id": oid}, {"$set": {"going": going, "goingCount": len(going)}})
        return {"going": False, "goingCount": len(going), "message": "Volunteer registration removed successfully"}

    max_v = int(event.get("maxVolunteers") or 0)
    if max_v > 0 and len(going) >= max_v:
        raise HTTPException(409, "This event is full. You can still mark yourself as Interested.")

    going.append({
        "email": email,
        "name": auth_user["name"] or (auth_user["dbUser"] or {}).get("name") or email.split("@")[0],
        "photoURL": auth_user["picture"] or (auth_user["dbUser"] or {}).get("photoURL") or None,
        "status": "going",
    })
    interested = [x for x in (event.get("interested") or []) if isinstance(x, str) and x.lower() != email.lower()]
    col.update_one(
        {"_id": oid},
        {"$set": {"going": going, "goingCount": len(going), "interested": interested, "interestedCount": len(interested)}},
    )
    create_feed_event("drive_joined", {
        "count": len(going),
        "driveTitle": event.get("title"),
        "area": (event.get("location") or {}).get("area", ""),
        "link": f"/cleanup-events/{event_id}",
    })
    update_streak(email)
    return {"going": True, "goingCount": len(going), "message": "Volunteer registration successful"}


@router.post("/{event_id}/donate")
def donate_to_event(event_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    oid = to_oid(event_id, "event ID")
    amount = float(payload.get("amount") or 0)
    if amount <= 0:
        raise HTTPException(400, "Invalid donation amount.")
    col = get_collection("cleanupevents")
    event = col.find_one({"_id": oid})
    if not event or not event.get("fundingEnabled"):
        raise HTTPException(404, "Event not found or funding not enabled.")

    donor_name = payload.get("name") or auth_user["name"] or auth_user["email"].split("@")[0]
    get_collection("contributions").insert_one({
        "eventId": str(oid),
        "eventTitle": event.get("title"),
        "type": "cleanup_event",
        "amount": amount,
        "name": donor_name,
        "email": auth_user["email"],
        "phone": payload.get("phone") or "",
        "additionalInfo": payload.get("additionalInfo") or "",
        "date": utcnow(),
    })
    col.update_one({"_id": oid}, {"$inc": {"fundingRaised": amount}})
    add_points(auth_user["email"], "contribution_made")
    org_email = (event.get("organizer") or {}).get("email")
    if org_email:
        create_notification(org_email, org_email, f"{donor_name} donated ৳{int(amount)} to your cleanup event!", "drive", f"/cleanup-events/{event_id}")
    return {"success": True, "message": "Donation recorded. Thank you!"}


@router.post("/{event_id}/complete")
def complete_event(event_id: str, payload: Optional[dict] = None, auth_user: dict = Depends(verify_token)):
    oid = to_oid(event_id, "event ID")
    col = get_collection("cleanupevents")
    event = col.find_one({"_id": oid})
    if not event:
        raise HTTPException(404, "Event not found")
    if (event.get("organizer") or {}).get("email") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Access denied")

    updates: dict = {"status": "completed", "postEventPhotos": (payload or {}).get("postEventPhotos") or []}
    if not event.get("pointsAwarded"):
        updates["pointsAwarded"] = True
        org_email = (event.get("organizer") or {}).get("email")
        if org_email:
            add_points(org_email, "event_organized")
        for att in event.get("going") or []:
            if att.get("email"):
                add_points(att["email"], "event_attended")
                create_notification(att["email"], att["email"], f'✅ The "{event.get("title")}" cleanup is marked complete! You earned 30 points.', "badge", f"/cleanup-events/{event_id}")
    col.update_one({"_id": oid}, {"$set": updates})
    return {"success": True}


@router.post("/{event_id}/cancel")
def cancel_event(event_id: str, payload: Optional[dict] = None, auth_user: dict = Depends(verify_token)):
    oid = to_oid(event_id, "event ID")
    col = get_collection("cleanupevents")
    event = col.find_one({"_id": oid})
    if not event:
        raise HTTPException(404, "Event not found")
    if (event.get("organizer") or {}).get("email") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Access denied")
    reason = (payload or {}).get("reason") or "Cancelled by organizer."
    col.update_one({"_id": oid}, {"$set": {"status": "cancelled", "cancelReason": reason}})
    return {"success": True}


@router.post("/{event_id}/generate-checkin-code")
def generate_checkin_code(event_id: str, auth_user: dict = Depends(verify_token)):
    oid = to_oid(event_id, "event ID")
    col = get_collection("cleanupevents")
    event = col.find_one({"_id": oid})
    if not event:
        raise HTTPException(404, "Event not found")
    if (event.get("organizer") or {}).get("email") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Only the organizer can generate the check-in code.")
    otp = str(random.randint(100000, 999999))
    now = utcnow()
    col.update_one({"_id": oid}, {"$set": {"checkinCode": otp, "checkinCodeGeneratedAt": now}})
    return {"code": otp, "validUntil": (now + timedelta(hours=5)).isoformat() + "Z"}


@router.post("/{event_id}/checkin")
def attendee_checkin(event_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    oid = to_oid(event_id, "event ID")
    otp = str(payload.get("otp") or "").strip()
    if not otp:
        raise HTTPException(400, "Check-in code is required.")
    col = get_collection("cleanupevents")
    event = col.find_one({"_id": oid})
    if not event:
        raise HTTPException(404, "Event not found")
    if event.get("checkinCode") != otp:
        raise HTTPException(400, "Incorrect check-in code.")
    going = list(event.get("going") or [])
    email = auth_user["email"]
    idx = next((i for i, a in enumerate(going) if (a.get("email") or "").lower() == email.lower()), -1)
    if idx == -1:
        raise HTTPException(403, "You must RSVP before checking in.")
    if going[idx].get("checkedIn"):
        raise HTTPException(400, "You have already checked in to this event.")
    going[idx]["checkedIn"] = True
    going[idx]["checkedInAt"] = utcnow()
    going[idx]["status"] = "attended"
    col.update_one({"_id": oid}, {"$set": {"going": going}})
    pts = add_points(email, "event_attended")
    update_streak(email)
    return {"success": True, "pointsEarned": pts, "message": f"✅ Checked in! You earned {pts} points."}
