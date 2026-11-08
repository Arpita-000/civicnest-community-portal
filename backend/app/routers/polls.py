"""Community polls (same contract as the Node `routes/polls.js`, minus the voter-email leak)."""
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from ..auth import get_optional_user, member_only, verify_token
from ..database import get_collection
from ..schemas import PollCreate, VoteRequest
from ..services.feed import create_feed_event
from ..utils import serialize_mongo, to_oid, ttl_cached, drop_cache, utcnow

router = APIRouter(prefix="/polls", tags=["Polls"])

MAX_VOTE_CHANGES = 2


def _active_filter(now) -> dict:
    return {"status": "active", "$or": [{"endsAt": None}, {"endsAt": {"$gt": now}}]}


def _public(poll: dict, email: Optional[str]) -> dict:
    """Strip voter identities and expose only the caller's own vote."""
    mine = next((v for v in poll.get("voterVotes", []) if v.get("email") == email), None) if email else None
    out = {k: v for k, v in poll.items() if k not in ("voters", "voterVotes")}
    out["voterCount"] = len(poll.get("voterVotes", []))
    out["hasVoted"] = mine is not None
    out["myVote"] = {"optionIds": mine.get("optionIds", []), "changeCount": mine.get("changeCount", 0)} if mine else None
    if poll.get("endsAt") and poll["endsAt"] <= utcnow() and poll.get("status") == "active":
        out["status"] = "ended"
    return serialize_mongo(out)


@router.get("/stats")
def polls_stats():
    def build():
        col = get_collection("polls")
        now = utcnow()
        agg = list(col.aggregate([{"$match": _active_filter(now)}, {"$group": {"_id": None, "total": {"$sum": "$totalVotes"}}}]))
        return {
            "active": col.count_documents(_active_filter(now)),
            "total": col.count_documents({"status": {"$ne": "pending"}}),
            "totalVotes": agg[0]["total"] if agg else 0,
        }

    return ttl_cached("polls:stats", 5, build)


@router.get("")
@router.get("/")
def list_polls(
    status: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    auth_user: Optional[dict] = Depends(get_optional_user),
):
    import re

    now = utcnow()
    email = auth_user["email"] if auth_user else None
    is_admin = bool(auth_user) and auth_user["role"] == "admin"

    clauses: list[dict] = []
    if status == "active":
        clauses.append(_active_filter(now))
    elif status == "ended":
        clauses.append({"$or": [{"status": "ended"}, {"endsAt": {"$lte": now}}]})
    elif status == "pending":
        # admins see every pending poll, everyone else only their own
        clauses.append({"status": "pending"} if is_admin else {"status": "pending", "createdBy": email or ""})
    elif status:
        clauses.append({"status": status})
    else:
        if not is_admin:
            clauses.append({"$or": [{"status": {"$ne": "pending"}}, {"createdBy": email or ""}]})

    if category:
        clauses.append({"category": {"$regex": f"^{re.escape(category)}$", "$options": "i"}})
    if search:
        clauses.append({"question": {"$regex": re.escape(search), "$options": "i"}})

    query = {"$and": clauses} if clauses else {}
    polls = get_collection("polls").find(query).sort("createdAt", -1)
    return [_public(p, email) for p in polls]


@router.get("/{poll_id}")
def get_poll(poll_id: str, auth_user: Optional[dict] = Depends(get_optional_user)):
    poll = get_collection("polls").find_one({"_id": to_oid(poll_id, "poll ID")})
    if not poll:
        raise HTTPException(404, "Poll not found")
    return _public(poll, auth_user["email"] if auth_user else None)


@router.post("", status_code=201)
@router.post("/", status_code=201)
def create_poll(payload: PollCreate, auth_user: dict = Depends(member_only)):
    if payload.type not in ("single", "multiple", "yesno", "survey"):
        raise HTTPException(400, "Invalid poll type")
    texts = [o.text.strip() for o in payload.options if o.text.strip()]
    if len(texts) < 2:
        raise HTTPException(400, "Question, type, and at least 2 options are required")
    if payload.type == "yesno" and sorted(t.lower() for t in texts) != ["no", "yes"]:
        raise HTTPException(400, 'Yes/No polls must have exactly "Yes" and "No" options')

    is_admin = auth_user["role"] == "admin"
    status = "active" if is_admin else "pending"
    poll = {
        "question": payload.question.strip(),
        "type": payload.type,
        "options": [{"id": str(ObjectId()), "text": t, "votes": 0, "order": i} for i, t in enumerate(texts)],
        "category": payload.category.lower(),
        "createdBy": auth_user["email"],
        "createdAt": utcnow(),
        "endsAt": payload.endsAt.replace(tzinfo=None) if payload.endsAt else None,
        "status": status,
        "totalVotes": 0,
        "voters": [],
        "voterVotes": [],
        "allowAnonymous": payload.allowAnonymous,
    }
    poll_id = get_collection("polls").insert_one(poll).inserted_id
    if is_admin:
        get_collection("users").update_one({"email": auth_user["email"]}, {"$inc": {"points": 10}})
        create_feed_event(
            "poll_created",
            {"pollId": str(poll_id), "question": poll["question"], "category": poll["category"], "link": f"/polls/{poll_id}", "actorName": auth_user["name"] or auth_user["email"]},
        )
    drop_cache("polls:")
    return {"success": True, "pollId": str(poll_id), "status": status}


