"""`GET /credits/{type}` - rolling 72h posting credits shown on the Add Issue page."""
from fastapi import APIRouter, Depends, HTTPException

from ..auth import verify_token
from ..models import CREDIT_LIMITS
from ..services.credits import credit_status
from ..utils import serialize_mongo

router = APIRouter(prefix="/credits", tags=["Credits"])


@router.get("/{post_type}")
def get_credits(post_type: str, auth_user: dict = Depends(verify_token)):
    if post_type not in CREDIT_LIMITS:
        raise HTTPException(400, "Invalid type.")
    user = {**(auth_user["dbUser"] or {}), "role": auth_user["role"], "isVolunteer": auth_user["isVolunteer"], "points": auth_user["points"]}
    return serialize_mongo(credit_status(auth_user["email"], post_type, user))
