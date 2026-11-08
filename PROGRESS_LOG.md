# CivicNest Community Portal (Next.js + FastAPI + MongoDB) - Progress Log

Exact replica of `Community_App` (React + Node). Original app and Beautify app are untouched.
Scope so far: ~40% - Home, Issues feed/details/add/my, Polls, Profile dashboard, Login/Register, public profile, cleanup-event page, footer/navbar shell.

## Week 1 (earlier session) - scaffold
Next.js + FastAPI scaffold, Firebase auth from `beautify-auth`, first versions of Home / Issues / Polls / Profile / Login / Register.

## Week 2 - audit, fix & parity pass

### Problems found in the first iteration, and what was done
| Area | Problem | Fix |
|---|---|---|
| Backend / data | Wrote documents in a different shape than the original (`upvotes` by email, `location` object, comments keyed by string id with `text`), so shared DB records disagreed | Rewrote every router to the original Mongoose shapes (`submittedBy.userId`, `netScore`, `commentCount`, `Comment.body/issueId(ObjectId)`, `voterVotes.optionIds`...) |
| Backend / data | Issue feed listed `pending_review` posts; events read from a wrong collection (`cleanup_events` + fake seeded docs) | Feed filters `approvalStatus=approved`; events use `cleanupevents`; seeding of fake data removed |
| Security | Atlas password hard-coded in `database.py`; Firebase creds in render.yaml; voter e-mails leaked in `/polls`; no ownership checks on comments; client-writable role fields | Env-only config, `.gitignore`, voter identities stripped, owner/admin checks, whitelisted profile fields |
| Dead code | SQLAlchemy `models.py`/`schemas.py` imported a non-existent `Base`; `requirements.txt` lacked pymongo | Replaced by real business-rule constants / pydantic payload validators; requirements fixed |
| Auth | Token cached in localStorage expired after 1 h (silent 401s); profile POSTed twice per login; avatar overwritten by Google photo on each login; raw Firebase error strings | Token fetched per request from Firebase (auto-refresh); one idempotent sync; friendly error messages |
| Performance | 3-minute GET cache served stale votes; seeding blocked server start ~10 s; no DB indexes; unbounded in-memory feed merge; universal 350 ms exit animations | 20 s cache cleared on any mutation + in-flight de-dupe; start-up work moved off the event loop; indexes created; paged merge; fade-in only |
| UI bugs | Navbar called hooks after an early return; issue-details rendered an array as the upvote count; `Save` icon not imported (profile edit tab crashed); polls form sent capitalised categories the filter couldn't match; vote state not restored on reload (`up` vs `upvote`) | All fixed |
| Fake data | Hard-coded "1,847 issues", "+12 today", "15,000+ neighbours", category counts, `points ?? 100`, `/public/stats` inflated with `max(real, 15241)` | Real numbers from the DB everywhere |
| Broken links | Footer/home/nav pointed to `/issues` for pages that don't exist; `/demo/*.svg` images in DB never existed; `/user/:id`, `/cleanup-events/:id`, `/issues/my` missing | New pages for those three; `/demo/*` generated on the fly; unbuilt modules show a "coming in an upcoming milestone" toast |
| Styling | Tailwind v3 with custom tokens - class names rendered differently from the original (Tailwind v4 + daisyUI + root font scale 16/15.5/15/14.5 px) | Moved to Tailwind v4 + daisyUI with the original `index.css` tokens, so the same classes give the same pixels. Original's invisible `.btn-premium` (undefined CSS var) fixed |

### Backend (FastAPI) - `backend/app`
`config.py` `database.py` `auth.py` `models.py`(rules) `schemas.py`(validation) `utils.py` `seed.py`(indexes + legacy poll fix) `main.py`
`routers/` issues, comments, polls, users, credits, public, stats, cleanup_events, uploads  `services/` points, credits (72 h window), feed
Endpoints: `/issues` (+`/stats`,`/my`,`/{id}`, vote, witness, flag, edit, delete, comments), `/comments/{id}` (edit/delete/like/flag), `/polls` (+stats, vote, approve, delete), `/users` (check-email, upsert, my, streak, leaderboard), `/credits/{type}`, `/public/*` (stats, status, feed, incidents, search, users), `/cleanup-events`, `/upload`.
Tests: `python -m tests.smoke_test` - 48 checks against the live DB (all pass), cleans up its own records.

