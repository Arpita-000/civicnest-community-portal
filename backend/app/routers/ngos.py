"""NGO Directory & Registration (`routes/ngos.js`)."""
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query

from ..auth import admin_only, verify_token
from ..database import get_collection
from ..services.feed import create_feed_event
from ..utils import serialize_mongo, to_oid, utcnow

router = APIRouter(prefix="/ngos", tags=["NGOs"])


@router.get("/stats")
def ngo_stats():
    col = get_collection("ngos")
    return {
        "total": col.count_documents({}),
        "verified": col.count_documents({"status": "verified"}),
    }


@router.post("/donate")
def donate_to_ngo(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    ngo_id = payload.get("ngoId")
    amount = float(payload.get("amount") or 0)
    oid = to_oid(ngo_id, "NGO ID")
    col = get_collection("ngos")
    ngo = col.find_one({"_id": oid})
    if not ngo:
        raise HTTPException(404, "NGO not found")

    supporter_name = auth_user["name"] or auth_user["email"].split("@")[0]
    col.update_one(
        {"_id": oid},
        {
            "$push": {
                "donations": {
                    "supporterEmail": auth_user["email"],
                    "supporterName": supporter_name,
                    "amount": amount,
                    "message": payload.get("message") or "Support this organization",
                    "date": utcnow(),
                }
            },
            "$inc": {"totalSupporters": 1, "totalDonations": amount},
        },
    )
    get_collection("users").update_one({"email": auth_user["email"]}, {"$inc": {"points": 5}})
    create_feed_event("donation_made", {"amount": amount, "title": ngo.get("name") or "NGO Partner", "donor": supporter_name})
    return {"success": True, "message": "Support recorded successfully"}


@router.get("")
@router.get("/")
def list_ngos(serviceType: Optional[str] = None, limit: Optional[int] = Query(None, ge=1, le=100)):
    query: dict = {"status": "verified"}
    if serviceType:
        query["serviceTypes"] = {"$in": [serviceType]}
    cursor = get_collection("ngos").find(query).sort("joinedAt", -1)
    if limit:
        cursor = cursor.limit(limit)
    return serialize_mongo(list(cursor))


@router.get("/pending")
def list_pending_ngos(_auth_user: dict = Depends(admin_only)):
    items = list(get_collection("ngos").find({"status": "pending"}).sort("joinedAt", -1))
    return serialize_mongo(items)


@router.get("/{ngo_id}")
def get_ngo(ngo_id: str):
    ngo = get_collection("ngos").find_one({"_id": to_oid(ngo_id, "NGO ID")})
    if not ngo:
        raise HTTPException(404, "NGO not found")
    return serialize_mongo(ngo)


@router.post("", status_code=201)
@router.post("/", status_code=201)
def register_ngo(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    doc = {
        **payload,
        "registrarEmail": auth_user["email"],
        "email": payload.get("email") or auth_user["email"],
        "status": "pending",
        "joinedAt": utcnow(),
        "registeredAt": utcnow(),
    }
    res = get_collection("ngos").insert_one(doc)
    return serialize_mongo({"insertedId": res.inserted_id, "acknowledged": True})


@router.patch("/{ngo_id}/approve")
def approve_ngo(ngo_id: str, _auth_user: dict = Depends(admin_only)):
    oid = to_oid(ngo_id, "NGO ID")
    col = get_collection("ngos")
    ngo = col.find_one({"_id": oid})
    res = col.update_one({"_id": oid}, {"$set": {"status": "verified"}})
    if res.modified_count and ngo:
        create_feed_event("ngo_partnership", {"ngoName": ngo.get("name") or "NGO Partner", "area": ngo.get("area") or "City Wide"})
    return {"modifiedCount": res.modified_count, "acknowledged": True}