@router.post("/{poll_id}/vote")
def vote(poll_id: str, payload: VoteRequest, auth_user: dict = Depends(member_only)):
    col = get_collection("polls")
    oid = to_oid(poll_id, "poll ID")
    poll = col.find_one({"_id": oid})
    if not poll:
        raise HTTPException(404, "Poll not found")
    if poll.get("status") != "active" or (poll.get("endsAt") and poll["endsAt"] < utcnow()):
        raise HTTPException(400, "This poll has ended")

    option_ids = list(dict.fromkeys(payload.optionIds))  # de-duplicate, keep order
    valid = {o["id"] for o in poll["options"]}
    if any(i not in valid for i in option_ids):
        raise HTTPException(400, "Invalid option IDs")
    if poll["type"] != "multiple" and len(option_ids) > 1:
        raise HTTPException(400, "Single choice polls allow only one option")

    email = auth_user["email"]
    record = next((v for v in poll.get("voterVotes", []) if v.get("email") == email), None)

    if record:
        if poll.get("endsAt"):
            raise HTTPException(400, "You cannot change your vote in a timed poll")
        if record.get("changeCount", 0) >= MAX_VOTE_CHANGES:
            raise HTTPException(400, f"You have already changed your vote the maximum number of times ({MAX_VOTE_CHANGES} times)")
        previous = set(record.get("optionIds", []))
    else:
        previous = set()

    for opt in poll["options"]:
        if opt["id"] in previous:
            opt["votes"] = max(0, opt.get("votes", 0) - 1)
        if opt["id"] in option_ids:
            opt["votes"] = opt.get("votes", 0) + 1
    total = sum(o.get("votes", 0) for o in poll["options"])

    if record:
        res = col.update_one(
            {"_id": oid, "voterVotes.email": email},
            {"$set": {"options": poll["options"], "totalVotes": total, "voterVotes.$.optionIds": option_ids, "voterVotes.$.changeCount": record.get("changeCount", 0) + 1}},
        )
        change_count = record.get("changeCount", 0) + 1
    else:
        # `voters.$ne` guard makes a double click / race a no-op instead of a double vote
        res = col.update_one(
            {"_id": oid, "voters": {"$ne": email}},
            {
                "$set": {"options": poll["options"], "totalVotes": total},
                "$push": {"voters": email, "voterVotes": {"email": email, "optionIds": option_ids, "changeCount": 0}},
            },
        )
        change_count = 0
        if res.modified_count:
            get_collection("users").update_one({"email": email}, {"$inc": {"points": 2}})
    if not res.matched_count:
        raise HTTPException(409, "Your vote could not be recorded, please try again")

    drop_cache("polls:")
    fresh = col.find_one({"_id": oid})
    return {"success": True, "changeCount": change_count, "poll": _public(fresh, email)}


@router.patch("/{poll_id}")
def update_poll(poll_id: str, body: dict, auth_user: dict = Depends(verify_token)):
    col = get_collection("polls")
    poll = col.find_one({"_id": to_oid(poll_id, "poll ID")})
    if not poll:
        raise HTTPException(404, "Poll not found")
    if poll.get("createdBy") != auth_user["email"]:
        raise HTTPException(403, "Only the creator can update this poll")
    status = body.get("status")
    if status not in (None, "active", "ended", "archived"):
        raise HTTPException(400, "Invalid status")
    update = {}
    if status:
        update["status"] = status
    if status == "ended":
        update["endedAt"] = utcnow()
        create_feed_event("poll_ended", {"pollId": poll_id, "question": poll["question"], "totalVotes": poll.get("totalVotes", 0), "link": f"/polls/{poll_id}"})
    if update:
        col.update_one({"_id": poll["_id"]}, {"$set": update})
    drop_cache("polls:")
    return {"success": True}


@router.patch("/{poll_id}/approve")
def approve_poll(poll_id: str, auth_user: dict = Depends(verify_token)):
    if auth_user["role"] != "admin":
        raise HTTPException(403, "Access denied: Only admins can approve polls")
    col = get_collection("polls")
    poll = col.find_one({"_id": to_oid(poll_id, "poll ID")})
    if not poll:
        raise HTTPException(404, "Poll not found")
    col.update_one({"_id": poll["_id"]}, {"$set": {"status": "active", "approvedAt": utcnow()}})
    if poll.get("createdBy"):
        get_collection("users").update_one({"email": poll["createdBy"]}, {"$inc": {"points": 10}})
    create_feed_event(
        "poll_created",
        {"pollId": poll_id, "question": poll["question"], "category": poll.get("category"), "link": f"/polls/{poll_id}", "actorName": (poll.get("createdBy") or "").split("@")[0]},
    )
    drop_cache("polls:")
    return {"success": True, "status": "active"}


@router.delete("/{poll_id}")
def delete_poll(poll_id: str, auth_user: dict = Depends(verify_token)):
    col = get_collection("polls")
    poll = col.find_one({"_id": to_oid(poll_id, "poll ID")})
    if not poll:
        raise HTTPException(404, "Poll not found")
    if poll.get("createdBy") != auth_user["email"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Only the creator or admin can delete this poll")
    col.delete_one({"_id": poll["_id"]})
    drop_cache("polls:")
    return {"success": True}
