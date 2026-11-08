"""End-to-end API smoke test against the real database.

Run from `backend/`:   python -m tests.smoke_test

Firebase verification is replaced with fake users (dependency overrides). Every record the
test creates is tagged with TEST_UID / TEST_EMAIL and removed again at the end.
"""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.auth import get_optional_user, member_only, verify_token
from app.database import get_collection
from app.main import app

TEST_UID, TEST_EMAIL = "test-smoke-uid", "smoke.test@example.test"
ADMIN_UID, ADMIN_EMAIL = "test-smoke-admin", "smoke.admin@example.test"
current = {"user": None}


def fake(role="guest", uid=TEST_UID, email=TEST_EMAIL, member=False):
    return {
        "uid": uid, "email": email, "name": "Smoke Tester", "picture": "", "role": role,
        "isVolunteer": False, "points": 0, "dbUser": {"email": email, "role": role} if member or role == "admin" else None,
    }


def as_user(user):
    current["user"] = user


app.dependency_overrides[verify_token] = lambda: current["user"]
app.dependency_overrides[get_optional_user] = lambda: current["user"]
app.dependency_overrides[member_only] = lambda: current["user"]

client = TestClient(app)
checks = 0


def ok(cond, label):
    global checks
    checks += 1
    assert cond, f"FAILED: {label}"
    print(f"  ok  {label}")


def issue_payload(**over):
    body = {
        "title": "Overflowing bin outside the smoke test market",
        "description": "The public bin outside the market has been overflowing for three days and attracting stray animals.",
        "category": "Garbage & Waste", "location": "Smoke Test Road", "area": "Ward 1",
        "images": ["https://example.test/a.jpg"],
        "incidentDate": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        "coordinates": {"lat": None, "lng": None}, "isAnonymous": False,
        "crowdfunding": {"enabled": False, "targetAmount": None, "purpose": None},
    }
    body.update(over)
    return body


def cleanup():
    uids = [TEST_UID, ADMIN_UID]
    ids = [i["_id"] for i in get_collection("issues").find({"submittedBy.userId": {"$in": uids}}, {"_id": 1})]
    get_collection("comments").delete_many({"issueId": {"$in": ids}})
    get_collection("issues").delete_many({"_id": {"$in": ids}})
    get_collection("polls").delete_many({"createdBy": {"$in": [TEST_EMAIL, ADMIN_EMAIL]}})
    get_collection("feed_events").delete_many({"data.title": {"$regex": "smoke test"}})
    get_collection("feed_events").delete_many({"data.question": {"$regex": "smoke test"}})
    get_collection("incidents").delete_many({"title": {"$regex": "smoke test"}})


