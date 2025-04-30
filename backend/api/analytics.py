from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.db.models import AnalyticsLog
from backend.db.database import get_db

import logging

router = APIRouter()

#------------------------------------------------------
# Hämtar geografisk positon för PIen
#------------------------------------------------------

def get_geo_info(ip_address: str) -> str:
    try:
        response = requests.get(f"https://ipapi.co/{ip_address}/city/")
        if response.status_code == 200:
            city = response.text.strip()
            return city if city else "Unknown"
    except Exception as e:
        logging.error(f"GeoIP lookup misslyckades: {e}")
    return "Unknown"

#------------------------------------------------------
# Validierar IP adressen (egna skall exkluderas)
#------------------------------------------------------

def get_valid_ip(request: Request) -> str:
    """Hämtar och validerar klientens IP-adress."""
    client_ip = request.headers.get("X-Real-IP", request.client.host)
    excluded_ips = {"127.0.0.1", "192.168.0.1"}

    if client_ip.strip() in excluded_ips:
        logging.warning(f"Exkluderad IP upptäckt: {client_ip}")
        return None  # Returnera None om IP ska exkluderas

    return client_ip

#----------------------------------------------------
# Hämta alla loggar
#----------------------------------------------------
@router.get("/analytics")
def get_analytics(db: Session = Depends(get_db)):
    try:
        logs = db.query(AnalyticsLog).all()
        
        # Bygg responsen med relevanta fält
        data = [
            {
                "id": log.id,
                "session_id": log.session_id,
                "ip_address": log.ip_address,
                "page_url": log.page_url,
                "action_type": log.action_type,
                "user_agent": log.user_agent,
                "region": log.region,
                "timevisit": log.timevisit,
                "session_time_duration": log.session_time_duration,  # <-- NY RAD här!
                "is_bot": log.is_bot,
            }
            for log in logs
        ]

        return data
    except Exception as e:
        logging.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics data")

#---------------------------------------------------
# Lägg till en ny action i loggen
#---------------------------------------------------
@router.post("/analytics")
def log_action(payload: dict, request: Request, db: Session = Depends(get_db)):
    client_ip = get_valid_ip(request)
    print(f"DEBUG - IP: {client_ip}")
    print(f"DEBUG - Payload: {payload}")

    # Sätt fallback och region
    if not client_ip:
        client_ip = "8.8.8.8"  # fallback IP om klient-IP saknas
        region = "Unknown"
    else:
        region = get_geo_info(client_ip) or "Unknown"

    try:
        session_id = payload.get("session_id")
        page_url = payload.get("page_url")
        action_type = payload.get("action_type")
        session_duration = payload.get("session_duration", 0)
        is_bot = False

        # Kontrollera att session_id är giltigt
        if not session_id or session_id == "undefined" or session_id == "null":
            logging.warning(f"Ignorerad inloggning med ogiltigt session_id: {session_id}")
            return {"message": "Ogiltig session, logg ignorerad"}

        # Klassificera bot om session_end är för kort
        if action_type == "session_end" and session_duration < 3:
            is_bot = True

        # Kolla om vi redan har en logg för samma session_id och page_url
        existing_log = db.query(AnalyticsLog).filter(
            AnalyticsLog.session_id == session_id,
            AnalyticsLog.page_url == page_url
        ).first()

        if existing_log:
            # Om posten finns: uppdatera session_time_duration med skillnaden
            incoming_duration = session_duration or 0
            current_duration = existing_log.session_time_duration or 0

            if incoming_duration > current_duration:
                difference = incoming_duration - current_duration
                existing_log.session_time_duration = current_duration + difference
                db.commit()
                return {"message": "Session updated"}
            else:
                # Om ingen ny tid, behåll befintligt
                db.commit()
                return {"message": "Session unchanged (no duration increase)"}
        else:
            # Om ingen post finns: skapa ny loggpost
            new_entry = AnalyticsLog(
                session_id=session_id,
                ip_address=client_ip,
                page_url=page_url,
                action_type=action_type,
                user_agent=payload.get("user_agent"),
                region=region,
                timevisit=func.now(),
                session_time_duration=session_duration,
                is_bot=is_bot,
            )
            db.add(new_entry)
            db.commit()
            return {"message": "Log saved successfully"}

    except Exception as e:
        db.rollback()
        logging.error(f"Error logging action: {e}")
        raise HTTPException(status_code=500, detail=f"Error logging action: {e}")

#-------------------------------------------------------------
# Ta bort alla loggar
#-------------------------------------------------------------
@router.delete("/analytics")
def clear_logs(db: Session = Depends(get_db)):
    try:
        db.query(AnalyticsLog).delete()
        db.commit()
        return {"message": "All logs cleared"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing logs: {e}")



