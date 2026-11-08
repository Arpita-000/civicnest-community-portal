# CivicNest - Community Cleanliness & Civic Engagement Portal

An exact modern replica and architectural upgrade of the CivicNest Community Portal. Re-engineered from the ground up using **Next.js 14 (App Router)** on the frontend, a modular **FastAPI (Python)** backend, **MongoDB Atlas** for data persistence, and **Firebase Authentication** for identity management.

---

## 🚀 Tech Stack & Architecture

| Layer | Technology | Key Libraries / Features |
|---|---|---|
| **Frontend** | **Next.js 14** (App Router) | React 18, Tailwind CSS v4, daisyUI 5, Framer Motion, Lucide & Remix Icons, Swiper |
| **Backend** | **FastAPI** (Python 3.11+) | Pydantic v2 schemas, modular routers, PyMongo, dependency injection, CORS middleware |
| **Authentication** | **Firebase Auth** + **Firebase Admin** | Client token auto-refresh, clock-skew tolerant ID token verification, RBAC roles (`guest`, `member`, `admin`, `volunteer`) |
| **Database** | **MongoDB Atlas** (`communityDB`) | Optimized indexes, auto-provisioning for residents, soft-delete visibility protection |
| **Deployment** | **Render.com** | Infrastructure-as-code via `render.yaml` for unified frontend and backend deployment |

---

## 📁 Repository Structure

```
Community_App_Copy/
├── backend/
│   ├── app/
│   │   ├── routers/            # 15 modular REST API routers (57 endpoints)
│   │   │   ├── admin.py        # Moderation, queue stats, user/event verification
│   │   │   ├── ai.py           # CivicBot & AI content assistants
│   │   │   ├── animals.py      # Stray animal reports & feeding drives
│   │   │   ├── cleanup_events.py # Neighborhood cleanups & RSVPs
│   │   │   ├── comments.py     # Threaded comments, voting & moderation
│   │   │   ├── credits.py      # Rolling 72h posting credit limits
│   │   │   ├── forum.py        # Community discussion threads
│   │   │   ├── issues.py       # Issue feed, GPS geo-tagging, upvotes & status
│   │   │   ├── lost_found.py   # Lost and found items directory
│   │   │   ├── membership.py   # Resident membership requests & notifications
│   │   │   ├── ngos.py         # Registered NGOs & partnerships
│   │   │   ├── payment.py      # Stripe & SSLCommerz contribution gateways
│   │   │   ├── polls.py        # Community polls, voting & dynamic charts
│   │   │   ├── public.py       # Public stats, incident feed & user lookup
│   │   │   ├── uploads.py      # Base64 image upload handler
│   │   │   ├── users.py        # Profiles, bookmarks, leaderboard & streaks
│   │   │   └── volunteers.py   # Volunteer hub, registration & availability
│   │   ├── services/           # Reusable services (points, credits, notifications, feed)
│   │   ├── auth.py             # Firebase ID token decoding & RBAC dependencies
│   │   ├── config.py           # Environment variable loading & validation
│   │   ├── database.py         # PyMongo client pool configuration
│   │   ├── main.py             # FastAPI application entrypoint & middleware
│   │   ├── models.py           # Domain constants & credit/point rules
│   │   ├── schemas.py          # Pydantic request & response validators
│   │   ├── seed.py             # Index creation & self-healing migrations
│   │   └── utils.py            # BSON serialization, UTC helpers & in-memory cache
│   ├── tests/                  # End-to-end smoke test suite
│   ├── requirements.txt        # Python backend dependencies
│   └── firebase-credentials.json # (Ignored) Firebase Admin Service Account key
│
├── frontend/
│   ├── src/
│   │   ├── app/                # 53 Next.js 14 App Router pages & routes
│   │   │   ├── admin/          # Admin moderation dashboard
│   │   │   ├── issues/         # Feed, details, add issue, my reports, verify
│   │   │   ├── polls/          # Interactive polls & community voting
│   │   │   ├── profile/        # Resident dashboard, bookmarks & stats
│   │   │   ├── leaderboard/    # Civic points & activity streak leaderboard
│   │   │   ├── cleanup-events/ # Event directory & organizer wizard
│   │   │   ├── noticeboard/    # Pinned community announcements
│   │   │   ├── volunteers/     # Volunteer onboarding & dashboard
│   │   │   ├── login/          # Authentication & social login
│   │   │   └── register/       # Citizen registration & cleanliness pledge
│   │   ├── components/         # Modular UI components (Navbar, Footer, Modals)
│   │   ├── context/            # AuthContext (state, auto-sync, token management)
│   │   ├── lib/                # API client (Axios + auto token injection), Firebase config
│   │   └── styles/             # Tailwind v4 theme tokens & global styles
│   ├── package.json            # Node.js dependencies & scripts
│   └── tsconfig.json           # Strict TypeScript configuration
│
├── .gitignore                  # Comprehensive secret & build artifact ignore rules
├── MANUAL_STEPS.md             # Developer setup, local run steps & troubleshooting
├── Must_Instructions.md        # Original assignment specifications
├── PROGRESS_LOG.md             # Detailed engineering log across all phases
└── render.yaml                 # Multi-service Render deployment specification
```

