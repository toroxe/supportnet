from fastapi import FastAPI, Request, Response, Depends
from fastapi.middleware.cors import CORSMiddleware
from backend.db.database import get_db
from backend.db.cook import handle_cookies
from backend.api.mail import router as mail_router
from backend.api.user import router as user_router
from backend.api.analytics import router as analytics_router
from backend.api.contracts import router as contracts_router
from backend.api.eco import router as eco_router
from backend.api.upload import router as doc_router # Hantera dokument
from backend.api.blogadmin import router as  blog_router # Importera routern från blogAdmin.py
from backend.api.docs import router as mydocs_router
from backend.api.submit_service import router as service_router
from backend.userapi.auth import router as auth_router
from backend.userapi.userboard import router as userboard_router
from backend.userapi.post_it import router as postit_router
from backend.userapi.todo import router as todo_router
from backend.userapi.task import router as task_router
from fastapi.staticfiles import StaticFiles


import logging

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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://my.supportnet.se"],
    allow_methods=["*"],
    allow_headers=["*"],
) 

# Inkludera routrar
app.include_router(mail_router, prefix="/api", tags=["Contact"])
app.include_router(user_router, prefix="/api", tags=["User"])
app.include_router(analytics_router, prefix="/api", tags=["Analytics"])
app.include_router(contracts_router, prefix="/api", tags=["Contracts"])
app.include_router(eco_router, prefix="/api", tags=["Economy"])
app.include_router(blog_router, prefix="/api", tags=["blog"])
app.include_router(auth_router, prefix="/userapi")
app.include_router(userboard_router, prefix="/userapi")
app.include_router(postit_router, prefix="/userapi")
app.include_router(todo_router, prefix="/userapi")
app.include_router(task_router, prefix="/userapi")
app.include_router(doc_router, prefix="/api")
app.mount("/mydocs", StaticFiles(directory="backend/db/mydocs"), name="mydocs")
app.include_router(mydocs_router, prefix="/api")
app.include_router(service_router, prefix="/api", tags=["Services"])


# Middleware för att hantera cookies
@app.middleware("http")
async def cookie_middleware(request: Request, call_next):
    db = next(get_db())  # Generera en sessionsinstans
    response = Response("Internal server error", status_code=500)  # Standardrespons

    # Endpoints att exkludera från cookie-hantering
    excluded_paths = ["/api/analytics", "/api/user", "/docs", "/openapi.json"]

    try:
        if request.url.path not in excluded_paths:
            # Anropa handle_cookies endast om path inte exkluderas
            handle_cookies(request, response, db)
        response = await call_next(request)  # Fortsätt till nästa nivå
    except Exception as e:
        logging.error(f"Middleware error: {str(e)}")
    finally:
        db.close()  # Stäng databasen
    return response

# Root-endpoint
@app.get("/")
def read_root():
    return {"message": "Welcome to the API!"}
