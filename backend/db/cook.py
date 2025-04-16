import logging
from fastapi import Request, Response
from sqlalchemy.orm import Session
from backend.db.models import AnalyticsLog
from backend.db.database import get_db
import uuid
import requests


def handle_cookies(request: Request, response: Response, db: Session):
    """
    Hanterar cookies och loggar analytics-data.
    """
    try:
        # Generera eller använd befintlig session_id
        session_cookie = request.cookies.get("session_id")
        if not session_cookie:
            session_cookie = str(uuid.uuid4())
            response.set_cookie(key="session_id", value=session_cookie, httponly=True)

        # Logga request till databasen
        log_request_data(request, db, session_cookie)
    except Exception as e:
        logging.error(f"Cookie handling error: {str(e)}")

def log_request_data(request: Request, db: Session, session_id: str):
    """
    Log a request to the database.
    """
    try:
        user_agent = request.headers.get("user-agent", "Unknown")
        geo_data = {"region": "Okänd, Okänd"}
        ip_address = request.client.host if request.client else "Okänd"

        # Kontrollera geolocation om IP inte är lokal
        if not ip_address.startswith("192.168") and not ip_address.startswith("127.0.0.1"):
            try:
                geo_response = requests.get(f"http://ip-api.com/json/{ip_address}")
                geo_data = geo_response.json()
            except Exception as e:
                logging.error(f"Geolocation error: {str(e)}")

        # Klassificera användaren baserat på user-agent
        is_bot = 1 if "bot" in user_agent.lower() else 0
        device_type = "Mobil" if "mobile" in user_agent.lower() else "PC"
        if is_bot:
            device_type = "Bot"

        # Logga request i databasen
        analytics_entry = AnalyticsLog(
            session_id=session_id,
            ip_address=ip_address,
            page_url=request.url.path,
            action_type=request.method,
            region=f"{geo_data.get('city', 'Okänd')}, {geo_data.get('country', 'Okänd')}",
            user_agent=device_type,  # Spara användartyp (PC, Mobil, Bot)
            is_bot=is_bot
        )

        db.add(analytics_entry)
        db.commit()
    except Exception as e:
        db.rollback()
        logging.error(f"Database logging error: {str(e)}")
