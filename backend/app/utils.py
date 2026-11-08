"""Small helpers shared by every router."""
import time
from datetime import datetime, timezone
from typing import Any, Callable

from bson import ObjectId
from fastapi import HTTPException


def utcnow() -> datetime:
    # Stored as naive UTC datetimes, exactly like the Mongoose models of the original app.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def serialize_mongo(obj: Any) -> Any:
    """Recursively turn ObjectId / datetime into JSON friendly strings."""
    if isinstance(obj, list):
        return [serialize_mongo(i) for i in obj]
    if isinstance(obj, dict):
        return {k: serialize_mongo(v) for k, v in obj.items()}
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat() + ("Z" if obj.tzinfo is None else "")
    return obj


def to_oid(value: str, label: str = "ID") -> ObjectId:
    if not ObjectId.is_valid(value or ""):
        raise HTTPException(status_code=400, detail=f"Invalid {label} format.")
    return ObjectId(value)


def clean_name(name: str | None, email: str | None) -> str | None:
    """'jamil.uddin@x.com' -> 'Jamil Uddin' when the stored name is itself an email."""
    if name and "@" not in name:
        return name
    if email:
        import re

        parts = re.split(r"[._-]", email.split("@")[0])
        return " ".join(p[:1].upper() + p[1:].lower() for p in parts if p)
    return None


_ttl_cache: dict[str, tuple[float, Any]] = {}


def ttl_cached(key: str, seconds: float, producer: Callable[[], Any]) -> Any:
    """Tiny in-process cache for expensive, read-mostly aggregates."""
    hit = _ttl_cache.get(key)
    now = time.monotonic()
    if hit and now - hit[0] < seconds:
        return hit[1]
    value = producer()
    _ttl_cache[key] = (now, value)
    return value


def drop_cache(prefix: str = "") -> None:
    for k in [k for k in _ttl_cache if k.startswith(prefix)]:
        _ttl_cache.pop(k, None)
