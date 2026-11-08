"""MongoDB connection (shared `communityDB` used by the original Community app)."""
import pymongo

from .config import DB_NAME, MONGODB_URI

if not MONGODB_URI:
    raise RuntimeError("MONGODB_URI is not set. Copy backend/.env.example to backend/.env and fill it in.")

client = pymongo.MongoClient(
    MONGODB_URI,
    maxPoolSize=50,
    maxIdleTimeMS=45000,
    connectTimeoutMS=5000,
    socketTimeoutMS=15000,
    serverSelectionTimeoutMS=8000,
    retryWrites=True,
    retryReads=True,
    appname="civicnest-fastapi",
)
db = client[DB_NAME]


def get_db():
    return db


def get_collection(name: str):
    return db[name]
