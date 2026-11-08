"""Firebase ID-token verification (the `beautify-auth` project) + role helpers."""
from typing import Optional

import firebase_admin
from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as fb_auth
from firebase_admin import credentials

from .config import firebase_credentials_dict
from .database import get_collection


def _init_firebase() -> None:
    if firebase_admin._apps:
        return
    data = firebase_credentials_dict()
    if not data:
        print("[Firebase Admin] No credentials found - authenticated routes will return 401.")
        return
    firebase_admin.initialize_app(credentials.Certificate(data))
    print("[Firebase Admin] Initialized.")


_init_firebase()


def _decode(authorization: Optional[str]) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No authorization token provided")
    token = authorization.split("Bearer ", 1)[1].strip()
    if not firebase_admin._apps:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Authentication is not configured on the server")
    try:
        # clock_skew_seconds absorbs small drift between this host and Google (very common on Windows dev boxes)
        decoded = fb_auth.verify_id_token(token, clock_skew_seconds=30)
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")

    email = (decoded.get("email") or "").lower().strip()
    uid = decoded.get("uid")
    user = None
    if email or uid:
        import re
        users_col = get_collection("users")
        projection = {"role": 1, "isVolunteer": 1, "points": 1, "name": 1, "photoURL": 1, "memberId": 1, "email": 1, "uid": 1}
        if email:
            user = users_col.find_one({"email": email}, projection)
            if not user:
                user = users_col.find_one(
                    {"email": {"$regex": f"^{re.escape(email)}$", "$options": "i"}},
                    projection,
                )
        if not user and uid:
            user = users_col.find_one({"uid": uid}, projection)

    db_name = (user or {}).get("name")
    db_picture = (user or {}).get("photoURL")
    return {
        "uid": uid,
        "email": (user or {}).get("email") or email,
        "name": db_name or decoded.get("name") or "",
        "picture": db_picture or decoded.get("picture") or "",
        "role": (user or {}).get("role", "guest"),
        "isVolunteer": bool((user or {}).get("isVolunteer", False)),
        "points": (user or {}).get("points", 0),
        "dbUser": user,
    }


def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    """Required auth. 401 when the Bearer token is missing / invalid."""
    return _decode(authorization)


def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[dict]:
    """Optional auth for public endpoints that personalise their response."""
    if not authorization:
        return None
    try:
        return _decode(authorization)
    except HTTPException:
        return None


def member_only(user: dict = Depends(verify_token)) -> dict:
    """Mirrors the original `memberOnly` middleware."""
    if user.get("role") in ("member", "admin") or user.get("isVolunteer"):
        return user
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Forbidden: Members only")


def admin_only(user: dict = Depends(verify_token)) -> dict:
    """Mirrors the original `adminOnly` middleware."""
    if user.get("role") == "admin":
        return user
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Forbidden: Admins only")


def admin_or_mod(user: dict = Depends(verify_token)) -> dict:
    """Mirrors the original `adminOrMod` middleware."""
    if user.get("role") in ("admin", "moderator"):
        return user
    raise HTTPException(status.HTTP_403_FORBIDDEN, "Forbidden: Admins or Moderators only")
