"""Points, badges and daily streak - port of pointsHelper.js / streakHelper.js."""
from datetime import timedelta

from ..database import get_collection
from ..models import POINTS_MAP, VOLUNTEER_MULTIPLIER_EVENTS
from ..utils import utcnow

BADGE_THRESHOLDS = {"civic_hero": 500, "guardian": 1000, "champion": 2500}


def add_points(email: str, event_key: str) -> int:
    """Award points for an event. Volunteers earn 2x on qualifying events. Returns points added."""
    base = POINTS_MAP.get(event_key)
    if not email or not base:
        return 0

    users = get_collection("users")
    user = users.find_one({"email": email}, {"isVolunteer": 1, "role": 1, "badges": 1, "points": 1})
    if not user:
        return 0

    multiplier = 1
    if user.get("isVolunteer") and event_key in VOLUNTEER_MULTIPLIER_EVENTS:
        multiplier = 2
    if event_key == "volunteer_registered" and user.get("role") in ("member", "admin"):
        multiplier = 2
    to_add = base * multiplier

    new_total = (user.get("points") or 0) + to_add
    users.update_one({"email": email}, {"$inc": {"points": to_add}})

    have = set(user.get("badges") or [])
    unlocked = [b for b, need in BADGE_THRESHOLDS.items() if new_total >= need and b not in have]
    if unlocked:
        users.update_one({"email": email}, {"$addToSet": {"badges": {"$each": unlocked}}})
    return to_add


def update_streak(email: str) -> None:
    """Count one active day; consecutive days extend the streak, a gap resets it to 1."""
    if not email:
        return
    users = get_collection("users")
    user = users.find_one({"email": email}, {"streak": 1})
    if not user:
        return

    streak = user.get("streak") or {}
    now = utcnow()
    last = streak.get("lastActiveDate")
    if last and last.date() == now.date():
        return

    current = streak.get("current", 0) + 1 if last and last.date() == (now - timedelta(days=1)).date() else 1
    best = max(current, streak.get("best", 0))
    users.update_one(
        {"email": email},
        {"$set": {"streak.current": current, "streak.best": best, "streak.lastActiveDate": now}},
    )
    if current in (7, 30, 100):
        add_points(email, "streak_milestone")