try:
    cleanup()
    print("public reads")
    r = client.get("/issues?limit=50")
    ok(r.status_code == 200 and r.json()["issues"], "GET /issues returns data")
    ok(all(i.get("approvalStatus", "approved") == "approved" for i in r.json()["issues"] if i["_type"] == "issue"), "feed only shows approved issues")
    ok(all("adminNote" not in i and "spamFlags" not in i for i in r.json()["issues"]), "private fields are not leaked")
    ok(client.get("/issues/not-an-id").status_code == 400, "bad issue id -> 400")
    ok(client.get("/issues/000000000000000000000000").status_code == 404, "unknown issue -> 404")
    r = client.get("/polls")
    ok(r.status_code == 200 and all("voters" not in p and "voterVotes" not in p for p in r.json()), "polls do not leak voter emails")
    ok(client.get("/polls/stats").json()["active"] >= 0, "polls stats")
    ok(client.get("/public/stats").json()["success"], "public stats")
    ok(client.get("/public/feed?limit=3").json()["success"], "public feed")
    ok(client.get("/cleanup-events?upcoming=true").json()["success"], "cleanup events")
    ok(client.get("/users/check-email?email=nobody.smoke@example.test").json() == {"exists": False}, "check-email")

    print("guest reports an issue")
    as_user(fake("guest"))
    r = client.post("/issues", json=issue_payload(title="SHORT"))
    ok(r.status_code == 422, "validation rejects a bad title")
    r = client.post("/issues", json=issue_payload(incidentDate=(datetime.now(timezone.utc) - timedelta(days=200)).isoformat()))
    ok(r.status_code == 422 and "90 days" in r.json()["error"], "validation rejects an old date")
    r = client.post("/issues", json=issue_payload())
    ok(r.status_code == 201 and r.json()["approvalStatus"] == "pending_review", "guest issue is created pending review")
    guest_issue = r.json()["issueId"]
    r = client.post("/issues", json=issue_payload(title="A second report from the same smoke tester"))
    ok(r.status_code == 429 and r.json()["code"] == "CREDIT_LIMIT_REACHED", "guest hits the 72h credit limit")
    ok(client.get(f"/issues/{guest_issue}").status_code == 200, "owner can open own pending issue")
    ok(client.get("/credits/issues").json()["remaining"] == 0, "credits endpoint reflects usage")
    ok(any(i["_id"] == guest_issue for i in client.get("/issues/my").json()), "pending issue is listed under my issues")
    as_user(None)
    ok(client.get(f"/issues/{guest_issue}").status_code == 404, "anonymous visitors cannot open a pending issue")
    ok(all(i["_id"] != guest_issue for i in client.get("/issues?limit=50").json()["issues"]), "pending issue is not in the feed")

    print("admin issue + voting + comments")
    as_user(fake("admin", ADMIN_UID, ADMIN_EMAIL))
    r = client.post("/issues", json=issue_payload(isAnonymous=True))
    ok(r.status_code == 201 and r.json()["approvalStatus"] == "approved", "admin issue is auto-approved")
    iid = r.json()["issueId"]
    as_user(fake("guest"))
    r = client.patch(f"/issues/{iid}/upvote")
    ok(r.json()["userVote"] == "up" and r.json()["netScore"] == 1, "upvote")
    ok(client.get(f"/issues/{iid}").json()["userVote"] == "up", "userVote survives a reload")
    r = client.patch(f"/issues/{iid}/downvote")
    ok(r.json()["userVote"] == "down" and r.json()["netScore"] == -1 and r.json()["upvotes"] == [], "downvote replaces upvote")
    r = client.patch(f"/issues/{iid}/downvote")
    ok(r.json()["userVote"] is None and r.json()["netScore"] == 0, "second downvote toggles off")
    ok(client.get(f"/issues/{iid}").json()["submittedBy"]["name"] == "Anonymous Member", "anonymous poster identity hidden")
    r = client.post(f"/issues/{iid}/comments", json={"body": "  Seen this too, thanks for reporting.  "})
    ok(r.status_code == 201 and r.json()["body"] == "Seen this too, thanks for reporting.", "comment created and trimmed")
    cid = r.json()["_id"]
    ok(client.post(f"/issues/{iid}/comments", json={"body": "   "}).status_code == 422, "blank comment rejected")
    ok(client.get(f"/issues/{iid}").json()["commentCount"] == 1, "commentCount incremented")
    ok(len(client.get(f"/issues/{iid}/comments").json()) == 1, "comment listed")
    ok(client.patch(f"/comments/{cid}/like").json()["likes"] == [TEST_UID], "like comment")
    as_user(fake("guest", "someone-else", "other@example.test"))
    ok(client.delete(f"/comments/{cid}").status_code == 403, "strangers cannot delete a comment")
    as_user(fake("guest"))
    ok(client.delete(f"/comments/{cid}").status_code == 200, "author deletes own comment")
    ok(client.get(f"/issues/{iid}").json()["commentCount"] == 0, "commentCount decremented")
    ok(client.get(f"/issues/{iid}/comments").json() == [], "deleted comment hidden")

    print("polls")
    as_user(fake("member", member=True))
    r = client.post("/polls", json={"question": "Should the smoke test bin stay?", "type": "yesno", "options": [{"text": "Yes"}, {"text": "Maybe"}]})
    ok(r.status_code == 400, "yes/no poll needs exactly Yes and No")
    r = client.post("/polls", json={"question": "Should the smoke test bin stay?", "type": "single", "options": [{"text": "Yes"}, {"text": "No"}], "category": "Environment"})
    ok(r.status_code == 201 and r.json()["status"] == "pending", "member poll waits for approval")
    pid = r.json()["pollId"]
    ok(client.post(f"/polls/{pid}/vote", json={"optionIds": ["x"]}).status_code in (400,), "cannot vote on a pending poll")
    as_user(fake("admin", ADMIN_UID, ADMIN_EMAIL))
    ok(client.patch(f"/polls/{pid}/approve").json()["status"] == "active", "admin approves poll")
    as_user(fake("member", member=True))
    poll = client.get(f"/polls/{pid}").json()
    yes, no = poll["options"][0]["id"], poll["options"][1]["id"]
    r = client.post(f"/polls/{pid}/vote", json={"optionIds": [yes]})
    ok(r.status_code == 200 and r.json()["poll"]["totalVotes"] == 1 and r.json()["poll"]["hasVoted"], "vote recorded")
    r = client.post(f"/polls/{pid}/vote", json={"optionIds": [no]})
    p = r.json()["poll"]
    ok(r.status_code == 200 and p["totalVotes"] == 1 and p["options"][0]["votes"] == 0 and p["options"][1]["votes"] == 1, "vote change moves the vote")
    client.post(f"/polls/{pid}/vote", json={"optionIds": [yes]})
    ok(client.post(f"/polls/{pid}/vote", json={"optionIds": [no]}).status_code == 400, "vote changes are capped at 2")
    ok(client.post(f"/polls/{pid}/vote", json={"optionIds": ["bogus"]}).status_code == 400, "invalid option rejected")
    ok(client.delete(f"/polls/{pid}").status_code == 200, "creator deletes own poll")

    print("home quick report")
    as_user(None)
    r = client.post("/public/incidents", json={"title": "Smoke test overflow", "area": "Ward 2", "description": "details"})
    ok(r.status_code == 201 and r.json()["success"], "guest quick report works")
    ok(client.post("/public/incidents", json={"title": "", "area": "x", "description": "y"}).status_code == 422, "quick report validates")
    saved = dict(app.dependency_overrides)
    app.dependency_overrides.clear()
    ok(client.post("/issues", json=issue_payload()).status_code == 401, "creating an issue without a token -> 401")
    ok(client.get("/issues/my", headers={"Authorization": "Bearer garbage"}).status_code == 401, "garbage token -> 401")
    app.dependency_overrides.update(saved)
    print(f"\nALL {checks} CHECKS PASSED")
finally:
    cleanup()
