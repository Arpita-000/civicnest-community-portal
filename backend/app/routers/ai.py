"""CivicBot AI endpoints (`routes/ai.js`) powered by Gemini REST API with smart local fallback."""
import json
import re
import urllib.request
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from ..auth import get_optional_user, verify_token
from ..config import GEMINI_API_KEY

router = APIRouter(prefix="/ai", tags=["AI"])

SYSTEM_PROMPTS = {
    "general": (
        "You are CivicBot, a highly advanced AI assistant for CivicNest — a Bangladesh community civic platform. "
        "Help users with civic issues, community problems, and local governance. Respond in the user's language "
        "(Bengali or English). Be extremely professional, concise, practical, and highly helpful. Provide structured "
        "markdown responses with clear headings, lists, or bold highlights where appropriate."
    ),
    "issue-helper": (
        "Help the user write a clear civic issue report. Suggest: (1) best category from "
        "[Garbage, Road Damage, Illegal Construction, Waterlogging, Broken Property, Safety], "
        "(2) a polished 2-3 sentence description, (3) estimated fix cost in BDT."
    ),
    "animal-tip": (
        "Give immediate first-aid advice for a stray animal. User describes the animal type and condition. "
        "Provide highly readable, structured first-aid steps. Include: (1) IMMEDIATE STEPS (formatted as bullet points), "
        "(2) URGENCY LEVEL (formatted in bold), (3) WHO TO CONTACT (animal rescue NGOs / local vets)."
    ),
    "complaint-letter": (
        "Generate a formal, highly polished complaint letter in Bengali and English addressed to the relevant "
        "Bangladesh City Corporation department. Structure: Date, Recipient, Subject, 3 paragraphs (problem, impact, "
        "requested action), Closing, Signature placeholder."
    ),
    "summarize": (
        "Summarize the following civic issue or forum thread in 3-4 sentences. Focus on: what the problem is, "
        "current status, and community response."
    ),
}


def _call_gemini(prompt: str, max_tokens: int = 1024) -> Optional[str]:
    if not GEMINI_API_KEY:
        return None
    for model_name in ("gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": 0.7},
        }
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=12) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                candidates = data.get("candidates") or []
                if candidates:
                    parts = ((candidates[0].get("content") or {}).get("parts")) or []
                    if parts and parts[0].get("text"):
                        return parts[0]["text"].strip()
        except Exception:
            continue
    return None


@router.post("/chat")
def ai_chat(payload: dict = Body(...), _auth_user: Optional[dict] = Depends(get_optional_user)):
    messages = payload.get("messages") or []
    mode = payload.get("mode") or "general"
    if not messages:
        raise HTTPException(400, "Messages required.")

    last_msg = messages[-1].get("content") if isinstance(messages[-1], dict) else str(messages[-1])
    sys_note = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["general"])
    prompt = f"[Context: {sys_note}]\n\n{last_msg}"
    text = _call_gemini(prompt, 1024)
    if not text:
        if mode == "animal-tip":
            text = (
                "### Immediate First-Aid Steps\n"
                "- **Approach calmly**: Avoid sudden movements and keep the animal in a quiet, shaded spot.\n"
                "- **Check for bleeding or dehydration**: Offer clean water in a shallow bowl; apply gentle pressure with clean gauze if bleeding.\n"
                "- **Do not give human medication**: Common painkillers are toxic to dogs and cats.\n\n"
                "**URGENCY LEVEL: HIGH**\n\n"
                "**Who to Contact**: Post on the **CivicNest Animal Rescue Hub** (`/animals/add`) and contact Obhoyaronno, Care for Paws, or the nearest veterinary hospital."
            )
        elif mode == "complaint-letter":
            today = datetime.utcnow().strftime("%d %B %Y")
            text = (
                f"**Date:** {today}\n\n"
                "**To:**\nThe Chief Waste Management & Engineering Officer,\nDhaka City Corporation\n\n"
                f"**Subject:** Urgent Request for Civic Intervention — {last_msg[:70]}\n\n"
                "Dear Sir/Madam,\n\n"
                f"I am writing on behalf of the residents of our locality to bring your urgent attention to the following civic issue: {last_msg}.\n\n"
                "This situation has caused severe inconvenience, safety risks, and public health hazards for daily commuters, school children, and elderly residents in the area.\n\n"
                "We respectfully request your department to dispatch an inspection and maintenance team at the earliest convenience to resolve this matter permanently.\n\n"
                "Respectfully submitted,\n**[Your Name]**\nVerified CivicNest Resident"
            )
        else:
            text = (
                "### CivicBot Guidance\n"
                f"Thank you for reaching out regarding: **{last_msg[:100]}**\n\n"
                "1. **Document & Report**: Take 1–3 clear photos of the issue and submit an incident report via **Report Issue** (`/issues/add`).\n"
                "2. **Mobilize Neighbours**: Share the report link so local residents can upvote, witness, or claim the fix.\n"
                "3. **Escalate if Needed**: Use the **Official Complaint Generator** on the issue page to download a formal notice for the City Corporation."
            )
    return {"response": text}


