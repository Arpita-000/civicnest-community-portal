"""Issue discussion threads (`/issues/{id}/comments`) and single-comment actions (`/comments/{id}`)."""
from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo import ReturnDocument

from ..auth import verify_token
from ..database import get_collection
from ..schemas import CommentCreate
from ..services.points import update_streak
from ..utils import serialize_mongo, to_oid, utcnow

issue_comments = APIRouter(prefix="/issues/{issue_id}/comments", tags=["Comments"])
comments = APIRouter(prefix="/comments", tags=["Comments"])

EDIT_WINDOW_MINUTES = 15


@issue_comments.get("")
@issue_comments.get("/")
def list_comments(issue_id: str, page: int = Query(1, ge=1), limit: int = Query(50, ge=1, le=100)):
    oid = to_oid(issue_id, "issue ID")
    issue = get_collection("issues").find_one({"_id": oid}, {"isAnonymous": 1, "submittedBy.userId": 1})
    if not issue:
        raise HTTPException(404, "Issue not found")

    cursor = (
        get_collection("comments")
        .find({"issueId": oid, "isHidden": {"$ne": True}, "isDeleted": {"$ne": True}}, {"flaggedBy": 0})
        .sort("createdAt", 1)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    result = []
    for c in cursor:
        if issue.get("isAnonymous") and c.get("userId") == issue.get("submittedBy", {}).get("userId"):
            c.update(userName="Anonymous Poster", userEmail="hidden", userAvatar="", userId="hidden", memberId="hidden", isOP=True)
        result.append(c)
    return serialize_mongo(result)


@issue_comments.post("", status_code=201)
@issue_comments.post("/", status_code=201)
def add_comment(issue_id: str, payload: CommentCreate, auth_user: dict = Depends(verify_token)):
    oid = to_oid(issue_id, "issue ID")
    issue = get_collection("issues").find_one({"_id": oid}, {"isAnonymous": 1, "approvalStatus": 1, "isHidden": 1})
    if not issue or issue.get("isHidden"):
        raise HTTPException(404, "Issue not found")
    if issue.get("approvalStatus") != "approved":
        raise HTTPException(400, "Comments open once the report is approved.")

    now = utcnow()
    name = auth_user["name"] or (auth_user["dbUser"] or {}).get("name") or "Member"
    doc = {
        "issueId": oid,
        "parentCommentId": to_oid(payload.parentCommentId, "comment ID") if payload.parentCommentId else None,
        "userId": auth_user["uid"],
        "userName": name,
        "userEmail": auth_user["email"],
        "userAvatar": auth_user["picture"] or (auth_user["dbUser"] or {}).get("photoURL") or f"https://ui-avatars.com/api/?name={name}",
        "memberId": (auth_user["dbUser"] or {}).get("memberId") or "MEM-0000",
        "body": payload.body,
        "isAnonymousPost": bool(issue.get("isAnonymous")),
        "createdAt": now,
        "editedAt": None,
        "editWindow": now + timedelta(minutes=EDIT_WINDOW_MINUTES),
        "isDeleted": False,
        "deletedBy": None,
        "deletedAt": None,
        "flaggedBy": [],
        "isHidden": False,
        "likes": [],
    }
    doc["_id"] = get_collection("comments").insert_one(doc).inserted_id
    get_collection("issues").update_one({"_id": oid}, {"$inc": {"commentCount": 1}})
    update_streak(auth_user["email"])
    doc.pop("flaggedBy")
    return serialize_mongo(doc)


def _comment(comment_id: str) -> dict:
    c = get_collection("comments").find_one({"_id": to_oid(comment_id, "comment ID")})
    if not c:
        raise HTTPException(404, "Comment not found")
    return c


@comments.patch("/{comment_id}")
def edit_comment(comment_id: str, payload: CommentCreate, auth_user: dict = Depends(verify_token)):
    c = _comment(comment_id)
    if c["userId"] != auth_user["uid"]:
        raise HTTPException(403, "Forbidden")
    edited = utcnow()
    get_collection("comments").update_one({"_id": c["_id"]}, {"$set": {"body": payload.body, "editedAt": edited}})
    return {"success": True, "editedAt": edited.isoformat() + "Z"}


@comments.delete("/{comment_id}")
def delete_comment(comment_id: str, auth_user: dict = Depends(verify_token)):
    c = _comment(comment_id)
    # The original left the ownership check commented out; owners and admins only is the safe reading.
    if c["userId"] != auth_user["uid"] and auth_user["role"] != "admin":
        raise HTTPException(403, "Forbidden")
    if c.get("isDeleted"):
        return {"success": True}
    get_collection("comments").update_one(
        {"_id": c["_id"]}, {"$set": {"isDeleted": True, "deletedBy": auth_user["email"], "deletedAt": utcnow()}}
    )
    get_collection("issues").update_one({"_id": c["issueId"], "commentCount": {"$gt": 0}}, {"$inc": {"commentCount": -1}})
    return {"success": True}


@comments.patch("/{comment_id}/flag")
def flag_comment(comment_id: str, auth_user: dict = Depends(verify_token)):
    c = get_collection("comments").find_one_and_update(
        {"_id": to_oid(comment_id, "comment ID")},
        {"$addToSet": {"flaggedBy": auth_user["uid"]}},
        return_document=ReturnDocument.AFTER,
        projection={"flaggedBy": 1},
    )
    if not c:
        raise HTTPException(404, "Comment not found")
    if len(c["flaggedBy"]) >= 3:
        get_collection("comments").update_one({"_id": c["_id"]}, {"$set": {"isHidden": True}})
    return {"success": True, "flagCount": len(c["flaggedBy"])}


def _like(comment_id: str, auth_user: dict, add: bool) -> dict:
    op = {"$addToSet": {"likes": auth_user["uid"]}} if add else {"$pull": {"likes": auth_user["uid"]}}
    c = get_collection("comments").find_one_and_update(
        {"_id": to_oid(comment_id, "comment ID")}, op, return_document=ReturnDocument.AFTER, projection={"likes": 1}
    )
    if not c:
        raise HTTPException(404, "Comment not found")
    return {"success": True, "likes": c["likes"]}


@comments.patch("/{comment_id}/like")
def like_comment(comment_id: str, auth_user: dict = Depends(verify_token)):
    return _like(comment_id, auth_user, True)


@comments.patch("/{comment_id}/unlike")
def unlike_comment(comment_id: str, auth_user: dict = Depends(verify_token)):
    return _like(comment_id, auth_user, False)
