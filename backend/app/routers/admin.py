"""Admin Dashboard & Moderation (`routes/admin.js`)."""
import random
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query

from ..auth import admin_only, admin_or_mod
from ..database import get_collection
from ..services.feed import create_feed_event
from ..services.notifications import create_notification, log_audit
from ..services.points import add_points
from ..utils import drop_cache, serialize_mongo, to_oid, utcnow

router = APIRouter(prefix="/admin", tags=["Admin"])


def _priority_score(issue: dict) -> int:
    mult_map = {"emergency": 5.0, "high": 2.0, "medium": 1.2, "low": 1.0}
    base = len(issue.get("upvotes") or []) * 10
    mult = mult_map.get(issue.get("urgency"), 1.0)
    sub = issue.get("submittedAt")
    hours_open = 10.0
    if isinstance(sub, datetime):
        hours_open = max(0.0, min(100.0, (utcnow() - sub).total_seconds() / 3600.0))
    return round((base * mult) + hours_open)


@router.get("/stats")
def admin_stats(_auth_user: dict = Depends(admin_only)):
    users_col = get_collection("users")
    issues_col = get_collection("issues")
    mem_col = get_collection("membershipRequests")
    events_col = get_collection("cleanupevents")
    contrib_col = get_collection("contributions")
    vol_col = get_collection("volunteers")
    ngos_col = get_collection("ngos")

    total_users = users_col.count_documents({})
    total_issues = issues_col.count_documents({"isHidden": {"$ne": True}})
    open_issues = issues_col.count_documents({"approvalStatus": "approved", "status": "open", "isHidden": {"$ne": True}})
    solved_issues = issues_col.count_documents({"approvalStatus": "approved", "status": "solved", "isHidden": {"$ne": True}})
    pending_requests = mem_col.count_documents({"status": "pending"})
    pending_ngos = ngos_col.count_documents({"status": "pending"})
    total_events = events_col.count_documents({"approvalStatus": "approved"})
    total_volunteers = vol_col.count_documents({"approvalStatus": "approved"})

    don_agg = list(contrib_col.aggregate([{"$group": {"_id": None, "total": {"$sum": "$amount"}}}]))
    total_donations = don_agg[0]["total"] if don_agg else 0

    cat_breakdown = list(
        issues_col.aggregate([
            {"$match": {"isHidden": {"$ne": True}}},
            {"$group": {"_id": "$category", "count": {"$sum": 1}}},
            {"$project": {"name": "$_id", "value": "$count", "_id": 0}},
        ])
    )
    trend_raw = list(
        issues_col.aggregate([
            {"$match": {"isHidden": {"$ne": True}}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$project": {"name": "$_id", "value": "$count", "_id": 0}},
        ])
    )
    formatted_trend = [
        {"name": (item.get("name") or "unknown").replace("_", " ").upper(), "Issues": item.get("value", 0)}
        for item in trend_raw
    ]

    return {
        "totalUsers": total_users,
        "totalIssues": total_issues,
        "openIssues": open_issues,
        "solvedIssues": solved_issues,
        "pendingRequests": pending_requests,
        "pendingNGOs": pending_ngos,
        "totalEvents": total_events,
        "totalVolunteers": total_volunteers,
        "totalDonations": total_donations,
        "categoryBreakdown": cat_breakdown,
        "issueTrend": formatted_trend,
    }


@router.get("/users")
def list_users(_auth_user: dict = Depends(admin_only)):
    users = list(get_collection("users").find().sort("createdAt", -1))
    return serialize_mongo(users)


@router.patch("/users/{user_id}/role")
def update_user_role(user_id: str, payload: dict = Body(...), _auth_user: dict = Depends(admin_only)):
    oid = to_oid(user_id, "user ID")
    role = payload.get("role")
    res = get_collection("users").update_one({"_id": oid}, {"$set": {"role": role}})
    return {"modifiedCount": res.modified_count, "acknowledged": True}


@router.get("/membership")
def list_membership_requests(_auth_user: dict = Depends(admin_only)):
    pipeline = [
        {"$lookup": {"from": "users", "localField": "email", "foreignField": "email", "as": "userData"}},
        {"$unwind": {"path": "$userData", "preserveNullAndEmptyArrays": True}},
        {"$addFields": {"photoURL": "$userData.photoURL"}},
        {"$project": {"userData": 0}},
        {"$sort": {"submittedAt": -1}},
    ]
    reqs = list(get_collection("membershipRequests").aggregate(pipeline))
    return serialize_mongo(reqs)


@router.patch("/membership/{req_id}/status")
@router.patch("/membership/{req_id}/{action}")
def update_membership_status(req_id: str, action: Optional[str] = None, payload: dict = Body(default={}), _auth_user: dict = Depends(admin_only)):
    oid = to_oid(req_id, "request ID")
    status = payload.get("status") or (f"{action}d" if action in ("approve", "reject") else action)
    email = payload.get("email")
    mem_col = get_collection("membershipRequests")
    res = mem_col.update_one({"_id": oid}, {"$set": {"status": status, "reviewedAt": utcnow()}})

    if status == "approved":
        req_doc = mem_col.find_one({"_id": oid}) or {}
        target_email = email or req_doc.get("email")
        if target_email:
            member_id = f"MEM-{random.randint(10000, 99999)}"
            addr = {
                k: req_doc[k]
                for k in ("name", "phone", "area", "streetAddress", "apartmentNumber")
                if req_doc.get(k) is not None
            }
            get_collection("users").update_one(
                {"email": target_email},
                {"$set": {"role": "member", "memberId": member_id, "verifiedAt": utcnow(), **addr}},
            )
            add_points(target_email, "membership_approved")
            create_notification(target_email, target_email, f"🎉 Your membership request was approved! Your Member ID is {member_id}.", "achievement", "/profile")
    return {"modifiedCount": res.modified_count, "acknowledged": True}


@router.get("/volunteers")
def list_volunteer_requests(_auth_user: dict = Depends(admin_only)):
    pipeline = [
        {"$lookup": {"from": "users", "localField": "email", "foreignField": "email", "as": "userData"}},
        {"$unwind": {"path": "$userData", "preserveNullAndEmptyArrays": True}},
        {"$addFields": {"photoURL": "$userData.photoURL"}},
        {"$project": {"userData": 0}},
        {"$sort": {"registeredAt": -1}},
    ]
    reqs = list(get_collection("volunteers").aggregate(pipeline))
    return serialize_mongo(reqs)


@router.patch("/volunteers/{vol_id}/status")
@router.patch("/volunteers/{vol_id}/{action}")
def update_volunteer_status(vol_id: str, action: Optional[str] = None, payload: dict = Body(default={}), _auth_user: dict = Depends(admin_only)):
    oid = to_oid(vol_id, "volunteer ID")
    status = payload.get("status") or (f"{action}d" if action in ("approve", "reject") else action)
    email = payload.get("email")
    vol_col = get_collection("volunteers")
    vol_doc = vol_col.find_one({"_id": oid}) or {}
    target_email = email or vol_doc.get("email")
    res = vol_col.update_one(
        {"_id": oid},
        {"$set": {"approvalStatus": status, "isAvailable": status == "approved", "reviewedAt": utcnow()}},
    )
    if target_email:
        get_collection("users").update_one({"email": target_email}, {"$set": {"isVolunteer": status == "approved"}})
        if status == "approved":
            add_points(target_email, "volunteer_registered")
        create_notification(
            target_email,
            target_email,
            "🎉 Congratulations! Your volunteer registration has been approved!" if status == "approved" else "❌ Your volunteer registration request was rejected.",
            "drive",
            "/volunteer-dashboard",
        )
    return {"modifiedCount": res.modified_count, "acknowledged": True}


@router.get("/cleanup-events")
def admin_list_cleanup_events(_auth_user: dict = Depends(admin_only)):
    events = list(get_collection("cleanupevents").find().sort("createdAt", -1))
    return serialize_mongo(events)


@router.patch("/cleanup-events/{event_id}/status")
def admin_update_cleanup_event_status(event_id: str, payload: dict = Body(...), auth_user: dict = Depends(admin_only)):
    oid = to_oid(event_id, "event ID")
    approval_status = payload.get("approvalStatus")
    reject_reason = payload.get("rejectReason")
    col = get_collection("cleanupevents")
    updates: dict = {
        "approvalStatus": approval_status,
        "rejectReason": reject_reason or None,
        "status": "upcoming" if approval_status == "approved" else "cancelled",
    }
    if approval_status == "approved":
        updates["approvedBy"] = auth_user["email"]
    elif approval_status == "rejected":
        updates["rejectedBy"] = auth_user["email"]

    col.update_one({"_id": oid}, {"$set": updates})
    event = col.find_one({"_id": oid})
    if not event:
        raise HTTPException(404, "Event not found")
    if approval_status == "approved":
        create_feed_event("cleanup_approved", {"eventId": str(oid), "title": event.get("title"), "organizer": (event.get("organizer") or {}).get("name")})
    return serialize_mongo({"success": True, "event": event})


@router.patch("/cleanup-events/{event_id}/approve")
def admin_approve_cleanup_event(event_id: str, auth_user: dict = Depends(admin_only)):
    return admin_update_cleanup_event_status(event_id, {"approvalStatus": "approved"}, auth_user)


@router.patch("/cleanup-events/{event_id}/reject")
def admin_reject_cleanup_event(event_id: str, payload: Optional[dict] = None, auth_user: dict = Depends(admin_only)):
    return admin_update_cleanup_event_status(event_id, {"approvalStatus": "rejected", "rejectReason": (payload or {}).get("reason", "")}, auth_user)


@router.get("/posts")
def admin_get_posts(_auth_user: dict = Depends(admin_or_mod)):
    animals = list(get_collection("animals").find().sort("date", -1))
    lost_found = list(get_collection("lostFound").find().sort("date", -1))
    announcements = list(get_collection("announcements").find().sort("date", -1))
    return serialize_mongo({"animals": animals, "lostFound": lost_found, "announcements": announcements})


@router.delete("/posts/{post_type}/{post_id}")
def admin_delete_post(post_type: str, post_id: str, _auth_user: dict = Depends(admin_or_mod)):
    col_map = {"animal": "animals", "lostfound": "lostFound", "announcement": "announcements", "issue": "issues"}
    col_name = col_map.get(post_type)
    if not col_name:
        raise HTTPException(400, "Invalid post type")
    res = get_collection(col_name).delete_one({"_id": to_oid(post_id, "post ID")})
    return {"deletedCount": res.deleted_count, "acknowledged": True}


@router.delete("/posts/{post_id}")
def admin_delete_generic_post(post_id: str, _auth_user: dict = Depends(admin_or_mod)):
    oid = to_oid(post_id, "post ID")
    for col in ("issues", "animals", "lostFound", "announcements"):
        res = get_collection(col).delete_one({"_id": oid})
        if res.deleted_count > 0:
            return {"deletedCount": res.deleted_count, "collection": col, "acknowledged": True}
    return {"deletedCount": 0, "acknowledged": True}


@router.get("/queue/count")
def admin_queue_count(_auth_user: dict = Depends(admin_only)):
    issues_col = get_collection("issues")
    events_col = get_collection("cleanupevents")
    return {
        "pending_review": issues_col.count_documents({"approvalStatus": "pending_review", "isHidden": {"$ne": True}})
        + events_col.count_documents({"approvalStatus": "pending_review"}),
        "open": issues_col.count_documents({"approvalStatus": "approved", "status": "open", "isHidden": {"$ne": True}}),
        "action_taken": issues_col.count_documents({"approvalStatus": "approved", "status": "action_taken", "isHidden": {"$ne": True}}),
        "pending_verification": issues_col.count_documents({"approvalStatus": "approved", "status": "pending_verification", "isHidden": {"$ne": True}}),
        "solved": issues_col.count_documents({"approvalStatus": "approved", "status": "solved", "isHidden": {"$ne": True}}),
        "rejected": issues_col.count_documents({"approvalStatus": "rejected", "isHidden": {"$ne": True}})
        + events_col.count_documents({"approvalStatus": "rejected"}),
    }


@router.get("/queue")
def admin_queue(
    status: Optional[str] = None,
    category: Optional[str] = None,
    urgency: Optional[str] = None,
    area: Optional[str] = None,
    search: Optional[str] = None,
    sort: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    type: str = Query("all"),
    _auth_user: dict = Depends(admin_only),
):
    query: dict = {"isHidden": {"$ne": True}}
    if status:
        if status == "pending_review":
            query["approvalStatus"] = "pending_review"
        elif status == "all_approved":
            query["approvalStatus"] = "approved"
        elif status == "rejected":
            query["approvalStatus"] = "rejected"
        else:
            query["approvalStatus"] = "approved"
            query["status"] = status
    if category:
        query["category"] = category
    if urgency:
        query["urgency"] = urgency
    if area:
        query["area"] = area
    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}},
        ]

    issues = list(get_collection("issues").find(query).sort("submittedAt", -1))
    for i in issues:
        i["priorityScore"] = _priority_score(i)

    if sort == "priority":
        issues.sort(key=lambda x: x.get("priorityScore", 0), reverse=True)
    elif sort == "upvotes":
        issues.sort(key=lambda x: len(x.get("upvotes") or []), reverse=True)

    total_count = len(issues)
    skip = (page - 1) * limit
    paginated = issues[skip : skip + limit]

    if type in ("all", "events"):
        ev_query: dict = {}
        if status == "pending_review":
            ev_query["approvalStatus"] = "pending_review"
        elif status == "all_approved":
            ev_query["approvalStatus"] = "approved"
        elif status == "rejected":
            ev_query["approvalStatus"] = "rejected"
        elif status:
            ev_query["approvalStatus"] = "approved"
            ev_query["status"] = status
        events = list(get_collection("cleanupevents").find(ev_query))
        for e in events:
            e["_type"] = "cleanup_event"
            e["images"] = e.get("coverImages") or []
            e["area"] = (e.get("location") or {}).get("area") or (e.get("location") or {}).get("address") or "Unknown Area"
            e["submittedBy"] = e.get("organizer")
            e["submittedAt"] = e.get("createdAt") or e.get("eventDate")
            e["category"] = "Community Drive"
            paginated.append(e)

    return serialize_mongo({
        "issues": paginated,
        "currentPage": page,
        "totalPages": max(1, -(-total_count // limit)),
        "totalCount": total_count,
    })


@router.patch("/issues/{issue_id}/approve")
def admin_approve_issue(issue_id: str, auth_user: dict = Depends(admin_only)):
    oid = to_oid(issue_id, "issue ID")
    col = get_collection("issues")
    issue = col.find_one({"_id": oid})
    if not issue:
        raise HTTPException(404, "Not found")
    now = utcnow()
    col.update_one(
        {"_id": oid},
        {"$set": {"approvalStatus": "approved", "status": "open", "approvedAt": now, "approvedBy": auth_user["email"]}},
    )
    create_feed_event("new_issue", {"issueId": str(oid), "title": issue.get("title"), "area": issue.get("area"), "category": issue.get("category")})
    sub = issue.get("submittedBy") or {}
    if sub.get("email"):
        add_points(sub["email"], "issue_reported")
        create_notification(sub.get("userId"), sub["email"], "Your issue is now live and visible to the community!", "approval", f"/issues/{issue_id}")
    drop_cache("issues:")
    return {"success": True}


@router.patch("/issues/{issue_id}/reject")
def admin_reject_issue(issue_id: str, payload: dict = Body(...), auth_user: dict = Depends(admin_only)):
    reason = (payload.get("reason") or "").strip()
    if not reason:
        raise HTTPException(400, "Reason required")
    oid = to_oid(issue_id, "issue ID")
    col = get_collection("issues")
    issue = col.find_one({"_id": oid})
    if not issue:
        raise HTTPException(404, "Not found")
    col.update_one(
        {"_id": oid},
        {"$set": {"approvalStatus": "rejected", "status": "rejected", "rejectedAt": utcnow(), "rejectedBy": auth_user["email"], "rejectReason": reason}},
    )
    sub = issue.get("submittedBy") or {}
    if sub.get("email"):
        create_notification(sub.get("userId"), sub["email"], f"Your issue was rejected by an admin. Reason: {reason}", "rejection", "/issues/my")
    drop_cache("issues:")
    return {"success": True}


@router.patch("/issues/{issue_id}/status")
def admin_change_issue_status(issue_id: str, payload: dict = Body(...), auth_user: dict = Depends(admin_only)):
    oid = to_oid(issue_id, "issue ID")
    status = payload.get("status")
    get_collection("issues").update_one(
        {"_id": oid},
        {"$set": {"status": status, "statusChangedAt": utcnow(), "statusChangedBy": auth_user["email"]}},
    )
    drop_cache("issues:")
    return {"success": True}


@router.get("/issues/{issue_id}/reveal-identity")
def admin_reveal_identity(issue_id: str, auth_user: dict = Depends(admin_only)):
    oid = to_oid(issue_id, "issue ID")
    col = get_collection("issues")
    issue = col.find_one({"_id": oid})
    if not issue:
        raise HTTPException(404, "Not found")
    col.update_one({"_id": oid}, {"$push": {"identityRevealLog": {"revealedBy": auth_user["email"], "revealedAt": utcnow()}}})
    return serialize_mongo(issue.get("submittedBy") or {})


@router.patch("/issues/{issue_id}/assign")
def admin_assign_issue(issue_id: str, payload: dict = Body(...), _auth_user: dict = Depends(admin_only)):
    oid = to_oid(issue_id, "issue ID")
    col = get_collection("issues")
    issue = col.find_one({"_id": oid})
    if not issue:
        raise HTTPException(404, "Not found")
    assigned = {
        "email": payload.get("email"),
        "name": payload.get("name"),
        "type": payload.get("type") or "volunteer",
        "assignedAt": utcnow(),
    }
    updates: dict = {"assignedTo": assigned, "status": "action_taken"}
    if payload.get("adminNote"):
        updates["adminNotes"] = payload["adminNote"]
    col.update_one({"_id": oid}, {"$set": updates})
    sub = issue.get("submittedBy") or {}
    if sub.get("email"):
        create_notification(sub.get("userId"), sub["email"], f"Your issue has been assigned to {assigned['name']}!", "assignment", f"/issues/{issue_id}")
    if assigned.get("email"):
        create_notification(assigned["email"], assigned["email"], f"You have been assigned to an issue: {issue.get('title')}", "assignment", f"/issues/{issue_id}")
    drop_cache("issues:")
    return serialize_mongo({"success": True, "assignedTo": assigned})


@router.get("/forum")
def admin_list_forum(
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    _auth_user: dict = Depends(admin_only),
):
    col = get_collection("forum")
    query: dict = {}
    if category:
        query["category"] = category
    if search:
        query["title"] = {"$regex": search, "$options": "i"}
    threads = list(col.find(query, {"replies": 0}).sort([("isPinned", -1), ("date", -1)]).skip((page - 1) * limit).limit(limit))
    return serialize_mongo({"threads": threads, "total": col.count_documents(query)})


@router.patch("/forum/{thread_id}/pin")
def admin_pin_forum_thread(thread_id: str, _auth_user: dict = Depends(admin_only)):
    oid = to_oid(thread_id, "thread ID")
    col = get_collection("forum")
    thread = col.find_one({"_id": oid})
    if not thread:
        raise HTTPException(404, "Thread not found")
    new_pin = not bool(thread.get("isPinned"))
    col.update_one({"_id": oid}, {"$set": {"isPinned": new_pin}})
    return {"success": True, "isPinned": new_pin}


@router.patch("/forum/{thread_id}/lock")
def admin_lock_forum_thread(thread_id: str, _auth_user: dict = Depends(admin_only)):
    oid = to_oid(thread_id, "thread ID")
    col = get_collection("forum")
    thread = col.find_one({"_id": oid})
    if not thread:
        raise HTTPException(404, "Thread not found")
    new_lock = not bool(thread.get("isLocked"))
    col.update_one({"_id": oid}, {"$set": {"isLocked": new_lock}})
    return {"success": True, "isLocked": new_lock}


@router.delete("/forum/{thread_id}")
def admin_delete_forum_thread(thread_id: str, _auth_user: dict = Depends(admin_only)):
    oid = to_oid(thread_id, "thread ID")
    get_collection("forum").delete_one({"_id": oid})
    return {"success": True}


@router.get("/ngos")
def admin_list_ngos(status: Optional[str] = None, _auth_user: dict = Depends(admin_only)):
    query = {"status": status} if status else {}
    ngos = list(get_collection("ngos").find(query).sort("registeredAt", -1))
    return serialize_mongo({"ngos": ngos})


@router.patch("/ngos/{ngo_id}/verify")
def admin_verify_ngo(ngo_id: str, auth_user: dict = Depends(admin_only)):
    oid = to_oid(ngo_id, "NGO ID")
    col = get_collection("ngos")
    col.update_one({"_id": oid}, {"$set": {"status": "verified", "verifiedAt": utcnow(), "verifiedBy": auth_user["email"]}})
    ngo = col.find_one({"_id": oid}) or {}
    if ngo.get("email"):
        create_notification(ngo["email"], ngo["email"], f'🎉 Your NGO "{ngo.get("name")}" has been verified on CivicNest!', "admin_msg", "/ngos", "high")
    return {"success": True}


@router.patch("/ngos/{ngo_id}/reject")
def admin_reject_ngo(ngo_id: str, payload: Optional[dict] = None, auth_user: dict = Depends(admin_only)):
    oid = to_oid(ngo_id, "NGO ID")
    reason = (payload or {}).get("reason") or ""
    col = get_collection("ngos")
    ngo = col.find_one({"_id": oid}) or {}
    col.update_one({"_id": oid}, {"$set": {"status": "rejected", "rejectReason": reason, "rejectedBy": auth_user["email"]}})
    if ngo.get("email"):
        create_notification(ngo["email"], ngo["email"], f"Your NGO registration was not approved. Reason: {reason}", "admin_msg", "/ngos/register")
    return {"success": True}


@router.get("/animals/pending-rescues")
def admin_pending_animal_rescues(_auth_user: dict = Depends(admin_only)):
    items = list(get_collection("animals").find({"rescueVerificationStatus": "pending"}))
    return serialize_mongo(items)


@router.patch("/animals/{animal_id}/verify-rescue")
def admin_verify_animal_rescue(animal_id: str, payload: dict = Body(...), auth_user: dict = Depends(admin_or_mod)):
    oid = to_oid(animal_id, "animal ID")
    decision = payload.get("decision")
    rejection_reason = payload.get("rejectionReason") or "Proof insufficient."
    col = get_collection("animals")
    animal = col.find_one({"_id": oid})
    if not animal:
        raise HTTPException(404, "Not found.")

    if decision == "approved":
        col.update_one({"_id": oid}, {"$set": {"rescueVerificationStatus": "approved", "verifiedAt": utcnow(), "verifiedBy": auth_user["email"]}})
        rep_email = (animal.get("reporter") or {}).get("email")
        if rep_email:
            add_points(rep_email, "animal_rescued_reporter")
            create_notification(rep_email, rep_email, f"✅ Your {animal.get('animalType')} rescue has been verified! Points awarded.", "animal", f"/animals/{animal_id}", "high")
        for vol_email in ((animal.get("rescueProof") or {}).get("verifiedVolunteers") or []):
            add_points(vol_email, "animal_rescued_volunteer")
    elif decision == "rejected":
        col.update_one(
            {"_id": oid},
            {"$set": {"rescueVerificationStatus": "rejected", "status": "needs-help", "rescueRejectionReason": rejection_reason}},
        )
    return {"success": True}


@router.get("/donations")
def admin_list_donations(_auth_user: dict = Depends(admin_only)):
    items = list(get_collection("contributions").find().sort("date", -1))
    return serialize_mongo(items)