### Frontend (Next.js) - `frontend/src`
Shell: Navbar (original floating bar, rolling links, drawer with contribution calendar, search modal), Footer, splash cover, scroll-progress button, theme toggle (no flash), bottom-right toaster.
Pages: Home, Issues (typewriter, real sector counts, area filter built from data, debounced search, stale-response guard), Issue details (carousel, vote/witness, threaded comments with like/edit/delete, sidebar cards), Add Issue (all original validations, 72 h credit card, photo upload, GPS, anonymous + crowdfunding), My Reports, Polls (4-step create, change-vote, chart view, approval flow), Profile dashboard (edit with photo upload, rewards, reports), public profile, cleanup event, Login/Register.
Verified: `next build` passes (types included); pages screenshotted in light/dark and mobile with no console errors or failed requests.

## Week 3 - Comprehensive Audit, Link Integrity & Alignment Pass

### Audit Scope
1. Full scan of all 53 Next.js pages and routes across `Community_App_Copy/frontend/src/app`.
2. Link verification across all components, navigation elements, modals, and dynamic router pushes.
3. API endpoint parity check across 162 FastAPI endpoints and all frontend `api.*` calls.
4. Asset, RemixIcon class name casing, and CSS icon alignment audit.
5. Removal of stale artifacts.

### Issues Identified & Resolved
| Area | File(s) | Problem Found | Fix Applied |
|---|---|---|---|
| Broken Links | `frontend/src/app/leaderboard/page.tsx` | Profile links pointed to `/users/${leader._id}`, resulting in 404 (singular route is `/user/[uid]`) | Fixed href to `/user/${leader.uid \|\| leader._id}` in both top-3 podium and leaderboard list |
| Broken Links | `frontend/src/app/recent-activities/page.tsx` | "Report Issue" action button linked to non-existent `/add-issue` | Corrected href to `/issues/add` |
| UI & Icons | `app/recent-activities`, `app/map`, `app/noticeboard` | Case-sensitivity bug: `ri-Megaphone-line`, `ri-Compass-3-line`, `ri-Radar-line`, `ri-Temp-cold-line` prevented icon rendering | Corrected to standard lowercase `ri-megaphone-line`, `ri-compass-3-line`, `ri-radar-line`, `ri-temp-cold-line` |
| Data Consistency | `frontend/src/app/recent-activities/page.tsx` | `res.data` assignment assumed an array directly, whereas `/public/feed` returns `{ success, data, hasMore }` | Updated to `setFeedItems(Array.isArray(res.data) ? res.data : res.data?.data \|\| [])` |
| Data Consistency | `frontend/src/app/noticeboard/page.tsx` & `[id]/page.tsx` | Looked up `item.pinned`, `item.content`, `item.createdBy` which didn't match backend MongoDB field names | Added fallback checks for `isPinned`, `description`, `affectedArea`, and `posterName` |
| API Alignment | `frontend/src/app/admin/page.tsx` & `backend/app/routers/admin.py` | Admin deletion called `/admin/posts/{id}`; membership/volunteer approval called `/admin/membership/{id}/{action}` | Updated frontend calls to `/issues/{id}`, `/admin/membership/{id}/status`, and `/admin/volunteers/{id}/status`. Also added FastAPI alias routes for `/membership/{req_id}/{action}`, `/volunteers/{vol_id}/{action}`, and `/posts/{post_id}` |
| Public Profile Fallback | `backend/app/routers/public.py` | Public user profile and issue history lookup only checked Firebase `uid`, failing if queried by MongoDB `ObjectId` | Added fallback lookup by `to_oid(uid)` for both `/public/users/{uid}` and `/public/users/{uid}/issues` |
| Cleanup | `backend/community.db` | Leftover 45KB SQLite database file from initial iteration | Removed obsolete file |

