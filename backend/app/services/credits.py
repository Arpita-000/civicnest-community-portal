"""Rolling 72-hour posting credits - port of creditCheck.js + routes/credits.js."""
from datetime import timedelta
from typing import Optional

from ..database import get_collection
from ..models import CREDIT_CONFIG, CREDIT_LIMITS, CREDIT_WINDOW_HOURS
from ..utils import utcnow


def credit_status(email: str, post_type: str, user: Optional[dict]) -> dict:
    """Return {limit, used, remaining, resetAt, hoursLeft, minutesLeft} for a user + content type."""
    if user and user.get("role") == "admin":
        return {"limit": None, "used": 0, "remaining": None, "isAdmin": True}

    role = "volunteer" if (user or {}).get("isVolunteer") else (user or {}).get("role", "guest")
    limit = CREDIT_LIMITS.get(post_type, {}).get(role, 0)
    if (user or {}).get("points", 0) >= 500 and post_type in ("issues", "lostFound"):
        limit += 1

    collection, email_field, date_field = CREDIT_CONFIG[post_type]
    window = timedelta(hours=CREDIT_WINDOW_HOURS)
    query = {
        email_field: email,
        date_field: {"$gte": utcnow() - window},
        "approvalStatus": {"$ne": "rejected"},
    }
    col = get_collection(collection)
    used = col.count_documents(query)

    reset_at = hours_left = minutes_left = None
    if used:
        oldest = col.find_one(query, {date_field: 1}, sort=[(date_field, 1)])
        # nested field names ("a.b") never appear in the projection result, so read the root date field
        root = date_field.split(".")[0]
        if oldest and oldest.get(root):
            reset_at = oldest[root] + window
            diff = (reset_at - utcnow()).total_seconds()
            hours_left = max(0, int(diff // 3600))
            minutes_left = max(0, int(-(-(diff % 3600) // 60)))

    return {
        "limit": limit,
        "used": used,
        "remaining": max(0, limit - used),
        "resetAt": reset_at,
        "hoursLeft": hours_left,
        "minutesLeft": minutes_left,
    }
