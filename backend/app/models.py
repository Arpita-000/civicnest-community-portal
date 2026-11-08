"""Business rules shared with the original Node server (points, credits, status enums).

The database is MongoDB so there are no ORM models; this module only holds the
constants that define how documents behave.
"""

POINTS_MAP = {
    "issue_reported": 10,
    "issue_claimed": 5,
    "issue_solved": 50,
    "issue_reporter_bonus": 25,
    "issue_verified": 5,
    "issue_verified_onsite": 7,
    "event_attended": 30,
    "event_organized": 50,
    "contribution_made": 15,
    "witness_added": 5,
    "drive_created": 5,
    "streak_milestone": 25,
    "first_issue": 20,
    "first_event": 20,
    "membership_approved": 25,
    "volunteer_registered": 10,
    "animal_rescued_reporter": 50,
    "animal_rescued_volunteer": 30,
    "lostfound_action_taken": 5,
    "lostfound_reunited": 20,
}

VOLUNTEER_MULTIPLIER_EVENTS = {
    "issue_reported",
    "issue_claimed",
    "issue_solved",
    "issue_verified",
    "issue_verified_onsite",
    "event_attended",
    "contribution_made",
    "witness_added",
    "animal_rescued_volunteer",
}

# Rolling 72h posting credits per role (same table as the Node `creditCheck` middleware).
CREDIT_LIMITS = {
    "issues": {"guest": 1, "member": 3, "volunteer": 5},
    "lostFound": {"guest": 1, "member": 3, "volunteer": 4},
    "animals": {"guest": 0, "member": 3, "volunteer": 5},
    "forum": {"guest": 0, "member": 5, "volunteer": 8},
    "cleanupEvents": {"guest": 0, "member": 1, "volunteer": 2},
}

# collection / owner-email field / date field used to count recent posts
CREDIT_CONFIG = {
    "issues": ("issues", "submittedBy.email", "submittedAt"),
    "lostFound": ("lostFound", "reporter.email", "date"),
    "animals": ("animals", "reporter.email", "date"),
    "forum": ("forum", "author", "createdAt"),
    "cleanupEvents": ("cleanupevents", "organizer.email", "createdAt"),
}
CREDIT_WINDOW_HOURS = 72

STALE_DAYS = {"emergency": 2, "high": 7, "medium": 14, "low": 21}

POLL_TYPES = ("single", "multiple", "yesno", "survey")
POLL_STATUSES = ("active", "ended", "archived", "pending")
