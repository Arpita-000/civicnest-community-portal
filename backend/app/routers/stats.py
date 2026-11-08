"""Aggregated platform numbers (kept from the first iteration; used by dashboards)."""
from fastapi import APIRouter

from ..database import get_collection
from ..utils import serialize_mongo, ttl_cached

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/overview")
def platform_overview():
    def build():
        issues, users, polls = get_collection("issues"), get_collection("users"), get_collection("polls")
        visible = {"isHidden": False, "approvalStatus": "approved"}
        total = issues.count_documents(visible)
        solved = issues.count_documents({**visible, "status": "solved"})
        points = list(users.aggregate([{"$group": {"_id": None, "total": {"$sum": "$points"}}}]))
        return {
            "totalIssues": total,
            "solvedIssues": solved,
            "activeIssues": issues.count_documents({**visible, "status": {"$in": ["open", "action_taken", "pending_verification"]}}),
            "totalUsers": users.estimated_document_count(),
            "totalPolls": polls.count_documents({"status": "active"}),
            "totalPoints": points[0]["total"] if points else 0,
            "resolutionRate": round(solved / total * 100, 1) if total else 0,
        }

    return ttl_cached("stats:overview", 30, build)


@router.get("/activities")
def recent_activities():
    def build():
        cursor = (
            get_collection("issues")
            .find({"isHidden": False, "approvalStatus": "approved", "isAnonymous": {"$ne": True}}, {"title": 1, "area": 1, "category": 1, "submittedAt": 1, "submittedBy.name": 1})
            .sort("submittedAt", -1)
            .limit(5)
        )
        return serialize_mongo(
            [
                {
                    "id": d["_id"],
                    "type": "issue",
                    "title": d.get("title"),
                    "area": d.get("area"),
                    "category": d.get("category"),
                    "time": d.get("submittedAt"),
                    "author": (d.get("submittedBy") or {}).get("name") or "Civic Resident",
                }
                for d in cursor
            ]
        )

    return ttl_cached("stats:activities", 15, build)