### Verification
* `verify_all_links.py`: 53 Next.js routes checked; 0 broken links remaining.
* `check_ri_icons.py`: 0 invalid RemixIcon class names remaining.
* `next build`: Finished successfully with exit code 0; 46 static pages generated; TypeScript type checks passing without warnings or errors.

## Week 4 - Authentication Deep Dive & Polish Pass

### Problems Identified & Resolved
| Area | File(s) | Problem Found | Fix Applied |
|---|---|---|---|
| Auto-Provisioning & 404 Guard | `backend/app/routers/users.py` & `backend/app/auth.py` | Valid Firebase authenticated users without an existing MongoDB record received a `404 Not Found` when requesting `/users/my`, `/users/me`, `/me/profile`, or `/my/bookmark`. Additionally, `member_only` middleware returned `404 User not found` if `dbUser` was None | Added `_auto_provision_user(auth_user)` in `users.py` to automatically provision a default resident profile (guest role, 3 credits, 0 points, streak initialized) on any authenticated query. Updated `member_only` to cleanly return `403 Forbidden: Members only` instead of premature 404 |
| Profile & Photo Preservation | `backend/app/auth.py` & `backend/app/routers/users.py` | Google sign-in overwrote custom user display names and avatars with Google token defaults on subsequent logins | Decoded token checks database profile first (`db_name or decoded.name`, `db_picture or decoded.picture`), and `upsert_user` protects custom names and photos from being overwritten with empty or default tokens |
| User Identity Resolution | `backend/app/auth.py` & `backend/app/routers/users.py` | Users were previously looked up only by normalized email; if email casing or alias differed, lookup failed | Created unified `_find_user` looking up by email and fallback to Firebase `uid` |
| Email Existence Check | `backend/app/routers/users.py` | `GET /users/check-email` caught all exceptions from Firebase Admin and defaulted `exists = False`. When Firebase had transient connection issues, users entering the wrong password were misinformed with "Account Not Found" and prematurely redirected to sign up | Refined exception handling to catch only `(UserNotFoundError, NotFoundError)` for `exists = False`, and safely keep `exists = True` on internal errors or uninitialized app to avoid false redirects |
| Login & Register Flow | `frontend/src/app/login/page.tsx` & `register/page.tsx` | 1) Logged-in users navigating to `/login` or `/register` were not redirected. 2) Duplicate `syncProfile` API calls executed concurrently on both login form submission and `onAuthStateChanged`. 3) Deep-link redirection parameter (`?redirect=` or `?from=`) was ignored | 1) Added automatic redirection for authenticated users (`if (!loading && user) router.replace(redirectPath)`). 2) Removed redundant `syncProfile` invocations in form handlers. 3) Extracted `redirect`/`from` query parameter to route users directly to their intended destination |
| Issue Visibility Filter | `backend/app/routers/issues.py` | `/issues/my` and aggregation queries matched `isHidden: False`, which dropped legacy/imported records where `isHidden` was unset | Updated to `{"isHidden": {"$ne": True}}` across all public and user issue queries |

### Verification
* Python backend import test passed (`App imported successfully, routes count: 57`).
* Next.js production build (`npm run build`) passed with exit code 0; 46 static pages generated without warnings or type errors.

## Week 5 - Smooth Scroll Physics & "Glue" Elimination Overhaul

