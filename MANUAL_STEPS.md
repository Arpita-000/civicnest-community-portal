# CivicNest Community Portal (Next.js + FastAPI) - Setup & Run Guide

## 1. Stack
| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), Tailwind CSS v4 + daisyUI (same as the original app), Framer Motion, Remix Icons |
| Backend | FastAPI (modular routers + services), PyMongo |
| Database | The original app's MongoDB Atlas database `communityDB` (shared, same document shapes) |
| Auth | Firebase Authentication project `beautify-auth`; the backend verifies ID tokens with firebase-admin |

## 2. Configuration (nothing secret is committed)
`backend/.env` (copy from `.env.example`)
```
MONGODB_URI=mongodb://...            # Atlas connection string
DB_NAME=communityDB
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
FIREBASE_SERVICE_ACCOUNT_PATH=firebase-credentials.json
```
`frontend/.env.local`
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=...  (AUTH_DOMAIN, PROJECT_ID, STORAGE_BUCKET, MESSAGING_SENDER_ID, APP_ID)
```
Both files and `firebase-credentials.json` are git-ignored.

## 3. Run locally
```powershell
# terminal 1 - API  (http://localhost:8000/docs)
cd Community_App_Copy\backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000

# terminal 2 - web  (http://localhost:3000)
cd Community_App_Copy\frontend
npm install
npm run dev
```
Backend smoke test (48 checks, cleans up after itself): `cd backend; python -m tests.smoke_test`

## 4. Deploy to Render
`render.yaml` defines both services. Set the `sync: false` variables in the dashboard
(`MONGODB_URI`, `FIREBASE_CREDENTIALS_JSON`, and the `NEXT_PUBLIC_FIREBASE_*` values).
Uploaded images are written to `backend/uploads` which is **ephemeral on Render's free tier** - attach a
Render Disk (set `UPLOAD_DIR`) or move uploads to object storage before real use.

## 5. Things you must do by hand
| # | Action | Why |
|---|---|---|
| 1 | ~~Delete `backend/community.db`~~ (Done) | Deleted leftover SQLite file |
| 2 | Allow your IP in MongoDB Atlas -> Network Access | Otherwise the API returns 503 |
| 3 | Rotate the Atlas password if this folder was ever shared | The old code hard-coded it in `database.py` (removed now) |
| 4 | Create a member/admin by editing `users.role` in Atlas | Members can vote in polls / post anonymously; admins auto-approve their posts and approve polls |

## 6. Behaviour notes (same rules as the original app)
* New issues from non-admins are `pending_review` and only visible to their author until an admin approves them.
* Posting credits: guest 1 / member 3 / volunteer 5 per rolling 72 h (+1 at 500 points).
* Polls: only members/volunteers vote; open-ended polls allow 2 vote changes; member-created polls wait for admin approval.
* Sections that belong to later weekly milestones (map, forum, NGOs, lost & found, admin, CivicBot...) show a "coming in an upcoming milestone" message instead of linking to a missing page.
