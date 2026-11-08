"""Central runtime configuration, read once from the environment (.env in dev)."""
import json
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI") or os.getenv("DATABASE_URL") or ""
DB_NAME = os.getenv("DB_NAME", "communityDB")
PORT = int(os.getenv("PORT", "8000"))

# Comma separated list of allowed browser origins. "*" is only for local hacking.
CORS_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,http://localhost:5173",
    ).split(",")
    if o.strip()
]

# Firebase Admin credentials: raw JSON in an env var (Render) or a file path (local).
FIREBASE_CREDENTIALS_JSON = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
_default_fb_path = str(BASE_DIR / "firebase-credentials.json")
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv(
    "FIREBASE_SERVICE_ACCOUNT_PATH", _default_fb_path
)
if not os.path.isabs(FIREBASE_SERVICE_ACCOUNT_PATH) and not os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
    FIREBASE_SERVICE_ACCOUNT_PATH = _default_fb_path

# Where uploaded images are written and the public base URL they are served from.
UPLOAD_DIR = os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads"))
PUBLIC_API_URL = os.getenv("PUBLIC_API_URL", "")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
PAYMENT_GATEWAY_KEY = os.getenv("PAYMENT_GATEWAY_KEY", "")
SSL_STORE_ID = os.getenv("SSL_STORE_ID", "")
SSL_STORE_PASSWD = os.getenv("SSL_STORE_PASSWD", "")
SSL_IS_LIVE = os.getenv("SSL_IS_LIVE", "false").lower() == "true"
CLIENT_BASE_URL = os.getenv("CLIENT_BASE_URL", "http://localhost:3000").rstrip("/")


def firebase_credentials_dict() -> dict | None:
    if FIREBASE_CREDENTIALS_JSON.strip():
        return json.loads(FIREBASE_CREDENTIALS_JSON)
    if os.path.exists(FIREBASE_SERVICE_ACCOUNT_PATH):
        with open(FIREBASE_SERVICE_ACCOUNT_PATH, encoding="utf-8") as fh:
            return json.load(fh)
    return None
