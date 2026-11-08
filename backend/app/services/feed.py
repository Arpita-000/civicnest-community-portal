"""Activity feed events shown in the home page 'Live Pulse' + 'Recent Activity'."""
from ..database import get_collection
from ..utils import utcnow


def create_feed_event(event_type: str, data: dict) -> None:
    try:
        get_collection("feed_events").insert_one({"type": event_type, "data": data, "createdAt": utcnow()})
    except Exception as exc:  # the feed must never break the action that triggered it
        print(f"[feed] failed to store {event_type}: {exc}")
