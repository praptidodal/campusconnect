import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.staticfiles import StaticFiles

from app.database.init_db import init_db
from app.routes.auth import router as auth_router
from app.routes.profile import router as profile_router
from app.routes.connection import router as connection_router, users_router, network_router
from app.routes.post import router as post_router
from app.routes.community import router as community_router, posts_router as community_posts_router
from app.routes.event import router as event_router
from app.routes.collaboration import router as collaboration_router, app_router as application_router
from app.routes.notification import router as notification_router
from app.routes.search import router as search_router
from app.routes.report import router as report_router
from app.routes.admin import router as admin_router
from app.routes.analytics import router as analytics_router
from app.routes.chat import router as chat_router
from app.routes.resource import router as resource_router
from app.routes.notice import router as notice_router
from app.routes.approval import router as approval_router
from app.routes.block import router as block_router
from app.utils.exceptions import ConnectionAPIError




# ---------------------------------------------------------------------------
# App Initialisation
# ---------------------------------------------------------------------------


app = FastAPI(
    title="CampusConnect API",
    description="Backend API for CampusConnect — Flow 1: Authentication Module",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow the React dev server (and production origins when configured)
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Global Exception Handler — normalise 4xx / 5xx detail format
# ---------------------------------------------------------------------------

@app.exception_handler(ConnectionAPIError)
async def connection_api_exception_handler(request: Request, exc: ConnectionAPIError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"success": False, "message": exc.message}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Return a clean validation error message instead of the default Pydantic detail."""
    errors = exc.errors()
    # Extract first meaningful message
    first = errors[0] if errors else {}
    msg = first.get("msg", "Validation error")
    return JSONResponse(
        status_code=422,
        content={"message": msg},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, ConnectionAPIError):
        return await connection_api_exception_handler(request, exc)
    if isinstance(exc, HTTPException):
        raise exc  # let FastAPI handle it normally
    return JSONResponse(
        status_code=500,
        content={"message": "Internal server error"},
    )


# ---------------------------------------------------------------------------
# Startup — create tables if they do not exist
# ---------------------------------------------------------------------------

import asyncio
from app.services.cleanup_service import start_cleanup_scheduler

@app.on_event("startup")
def on_startup():
    init_db()
    asyncio.create_task(start_cleanup_scheduler())


# Create uploads directory eagerly so StaticFiles can mount immediately
os.makedirs("uploads/avatars", exist_ok=True)
os.makedirs("uploads/collaborations", exist_ok=True)
os.makedirs("uploads/resumes", exist_ok=True)
os.makedirs("uploads/chat", exist_ok=True)
os.makedirs("uploads/resources/communities", exist_ok=True)
os.makedirs("uploads/resources/events", exist_ok=True)
os.makedirs("uploads/resources/collaborations", exist_ok=True)


# Static files — serve uploaded avatars at /static/avatars/<filename>
app.mount("/static", StaticFiles(directory="uploads"), name="static")


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(connection_router)
app.include_router(users_router)
app.include_router(network_router)
app.include_router(post_router)
app.include_router(community_router)
app.include_router(community_posts_router)
app.include_router(event_router)
app.include_router(collaboration_router)
app.include_router(application_router)
app.include_router(notification_router)
app.include_router(search_router)
app.include_router(report_router)
app.include_router(admin_router)
app.include_router(approval_router)
app.include_router(analytics_router)
app.include_router(chat_router)
app.include_router(resource_router)
app.include_router(notice_router)
app.include_router(block_router)






# ---------------------------------------------------------------------------
# Health Check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "CampusConnect API"}
