import mimetypes
mimetypes.add_type("application/javascript", ".js")
import os
from pathlib import Path

from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(PROJECT_ROOT / ".env")

from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from sqlalchemy.orm import Session
from fastapi.staticfiles import StaticFiles

# DB
from core.backend.db.database import get_db
from core.backend.db.cook import handle_cookies

# API (core)
from core.backend.api.mail import router as mail_router
from core.backend.api.contracts import router as contracts_router
from core.backend.api.blogadmin import router as blog_router
from core.backend.api.submit_service import router as service_router
from core.backend.api.industries import router as industries_router
from core.backend.api.userboard import router as userboard_router

# AUTH
from core.backend.auth.auth import router as auth_router
from core.backend.auth.user import router as auth_user_router

# TASKS APP (viktig!)
from app_plan.backend.task import router as task_router
from app_plan.backend.todo import router as todo_router
from app_insight.backend.analytics import router as analytics_router
from app_doc.backend.upload import router as doc_router
from app_doc.backend.docs import router as mydocs_router

import logging

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend"))

FRONTEND_ROOT = f"{BASE_DIR}/web"

ADMIN_ASSETS = os.path.join(
    BASE_DIR,
    "../frontend/admin/assets"
)

# Skapa huvudappen
app = FastAPI(
    title="My API",
    description="Dokumentation för mitt API.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Middleware för CORS
cors_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:8000,http://127.0.0.1:8000,https://supportnet.se,https://www.supportnet.se",
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inkludera routrar
app.include_router(mail_router, prefix="/api", tags=["Contact"])
#app.include_router(user_router, prefix="/api", tags=["User"])
app.include_router(auth_user_router, prefix="/api", tags=["Users"])
app.include_router(analytics_router, prefix="/api", tags=["Analytics"])
app.include_router(contracts_router, prefix="/api", tags=["Contracts"])
#app.include_router(eco_router, prefix="/api", tags=["Economy"])
app.include_router(blog_router, prefix="/api", tags=["blog"])
app.include_router(auth_router, prefix="/userapi")
app.include_router(userboard_router, prefix="/userapi")
#app.include_router(postit_router, prefix="/userapi")
app.include_router(todo_router, prefix="/userapi")
app.include_router(task_router, prefix="/userapi")
app.include_router(doc_router, prefix="/api")
app.include_router(mydocs_router, prefix="/api")
app.include_router(service_router, prefix="/api", tags=["Services"])
#app.include_router(usecase_router, prefix="/userapi")
app.include_router(industries_router, prefix="/api", tags=["Industries"])

# ------------------------------------------------------------------------
# Vår lilla honungsfälla
# ------------------------------------------------------------------------
from fastapi.responses import JSONResponse
from datetime import datetime
import asyncio
import logging
import os

# Trap bot-anrop som försöker nå känsliga filer
SUSPECT_PATHS = [
    "/.env",
    "/config.js",
    "/proxy",
    "/codes.php.save",
    "/config.yml",
    "/api/.git/config",

    # Fler smarta fällor 👇
    "/admin",
    "/phpmyadmin",
    "/wp-login.php",
    "/login.php",
    "/.git",                     # klassiker
    "/.DS_Store",                # Mac-relaterad nyfikenhet
    "/.htaccess",                # Apache-konfig
    "/server-status",           # ofta attackerad
    "/shell.php",               # bots som letar shell
    "/hidden",                  # frestande ord
    "/api/secret",              # låter känsligt
    "/robots.txt",              # ibland avslöjar den hemliga paths
    "/config.json",             # dev-missar

    # Dina egna godbitar:
    "/aina/secret/kiss",        # bara för oss 💋
    "/tord/login/admin_ai",     # för att skoja med dem 😏
]

# Setup logger
logger = logging.getLogger("honeytrap")
logging.basicConfig(filename="honeytrap.log", level=logging.INFO)

# ------------------------------------------------------
# 🛡️ Trap bots middleware
# ------------------------------------------------------

@app.middleware("http")
async def trap_bots(request: Request, call_next):

    path = request.url.path

    # --------------------------------------------------
    # ✅ Tillåt interna routes
    # --------------------------------------------------

    allowed_prefixes = [
        "/admin",
        "/user",
        "/api",
        "/js",
        "/assets",
        "/favicon.ico"
    ]

    if any(path.startswith(prefix) for prefix in allowed_prefixes):
        return await call_next(request)

    # --------------------------------------------------
    # 🤖 Enkel bot-fälla
    # --------------------------------------------------

    user_agent = request.headers.get("user-agent", "").lower()

    suspicious = [
        "curl",
        "wget",
        "python",
        "scanner",
        "bot"
    ]

    if any(bot in user_agent for bot in suspicious):
        return JSONResponse(
            status_code=403,
            content={"error": "Nice try, filthy bot 🐒"}
        )

    return await call_next(request)


# ---------------------------------------------------------------------------------------
# Middleware för att hantera cookies
# ---------------------------------------------------------------------------------------
@app.middleware("http")
async def cookie_middleware(request: Request, call_next):
    print("STEP 1: middleware start")

    response = await call_next(request)

    print("STEP 2: after call_next")

    try:
        print("STEP 3: before analytics")
        log_analytics_hit(request, None)
        print("STEP 4: after analytics")

        print("STEP 5: before cookies")
        # handle_cookies(request, response, None)
        print("STEP 6: after cookies")

    except Exception as e:
        print(f"STEP ERROR: {e}")

    print("STEP 7: return response")
    return response

def log_analytics_hit(request: Request, db: Session):
    try:
        path = request.url.path
        method = request.method
        user_agent = request.headers.get("user-agent", "unknown")
        referrer = request.headers.get("referer", "unknown")
        ip = request.client.host

        logline = f"[ANALYTICS] {method} {path} from {ip} (UA: {user_agent}, Ref: {referrer})"
        print(logline)

        # Du kan här spara till DB om du vill, exempel:
        # db.add(AnalyticsHit(path=path, method=method, ip=ip, ua=user_agent, ref=referrer, timestamp=datetime.utcnow()))
        # db.commit()

    except Exception as e:
        print(f"Analytics logging failed: {e}")


@app.get("/user/auth/userLogin.html")
def login_page():
    return FileResponse(
        os.path.join(BASE_DIR, "user", "auth", "userLogin.html")
    )

app.mount(
    "/user",
    StaticFiles(directory=os.path.join(BASE_DIR, "user")),
    name="user"
)

app.mount(
    "/admin",
    StaticFiles(
        directory=os.path.join(BASE_DIR, "../frontend/admin"),
        html=True
    ),
    name="admin"
)

app.mount(
    "/admin/assets",
    StaticFiles(directory=ADMIN_ASSETS),
    name="admin_assets"
)

app.mount(
    "/js",
    StaticFiles(directory=os.path.join(BASE_DIR, "../frontend/web/js")),
    name="js"
)

@app.get("/{path:path}")
def catch_all(path: str):

    full_path = os.path.join(FRONTEND_ROOT, path.lstrip("/"))

    # exakt fil
    if os.path.isfile(full_path):
        return FileResponse(full_path)

    # snygga routes → pages
    page_path = os.path.join(FRONTEND_ROOT, "pages", path + ".html")

    if os.path.isfile(page_path):
        return FileResponse(page_path)

    return FileResponse(os.path.join(FRONTEND_ROOT, "index.html"))
