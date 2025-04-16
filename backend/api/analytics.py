from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.db.models import AnalyticsLog
from backend.db.database import get_db

import logging

router = APIRouter()

def get_valid_ip(request: Request) -> str:
    """Hämtar och validerar klientens IP-adress."""
    client_ip = request.headers.get("X-Real-IP", request.client.host)
    excluded_ips = {"127.0.0.1", "192.168.0.1"}

    if client_ip.strip() in excluded_ips:
        logging.warning(f"Exkluderad IP upptäckt: {client_ip}")
        return None  # Returnera None om IP ska exkluderas

    return client_ip

# Hämta alla loggar
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
                "is_bot": log.is_bot,
            }
            for log in logs
        ]

        return data
    except Exception as e:
        logging.error(f"Error fetching analytics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch analytics data")


# Lägg till en ny action i loggen
@router.post("/analytics")
def log_action(payload: dict, request: Request, db: Session = Depends(get_db)):
    client_ip = get_valid_ip(request)

    if not client_ip:
        return {"message": "IP exkluderades och loggas ej"}

    try:
        new_entry = AnalyticsLog(
            session_id=payload["session_id"],
            ip_address=client_ip,
            page_url=payload.get("page_url"),
            action_type=payload.get("action_type"),
            user_agent=payload.get("user_agent"),
            region=payload.get("region", "Unknown"),
            is_bot=payload.get("is_bot", False),
        )
        db.add(new_entry)
        db.commit()
        return {"message": "Log saved successfully"}
    except Exception as e:
        db.rollback()
        logging.error(f"Error logging action: {e}")
        raise HTTPException(status_code=500, detail=f"Error logging action: {e}")

# Ta bort alla loggar
@router.delete("/analytics")
def clear_logs(db: Session = Depends(get_db)):
    try:
        db.query(AnalyticsLog).delete()
        db.commit()
        return {"message": "All logs cleared"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error clearing logs: {e}")