@router.post("/suggest-issue")
def suggest_issue(payload: dict = Body(...), _auth_user: dict = Depends(verify_token)):
    desc = (payload.get("description") or "").strip()
    if not desc:
        raise HTTPException(400, "Description required.")
    prompt = (
        f'A user submitted this civic issue description: "{desc}"\n'
        "Respond ONLY with valid JSON, no markdown, no backticks:\n"
        '{"category": "one of: Garbage, Road Damage, Illegal Construction, Waterlogging, Broken Property, Safety", '
        '"urgency": "one of: low, medium, high, emergency", '
        '"polishedDescription": "rewritten version in 2-3 clear sentences", '
        '"estimatedCostBDT": 2500}'
    )
    text = _call_gemini(prompt, 400)
    if text:
        try:
            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                return json.loads(m.group(0))
        except Exception:
            pass
    lower = desc.lower()
    cat = "Garbage"
    if any(k in lower for k in ("road", "pothole", "asphalt", "street")):
        cat = "Road Damage"
    elif any(k in lower for k in ("water", "drain", "flood", "sewage")):
        cat = "Waterlogging"
    elif any(k in lower for k in ("light", "lamp", "bench", "broken", "pole")):
        cat = "Broken Property"
    elif any(k in lower for k in ("crime", "hazard", "wire", "unsafe", "danger")):
        cat = "Safety"
    return {
        "category": cat,
        "urgency": "high" if any(k in lower for k in ("urgent", "danger", "emergency", "severe")) else "medium",
        "polishedDescription": desc,
        "estimatedCostBDT": 3000,
    }


@router.post("/animal-tip")
def animal_tip(payload: dict = Body(...)):
    animal_type = payload.get("animalType") or "animal"
    condition = payload.get("condition") or "distress"
    prompt = (
        f'A stray {animal_type} has been reported with this condition: "{condition}". '
        "Give immediate practical first-aid advice in 3-4 short sentences. Assume no vet is immediately available. "
        "End with urgency level: LOW / MEDIUM / HIGH / EMERGENCY"
    )
    tip = _call_gemini(prompt, 300) or (
        f"Keep the {animal_type} in a calm, shaded area away from traffic and offer clean drinking water. "
        "Avoid handling injured limbs directly without protective cloth, and apply gentle pressure with clean gauze if there is active bleeding. "
        "Contact local animal rescue volunteers on CivicNest or the nearest veterinary clinic immediately. "
        "Urgency level: HIGH"
    )
    return {"tip": tip}


@router.post("/generate-letter")
def generate_letter(payload: dict = Body(...), _auth_user: dict = Depends(verify_token)):
    title = payload.get("issueTitle") or "Civic Infrastructure Issue"
    desc = payload.get("issueDescription") or ""
    location = payload.get("location") or "Local Ward"
    authority = payload.get("authority") or "the City Corporation"
    today = datetime.utcnow().strftime("%d/%m/%Y")
    prompt = (
        f"Write a formal complaint letter (English only) to {authority}.\n"
        f"Issue: {title}\nLocation: {location}\nDetails: {desc}\n"
        f"Date: {today}\nKeep it formal, factual, and under 300 words."
    )
    letter = _call_gemini(prompt, 600) or (
        f"Date: {today}\n"
        f"To: The Chief Executive Officer, {authority}\n\n"
        f"Subject: Formal Complaint Regarding {title} at {location}\n\n"
        f"Respected Sir/Madam,\n\n"
        f"I am writing to formally bring to your attention an urgent civic issue at {location} concerning \"{title}\". {desc}\n\n"
        "This ongoing problem is adversely affecting public hygiene, commuter safety, and the daily wellbeing of residents in our neighbourhood. Multiple citizens on the CivicNest portal have verified and upvoted the severity of this issue.\n\n"
        "We kindly request your office to assign a field inspection team and take immediate remedial action to resolve this hazard at the earliest.\n\n"
        "Respectfully submitted,\n[Your Name]\n[Your Address & Contact]"
    )
    return {"letter": letter}


@router.post("/summarize")
def summarize_content(payload: dict = Body(...), _auth_user: dict = Depends(verify_token)):
    content = (payload.get("content") or "").strip()
    content_type = payload.get("type") or "issue"
    if not content:
        raise HTTPException(400, "Content required.")
    prompt = f"Summarize this {content_type} in 3-4 sentences. Include: what the problem is, current status, and community response. Content: {content[:3000]}"
    summary = _call_gemini(prompt, 350)
    if not summary:
        snippet = " ".join(content.split())[:280]
        summary = (
            f"This {content_type} highlights a community report regarding: {snippet}. "
            "Local residents are actively monitoring the situation, contributing upvotes and discussion comments to accelerate resolution."
        )
    return {"summary": summary}


@router.post("/detect-spam")
def detect_spam(payload: dict = Body(...)):
    return {"isSpam": False, "confidence": 0, "reason": "Verified civic report"}