### Problems Identified & Resolved
| Area | File(s) | Problem Found | Fix Applied |
|---|---|---|---|
| Sticky "Glue" Mouse-Wheel Interpolation | `frontend/src/app/globals.css` | `html { scroll-behavior: smooth; }` in CSS forced Chromium/Firefox to intercept raw wheel ticks with a slow, clamped easing curve, making mousewheel scrolling feel heavy, unresponsive, and stuck like glue | Removed CSS `scroll-behavior: smooth` and integrated Lenis smooth scroll with dynamic inertia physics |
| Universal CSS Transition Jank | `frontend/src/app/globals.css` & `hooks/useTheme.ts` | `*, *::before, *::after` had `transition: 400ms` universally applied. Every frame during scroll triggered style recalcs for hundreds of DOM nodes across the screen | Removed universal transition and replaced with `.theme-transition` active only during theme switching (450ms) |
| Modern Momentum Physics | `frontend/src/components/SmoothScroll.tsx` & `app/layout.tsx` | App lacked modern momentum scrolling | Installed `lenis` (1.3.27) and created `<SmoothScroll>` wrapper around the AppShell. Configured with easeOutExpo easing, `wheelMultiplier: 1.0`, and auto-RAF loop |
| Route Change & Heavy Route Handling | `frontend/src/components/SmoothScroll.tsx` | Smooth scroll on map pages can conflict with interactive mouse-wheel zooming | Configured auto-pause (`lenis.stop()`) on `/map` and instant top-reset on pathname change without sticky delays |
| Scroll-to-Top Button | `frontend/src/components/ScrollProgressButton.tsx` | Clicking scroll-to-top used native `scrollTo({ behavior: "smooth" })` | Integrated `window.lenis.scrollTo(0, { duration: 1.0 })` for effortless upward gliding |

### Verification
* `next build`: Exit Code 0, 46 static pages generated cleanly with Lenis smooth scrolling active.

## Week 6 - Final handover pass (2026-11-08)

Method: every page crawled in headless Chrome (desktop + 375 px mobile, light + dark) against the production build, every GET route swept with fake admin auth, and every frontend call matched against the backend route table. The original app was run side by side for visual comparison.

| Area | Problem | Fix |
|---|---|---|
| Backend | `GET /volunteers` returned 503: `$project` mixed exclusion (`email: 0`) with computed fields | Inclusion-only projection (`routers/volunteers.py`) |
| Backend | `/forum` returned 422: page asks for `limit=100`, API capped at 50 | Cap raised to 100 (`routers/forum.py`) |
| Crash | `/fund` and admin events tab rendered the cleanup-event `location` object as text | `placeText()` helper in `lib/format.ts` |
| Crash | `/gallery` called `.map` on `{ issues: [...] }` | Reads `res.data.issues` |
| Crash | `/status` hydration mismatch (`new Date()` differs server vs client) | Stable "Checking..." text until data arrives |
| Access | Most pages were open to guests and fired protected API calls (401s); `/admin` had no guard | One `RouteGuard` in `AppShell` mirroring the original `PrivateRoute` / `MemberRoute` / `AdminRoute` table; deep links survive login |
| Security | `/login?redirect=` accepted any URL (open redirect) | Only in-app paths accepted |
| Admin | Queue, All Issues, NGOs, Donations tabs read the wrong response shapes (always empty); stat cards used keys the API never sends; status dropdown wrote invalid statuses (`in-progress`, `resolved`); event approvals hit the issue endpoint | All mapped to the real API shapes, statuses and endpoints |
| Profile | "My Cleanup Drives" and "Bookmarks" tabs always empty (API returns objects, page expected arrays) | Reads `organized`/`attending` and `bookmarkedIssues` |
| Data | Verify feed and map used non-existent statuses (`in-progress`, `resolved`) | Use `action_taken` / `solved` / `open` |
| UI | Forum thread sidebar always empty; Issues page "Open CivicBot AI" showed a "coming soon" toast | Fixed; button opens `/ai-assistant` like the original; `soon.ts` removed |
| UI | Theme followed the OS dark setting; the original defaults to light | Light by default, saved choice still respected |
| UI | Seeded `loremflickr.com` images often return 500 (broken images) | One global fallback to the generated `/demo/*.svg` artwork |
| Data hygiene | Smoke-test cleanup regex was case-sensitive, so "Smoke test overflow" items stayed in the live feed | Cleanup made case-insensitive; 5 leftover incidents + 5 feed events removed |

Verification: `next build` exit 0 (46 static pages); 51/52 routes with zero console errors / failed requests (the 52nd is the intended 404 page); no horizontal overflow at 375 px; 0 broken internal links; 86 GET routes with no 5xx; backend smoke test 48/48.