---

## ✨ Features Implemented

* **Community Issues Feed & Reporting**: Geo-tagged issue reporting with photo uploads, category tagging, 72-hour credit throttling, anonymous posting, and crowdfunding support.
* **Interactive Community Polls**: Multi-step poll creation, real-time voting charts, vote change allowances, and admin approval workflows.
* **Leaderboard & Streaks**: Civic action points, badge rewards, and daily engagement streak tracking.
* **Volunteer Hub & Cleanup Events**: Community cleanup event planning, attendee RSVP, and volunteer availability management.
* **Noticeboard & Alerts**: Pinned official announcements, area-targeted alerts, and emergency notices.
* **Resident Profile Dashboard**: Custom avatar uploads, bio customization, bookmarked issues/events, and contribution history.
* **Admin & Moderation Suite**: Incident verification, membership request approvals, volunteer approvals, and content flags.
* **Robust Authentication Flow**: Email/password and Google Single Sign-On with automatic resident profile provisioning and deep-link redirection.

---

## 🛠️ Local Development Quickstart

### 1. Prerequisites
* Python 3.11+
* Node.js 18+ or 20+
* MongoDB Atlas cluster with Network Access allowed for your IP address

### 2. Backend Setup
```bash
cd Community_App_Copy/backend

# Create and activate virtual environment (optional but recommended)
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start development API server (docs at http://localhost:8000/docs)
python -m uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd Community_App_Copy/frontend

# Install dependencies
npm install

# Start Next.js development server (runs on http://localhost:3000)
npm run dev
```

### 4. Production Build Verification
```bash
cd Community_App_Copy/frontend
npm run build
npm start
```

---

## ☁️ Deployment (Render.com)

The project includes a ready-to-use [`render.yaml`](./render.yaml) blueprint defining both services:
1. **API Service (`community-cleanliness-api`)**: Python web service running FastAPI with Gunicorn/Uvicorn.
2. **Web Service (`community-cleanliness-web`)**: Node.js web service running Next.js in production mode (`npm start`).

Configure the following secrets in the Render dashboard:
* `MONGODB_URI`: MongoDB Atlas connection string.
* `FIREBASE_CREDENTIALS_JSON`: Service account JSON string.
* `NEXT_PUBLIC_FIREBASE_*`: Firebase Web SDK credentials.

---

## 🛡️ Production & Submission Readiness Checklist

- [x] **0 Broken Links**: Audited all 53 Next.js pages and routes.
- [x] **Zero TypeScript / Build Errors**: `npm run build` generates 46 static pages with exit code 0.
- [x] **API Route Integrity**: All 57 endpoints verified and aligned between frontend and backend.
- [x] **Authentication Hardened**: Auto-provisioning safeguards against 404s, profile photos are preserved, and false redirects are eliminated.
- [x] **Secure Secrets Handling**: All `.env`, credentials, and temporary build files are git-ignored.
- [x] **Original Codebases Untouched**: `Community_App` and `Beautify - Copy` remain completely unmodified.

