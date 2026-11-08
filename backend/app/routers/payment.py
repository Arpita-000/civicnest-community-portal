"""Payment & Donation Gateways (`routes/payment.js`) — SSLCommerz Sandbox Emulator + Direct Support."""
import uuid
from bson import ObjectId
from fastapi import APIRouter, Body, Depends, Form, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse

from ..auth import verify_token
from ..config import CLIENT_BASE_URL
from ..database import get_collection
from ..services.feed import create_feed_event
from ..services.notifications import create_notification
from ..services.points import add_points, update_streak
from ..utils import drop_cache, utcnow

router = APIRouter(prefix="/payment", tags=["Payment"])


def _process_donation(tran_id: str) -> None:
    tx_col = get_collection("pendingtransactions")
    tx = tx_col.find_one_and_update(
        {"tran_id": tran_id, "status": "pending"},
        {"$set": {"status": "success"}},
    )
    if not tx:
        return

    amount = float(tx.get("amount") or 0)
    user_email = tx.get("userId") or ""
    donation_type = tx.get("donationType") or "community"
    ref_id = tx.get("referenceId")

    contribution: dict = {
        "type": donation_type,
        "amount": amount,
        "email": user_email,
        "date": utcnow(),
        "gateway": tx.get("gateway") or "sslcommerz",
        "tranId": tran_id,
    }

    notif_msg = ""
    notif_recipient = None
    link = "/"

    if donation_type == "community":
        contribution["note"] = "General platform support"
    elif donation_type == "animal" and ref_id and ObjectId.is_valid(str(ref_id)):
        oid = ObjectId(str(ref_id))
        contribution["animalId"] = str(ref_id)
        get_collection("animals").update_one({"_id": oid}, {"$inc": {"fundingRaised": amount}})
        animal = get_collection("animals").find_one({"_id": oid}) or {}
        notif_msg = f"A kind community member donated ৳{int(amount)} to help with the animal you reported!"
        notif_recipient = (animal.get("reporter") or {}).get("email") or animal.get("contactInfo")
        link = f"/animals/{ref_id}"
    elif donation_type == "event" and ref_id and ObjectId.is_valid(str(ref_id)):
        oid = ObjectId(str(ref_id))
        contribution["eventId"] = str(ref_id)
        get_collection("cleanupevents").update_one({"_id": oid}, {"$inc": {"fundingRaised": amount}})
        event = get_collection("cleanupevents").find_one({"_id": oid}) or {}
        notif_msg = f"A kind community member donated ৳{int(amount)} to your cleanup event!"
        notif_recipient = (event.get("organizer") or {}).get("email")
        link = f"/cleanup-events/{ref_id}"
    elif donation_type == "ngo" and ref_id and ObjectId.is_valid(str(ref_id)):
        oid = ObjectId(str(ref_id))
        contribution["ngoId"] = str(ref_id)
        get_collection("ngos").update_one({"_id": oid}, {"$inc": {"totalDonations": amount, "totalSupporters": 1}})
        ngo = get_collection("ngos").find_one({"_id": oid}) or {}
        notif_msg = f"Your NGO received a donation of ৳{int(amount)}!"
        notif_recipient = ngo.get("adminEmail") or ngo.get("email")
        link = f"/ngos/{ref_id}"
    elif donation_type == "issue" and ref_id and ObjectId.is_valid(str(ref_id)):
        oid = ObjectId(str(ref_id))
        contribution["issueId"] = str(ref_id)
        get_collection("issues").update_one({"_id": oid}, {"$inc": {"crowdfunding.raisedAmount": amount}})
        drop_cache("issues:")

    get_collection("contributions").insert_one(contribution)
    if user_email:
        add_points(user_email, "contribution_made")
        update_streak(user_email)
    create_feed_event("donation_made", {"amount": amount, "title": donation_type.title(), "donor": user_email.split("@")[0] if user_email else "Supporter"})
    if notif_recipient and notif_msg:
        create_notification(notif_recipient, notif_recipient, notif_msg, "drive", link)


