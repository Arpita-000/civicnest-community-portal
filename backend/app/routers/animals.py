"""Animals & Feeding Drives (`routes/animals.js` + `routes/feedingDrives.js`)."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from ..auth import verify_token
from ..database import get_collection
from ..services.credits import credit_status
from ..services.notifications import create_notification
from ..services.points import add_points
from ..utils import serialize_mongo, to_oid, utcnow

animals_router = APIRouter(prefix="/animals", tags=["Animals"])
feeding_drives_router = APIRouter(prefix="/feeding-drives", tags=["Feeding Drives"])


@animals_router.get("/stats")
def animal_stats():
    col = get_collection("animals")
    return {
        "total": col.count_documents({"approvalStatus": "approved"}),
        "rescued": col.count_documents({"status": "rescued"}),
        "inTreatment": col.count_documents({"status": "in-treatment"}),
        "urgent": col.count_documents({"urgency": {"$in": ["high", "emergency"]}, "status": "needs-help"}),
        "adoptable": col.count_documents({"status": "rescued", "adoptable": True}),
    }


@animals_router.get("")
@animals_router.get("/")
def list_animals(
    urgency: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    area: Optional[str] = None,
):
    query: dict = {"approvalStatus": "approved"}
    if urgency:
        query["urgency"] = urgency
    if status:
        query["status"] = status
    if type:
        query["animalType"] = type
    if area:
        query["$or"] = [
            {"area": {"$regex": area, "$options": "i"}},
            {"location": {"$regex": area, "$options": "i"}},
        ]
    items = list(get_collection("animals").find(query).sort("date", -1))
    return serialize_mongo(items)


@animals_router.get("/my")
def my_animals(auth_user: dict = Depends(verify_token)):
    email = auth_user["email"]
    query = {"$or": [{"reporter.email": email}, {"contactInfo": email}]}
    items = list(get_collection("animals").find(query).sort("date", -1))
    return serialize_mongo(items)


@animals_router.get("/{animal_id}")
def get_animal(animal_id: str):
    animal = get_collection("animals").find_one({"_id": to_oid(animal_id, "animal ID")})
    if not animal:
        raise HTTPException(404, "Animal not found.")
    return serialize_mongo(animal)


@animals_router.post("", status_code=201)
@animals_router.post("/", status_code=201)
def create_animal(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    user_for_credit = {**(auth_user["dbUser"] or {}), "role": auth_user["role"], "isVolunteer": auth_user["isVolunteer"], "points": auth_user["points"]}
    credit = credit_status(auth_user["email"], "animals", user_for_credit)
    if not credit.get("isAdmin") and credit.get("limit") == 0:
        raise HTTPException(403, {"message": "Only verified members can post animal rescue reports.", "code": "NO_CREDIT_FOR_ROLE"})
    if not credit.get("isAdmin") and credit.get("remaining") == 0:
        raise HTTPException(429, {"message": "You have reached your animal report limit for this 72h window.", "code": "CREDIT_LIMIT_REACHED"})

    doc = {
        **payload,
        "status": payload.get("status") or "needs-help",
        "approvalStatus": "approved",
        "reporter": {
            "email": auth_user["email"],
            "name": auth_user["name"] or auth_user["email"].split("@")[0],
            "photoURL": auth_user["picture"] or None,
        },
        "volunteers": [],
        "volunteerCount": 0,
        "adoptionRequests": [],
        "date": utcnow(),
    }
    res = get_collection("animals").insert_one(doc)
    return serialize_mongo({"insertedId": res.inserted_id, "acknowledged": True})


@animals_router.put("/{animal_id}")
def update_animal(animal_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    oid = to_oid(animal_id, "animal ID")
    col = get_collection("animals")
    animal = col.find_one({"_id": oid})
    if not animal:
        raise HTTPException(404, "Animal not found.")
    is_rep = (animal.get("reporter") or {}).get("email") == auth_user["email"] or animal.get("contactInfo") == auth_user["email"] or auth_user["role"] == "admin"
    if not is_rep:
        raise HTTPException(403, "Forbidden. You are not the reporter.")

    updates: dict = {"updatedAt": utcnow()}
    for k in ("animalType", "urgency", "condition", "location", "image", "contactInfo"):
        if k in payload:
            updates[k] = payload[k]
    if "date" in payload and payload["date"]:
        try:
            updates["date"] = datetime.fromisoformat(str(payload["date"]).replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            pass
    col.update_one({"_id": oid}, {"$set": updates})
    return {"success": True, "message": "Report updated successfully."}


@animals_router.delete("/{animal_id}")
def delete_animal(animal_id: str, auth_user: dict = Depends(verify_token)):
    oid = to_oid(animal_id, "animal ID")
    col = get_collection("animals")
    animal = col.find_one({"_id": oid})
    if not animal:
        raise HTTPException(404, "Animal not found.")
    is_rep = (animal.get("reporter") or {}).get("email") == auth_user["email"] or animal.get("contactInfo") == auth_user["email"] or auth_user["role"] == "admin"
    if not is_rep:
        raise HTTPException(403, "Forbidden. You are not the reporter.")
    col.delete_one({"_id": oid})
    return {"success": True, "message": "Report deleted successfully."}


@animals_router.post("/{animal_id}/volunteer")
def volunteer_for_animal(animal_id: str, auth_user: dict = Depends(verify_token)):
    oid = to_oid(animal_id, "animal ID")
    col = get_collection("animals")
    animal = col.find_one({"_id": oid})
    if not animal:
        raise HTTPException(404, "Not found.")
    volunteers = list(animal.get("volunteers") or [])
    user_email = auth_user["email"]
    already = any((v == user_email if isinstance(v, str) else (v or {}).get("email") == user_email) for v in volunteers)
    if already:
        volunteers = [v for v in volunteers if not (v == user_email if isinstance(v, str) else (v or {}).get("email") == user_email)]
    else:
        volunteers.append({
            "email": user_email,
            "name": auth_user["name"] or user_email.split("@")[0],
            "photoURL": auth_user["picture"] or None,
        })
    col.update_one({"_id": oid}, {"$set": {"volunteers": volunteers, "volunteerCount": len(volunteers)}})
    return {"volunteered": not already}


@animals_router.patch("/{animal_id}/status")
def update_animal_status(animal_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    status = payload.get("status")
    if status not in ("in-treatment", "rescued", "adopted", "needs-help"):
        raise HTTPException(400, "Invalid status.")
    oid = to_oid(animal_id, "animal ID")
    col = get_collection("animals")
    animal = col.find_one({"_id": oid})
    if not animal:
        raise HTTPException(404, "Animal not found.")
    is_rep = (animal.get("reporter") or {}).get("email") == auth_user["email"] or animal.get("contactInfo") == auth_user["email"] or auth_user["role"] == "admin"
    if not is_rep:
        raise HTTPException(403, "Only the reporter can update status.")

    updates: dict = {"status": status, "updatedAt": utcnow()}
    if status == "rescued":
        updates["rescueVerificationStatus"] = "pending"
        updates["rescueProof"] = {
            "imageUrl": payload.get("proofImageUrl") or None,
            "note": payload.get("note") or "",
            "verifiedVolunteers": payload.get("verifiedVolunteers") or [],
            "submittedAt": utcnow(),
        }
    else:
        updates["rescueVerificationStatus"] = None
    col.update_one({"_id": oid}, {"$set": updates})
    return {"success": True, "message": "Proof submitted. Awaiting admin verification." if status == "rescued" else "Status updated."}


@animals_router.patch("/{animal_id}/adoptable")
def toggle_animal_adoptable(animal_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    oid = to_oid(animal_id, "animal ID")
    col = get_collection("animals")
    animal = col.find_one({"_id": oid})
    if not animal:
        raise HTTPException(404, "Animal not found.")
    is_rep = (animal.get("reporter") or {}).get("email") == auth_user["email"] or animal.get("contactInfo") == auth_user["email"] or auth_user["role"] == "admin"
    if not is_rep:
        raise HTTPException(403, "Forbidden.")
    adoptable = bool(payload.get("adoptable"))
    col.update_one({"_id": oid}, {"$set": {"adoptable": adoptable, "updatedAt": utcnow()}})
    return {"success": True, "adoptable": adoptable}


@animals_router.post("/{animal_id}/adopt-request")
def request_animal_adoption(animal_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    oid = to_oid(animal_id, "animal ID")
    col = get_collection("animals")
    animal = col.find_one({"_id": oid})
    if not animal:
        raise HTTPException(404, "Animal not found.")
    entry = {
        "email": auth_user["email"],
        "name": auth_user["name"] or auth_user["email"].split("@")[0],
        "phone": payload.get("phone") or "",
        "message": payload.get("message") or "",
        "date": utcnow(),
    }
    col.update_one({"_id": oid}, {"$push": {"adoptionRequests": entry}})
    rep_email = (animal.get("reporter") or {}).get("email") or animal.get("contactInfo")
    if rep_email:
        create_notification(rep_email, rep_email, f'🎉 {entry["name"]} has requested to adopt the {animal.get("animalType") or "animal"} you reported!', "animal", f"/animals/{animal_id}")
    return {"success": True, "message": "Adoption request submitted."}


@animals_router.post("/{animal_id}/adopt-approve")
def approve_animal_adoption(animal_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    oid = to_oid(animal_id, "animal ID")
    col = get_collection("animals")
    animal = col.find_one({"_id": oid})
    if not animal:
        raise HTTPException(404, "Animal not found.")
    is_rep = (animal.get("reporter") or {}).get("email") == auth_user["email"] or animal.get("contactInfo") == auth_user["email"] or auth_user["role"] == "admin"
    if not is_rep:
        raise HTTPException(403, "Forbidden.")
    adopter_email = payload.get("adopterEmail")
    if not adopter_email:
        raise HTTPException(400, "Adopter email required.")
    col.update_one({"_id": oid}, {"$set": {"status": "adopted", "adoptedBy": adopter_email, "adoptable": False, "updatedAt": utcnow()}})
    get_collection("users").update_one({"email": adopter_email}, {"$inc": {"points": 30}})
    rep_email = (animal.get("reporter") or {}).get("email") or animal.get("contactInfo")
    if rep_email:
        get_collection("users").update_one({"email": rep_email}, {"$inc": {"points": 30}})
    create_notification(adopter_email, adopter_email, f'🎉 Congratulations! Your request to adopt the {animal.get("animalType") or "animal"} has been approved! You earned 30 points.', "animal", f"/animals/{animal_id}")
    return {"success": True, "message": "Adoption approved successfully."}


@animals_router.post("/{animal_id}/donate")
def donate_to_animal(animal_id: str, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    oid = to_oid(animal_id, "animal ID")
    amount = float(payload.get("amount") or 0)
    if amount <= 0:
        raise HTTPException(400, "Invalid donation amount.")
    col = get_collection("animals")
    animal = col.find_one({"_id": oid})
    if not animal:
        raise HTTPException(404, "Animal not found.")
    donor_name = payload.get("name") or auth_user["name"] or auth_user["email"].split("@")[0]
    get_collection("contributions").insert_one({
        "animalId": str(oid),
        "animalType": animal.get("animalType") or animal.get("type"),
        "type": "animal_rescue",
        "amount": amount,
        "name": donor_name,
        "email": auth_user["email"],
        "phone": payload.get("phone") or "",
        "additionalInfo": payload.get("additionalInfo") or "",
        "date": utcnow(),
    })
    col.update_one({"_id": oid}, {"$inc": {"fundingRaised": amount}})
    add_points(auth_user["email"], "contribution_made")
    rep_email = (animal.get("reporter") or {}).get("email") or animal.get("contactInfo")
    if rep_email:
        create_notification(rep_email, rep_email, f"{donor_name} donated ৳{int(amount)} to help with the animal you reported!", "drive", f"/animals/{animal_id}")
    return {"success": True, "message": "Donation recorded. Thank you!"}


@feeding_drives_router.get("")
@feeding_drives_router.get("/")
def list_feeding_drives():
    items = list(get_collection("feedingDrives").find().sort("date", -1))
    return serialize_mongo(items)


@feeding_drives_router.post("", status_code=201)
@feeding_drives_router.post("/", status_code=201)
def create_feeding_drive(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    doc = {
        **payload,
        "createdBy": payload.get("createdBy") or auth_user["name"] or auth_user["email"].split("@")[0],
        "createdAt": utcnow(),
        "status": "upcoming",
        "volunteers": payload.get("volunteers") or [],
    }
    res = get_collection("feedingDrives").insert_one(doc)
    return serialize_mongo({"insertedId": res.inserted_id, "acknowledged": True})


@feeding_drives_router.post("/{drive_id}/join")
def join_feeding_drive(drive_id: str, payload: Optional[dict] = None, auth_user: dict = Depends(verify_token)):
    oid = to_oid(drive_id, "drive ID")
    user_id = (payload or {}).get("userId") or auth_user["uid"] or auth_user["email"]
    get_collection("feedingDrives").update_one({"_id": oid}, {"$addToSet": {"volunteers": user_id}})
    return {"success": True, "modifiedCount": 1}

