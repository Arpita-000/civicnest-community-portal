"""Notification and audit log helpers (port of notificationHelper.js + auditHelper.js)."""
from typing import Any, Optional

from ..database import get_collection
from ..utils import utcnow


def create_notification(
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    message: str = "",
    notif_type: str = "info",
    link: str = "/",
    priority: str = "normal",
) -> None:
    target = email or user_id
    if not target or not message:
        return
    try:
        get_collection("notifications").insert_one(
            {
                "userId": user_id or email,
                "email": email or user_id,
                "message": message,
                "type": notif_type,
                "link": link,
                "priority": priority,
                "isRead": False,
                "read": False,
                "createdAt": utcnow(),
            }
        )
    except Exception as exc:
        print(f"[notifications] failed to insert notification: {exc}")


def log_audit(
    action: str,
    target_type: str,
    target_id: Any,
    performed_by: Any,
    note: str = "",
    old_value: Any = None,
    new_value: Any = None,
) -> None:
    try:
        get_collection("auditlogs").insert_one(
            {
                "action": action,
                "targetType": target_type,
                "targetId": str(target_id),
                "performedBy": performed_by,
                "note": note,
                "oldValue": old_value,
                "newValue": new_value,
                "createdAt": utcnow(),
            }
        )
    except Exception as exc:
        print(f"[audit] failed to log audit {action}: {exc}")

