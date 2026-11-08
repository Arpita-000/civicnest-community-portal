"""Base64 image upload used by the Add Issue form (same `/upload` contract as the Node server)."""
import base64
import binascii
import os
import re
import time

from fastapi import APIRouter, Depends, HTTPException, Request

from ..auth import verify_token
from ..config import PUBLIC_API_URL, UPLOAD_DIR
from ..schemas import UploadIn

router = APIRouter(tags=["Uploads"])

ALLOWED = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_BYTES = 6 * 1024 * 1024
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload")
def upload_image(payload: UploadIn, request: Request, _user: dict = Depends(verify_token)):
    ext = os.path.splitext(payload.name)[1].lower()
    if ext not in ALLOWED:
        raise HTTPException(400, "Only JPG, PNG, WEBP or GIF images are allowed.")
    raw = payload.base64.split(",", 1)[-1]  # tolerate a data: URL prefix
    try:
        data = base64.b64decode(raw, validate=True)
    except (binascii.Error, ValueError):
        raise HTTPException(400, "Invalid image data.")
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Image is larger than 6MB.")

    safe = re.sub(r"[^a-zA-Z0-9.-]", "_", os.path.basename(payload.name))
    filename = f"{int(time.time() * 1000)}-{safe}"
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as fh:
        fh.write(data)

    base = (PUBLIC_API_URL or str(request.base_url)).rstrip("/")
    return {"success": True, "url": f"{base}/uploads/{filename}"}