@router.post("/ssl-init")
def ssl_init(request: Request, payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    amount = float(payload.get("amount") or 0)
    if amount < 10:
        raise HTTPException(400, "Minimum donation is ৳10.")
    donation_type = payload.get("donationType") or "community"
    reference_id = payload.get("referenceId")
    tran_id = f"SSL_{uuid.uuid4()}"

    get_collection("pendingtransactions").insert_one({
        "tran_id": tran_id,
        "gateway": "sslcommerz",
        "amount": amount,
        "currency": "BDT",
        "donationType": donation_type,
        "referenceId": reference_id,
        "userId": auth_user["email"],
        "status": "pending",
        "createdAt": utcnow(),
    })

    backend_url = str(request.base_url).rstrip("/")
    mock_url = f"{backend_url}/api/payment/ssl-mock-gate?tran_id={tran_id}"
    return {"GatewayPageURL": mock_url}


@router.post("/create-stripe-intent")
def create_stripe_intent(payload: dict = Body(...), auth_user: dict = Depends(verify_token)):
    amount = float(payload.get("amount") or 0)
    if amount < 10:
        raise HTTPException(400, "Minimum donation is ৳10.")
    tran_id = f"STRIPE_{uuid.uuid4()}"
    get_collection("pendingtransactions").insert_one({
        "tran_id": tran_id,
        "gateway": "stripe",
        "amount": amount,
        "currency": "USD",
        "donationType": payload.get("donationType") or "community",
        "referenceId": payload.get("referenceId"),
        "userId": auth_user["email"],
        "status": "pending",
        "createdAt": utcnow(),
    })
    return {"clientSecret": f"pi_mock_{tran_id}_secret_mock", "tran_id": tran_id}


@router.post("/stripe-success")
def stripe_success(payload: dict = Body(...), _auth_user: dict = Depends(verify_token)):
    tran_id = payload.get("tran_id") or payload.get("paymentIntentId")
    if not tran_id:
        raise HTTPException(400, "tran_id is required")
    _process_donation(str(tran_id))
    return {"success": True, "message": "Donation processed successfully"}


@router.get("/ssl-mock-gate", response_class=HTMLResponse)
def ssl_mock_gate(tran_id: str = ""):
    return f"""<!DOCTYPE html>
<html>
<head>
  <title>SSLCommerz Sandbox Mock Gateway</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    body {{ font-family: 'Outfit', sans-serif; background: #f0fdf4; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }}
    .card {{ background: white; border-radius: 16px; padding: 40px; box-shadow: 0 10px 30px rgba(15, 118, 110, 0.08); text-align: center; max-width: 400px; border: 1px solid #ccfbf1; }}
    .icon {{ font-size: 48px; margin-bottom: 20px; }}
    h2 {{ color: #0f766e; margin: 0 0 10px 0; font-weight: 900; font-size: 24px; }}
    p {{ color: #042f2e; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0; }}
    .btn {{ background: #0f766e; color: white; border: none; padding: 14px 28px; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 14px; transition: all 0.2s; box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2); }}
    .btn:hover {{ background: #0d645d; transform: translateY(-1px); }}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">💳</div>
    <h2>SSLCommerz Emulator</h2>
    <p>This is a simulated sandbox gateway for CivicNest local development. Click below to verify and complete the payment.</p>
    <form action="/api/payment/ssl-mock-success" method="POST">
      <input type="hidden" name="tran_id" value="{tran_id}">
      <button type="submit" class="btn">Simulate Success</button>
    </form>
  </div>
</body>
</html>"""


@router.post("/ssl-mock-success")
def ssl_mock_success(tran_id: str = Form("")):
    try:
        _process_donation(tran_id)
        return RedirectResponse(url=f"{CLIENT_BASE_URL}/payment-success", status_code=303)
    except Exception:
        return RedirectResponse(url=f"{CLIENT_BASE_URL}/payment-failure?reason=mock_error", status_code=303)

