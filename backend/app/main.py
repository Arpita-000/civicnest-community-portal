import asyncio
import os
from contextlib import asynccontextmanager

import pymongo.errors
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import CORS_ORIGINS, UPLOAD_DIR
from .routers import (
    admin,
    ai,
    animals,
    announcements,
    cleanup_events,
    comments,
    credits,
    forum,
    issues,
    lost_found,
    membership,
    ngos,
    payment,
    polls,
    public,
    stats,
    uploads,
    users,
    volunteers,
)
from .seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Index creation talks to Atlas; run it off the event loop so the API is reachable immediately.
    async def warm_up():
        try:
            await asyncio.to_thread(seed_database)
        except Exception as exc:
            print(f"[Startup Warning] database warm-up: {exc}")

    task = asyncio.create_task(warm_up())
    yield
    task.cancel()


app = FastAPI(
    title="CivicNest Community Portal API",
    description="FastAPI backend for the Community Cleanliness & Public Incident Portal (MongoDB + Firebase Auth).",
    version="2.1.0",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.(onrender\.com|vercel\.app))$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _error(status: int, message: str, **extra) -> JSONResponse:
    # `detail` is FastAPI's shape; `error` / `message` are what the original Express API returned.
    return JSONResponse(status_code=status, content={"detail": message, "error": message, "message": message, **extra})


@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    if isinstance(exc.detail, dict):
        return _error(exc.status_code, exc.detail.get("message", "Request failed"), **{k: v for k, v in exc.detail.items() if k != "message"})
    return _error(exc.status_code, str(exc.detail))


@app.exception_handler(RequestValidationError)
async def validation_error(_: Request, exc: RequestValidationError):
    first = exc.errors()[0]
    field = ".".join(str(p) for p in first["loc"] if p != "body")
    msg = first["msg"].removeprefix("Value error, ")
    return _error(422, f"{field}: {msg}" if field else msg)


@app.exception_handler(pymongo.errors.PyMongoError)
async def mongo_error(_: Request, exc: pymongo.errors.PyMongoError):
    print(f"[MongoDB] {exc}")
    return _error(503, "Database connection error. Please try again shortly.")


ALL_ROUTERS = (
    users.router,
    users.leaderboard_router,
    issues.router,
    comments.issue_comments,
    comments.comments,
    polls.router,
    stats.router,
    public.router,
    cleanup_events.router,
    credits.router,
    uploads.router,
    announcements.router,
    volunteers.router,
    lost_found.router,
    animals.animals_router,
    animals.feeding_drives_router,
    forum.router,
    ngos.router,
    membership.membership_router,
    membership.contributions_router,
    membership.gallery_router,
    membership.notifications_router,
    ai.router,
    admin.router,
    payment.router,
)

for r in ALL_ROUTERS:
    app.include_router(r)
    app.include_router(r, prefix="/api")

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"status": "online", "service": "CivicNest FastAPI Backend", "version": app.version, "docs": "/docs"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)), reload=True)
