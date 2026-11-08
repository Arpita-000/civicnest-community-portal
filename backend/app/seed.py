"""Idempotent startup tasks: indexes + normalising legacy documents. Never inserts fake data."""
from datetime import datetime

from .database import get_collection, db


def ensure_indexes() -> None:
    issues, comments, polls, users, feed = (get_collection(n) for n in ("issues", "comments", "polls", "users", "feed_events"))
    issues.create_index([("approvalStatus", 1), ("isHidden", 1), ("submittedAt", -1)])
    issues.create_index([("submittedBy.userId", 1)])
    issues.create_index([("submittedBy.email", 1), ("submittedAt", -1)])  # credit window counts
    comments.create_index([("issueId", 1), ("createdAt", 1)])
    polls.create_index([("status", 1), ("createdAt", -1)])
    users.create_index([("email", 1)])
    users.create_index([("uid", 1)])
    users.create_index([("points", -1)])
    feed.create_index([("createdAt", -1)])
    db["cleanupevents"].create_index([("approvalStatus", 1), ("eventDate", 1)])


def normalise_legacy_polls() -> None:
    """First-iteration polls stored createdAt as an ISO string, which sorts after real dates."""
    polls = get_collection("polls")
    for poll in polls.find({"createdAt": {"$type": "string"}}, {"createdAt": 1}):
        try:
            created = datetime.fromisoformat(poll["createdAt"].replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError:
            continue
        polls.update_one({"_id": poll["_id"]}, {"$set": {"createdAt": created}})


def seed_database() -> None:
    ensure_indexes()
    normalise_legacy_polls()
