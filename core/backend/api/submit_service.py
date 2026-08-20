from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from core.backend.db.database import get_db
from core.backend.db.models import ServiceRequest
from core.backend.api.mail import send_info_email
import os

router = APIRouter()

# 💡 Inkommande payload från frontend
class ServiceForm(BaseModel):
    name: str
    company: str
    email: EmailStr
    service_choice: str  # "knowledge", "advice", "services"

# 🔍 Kontroll om e-post redan finns
@router.get("/check-email")
async def check_email(email: str, db: Session = Depends(get_db)):
    user = db.query(ServiceRequest).filter(ServiceRequest.email == email).first()
    if not user:
        return {"exists": False, "services": []}

    selected = []
    if user.knowledge:
        selected.append("knowledge")
    if user.advice:
        selected.append("advice")
    if user.services:
        selected.append("services")

    return {"exists": True, "services": selected}

# 📬 Skapa ny användare + maila
@router.post("/submit-service")
async def submit_service(payload: ServiceForm, db: Session = Depends(get_db)):
    existing = db.query(ServiceRequest).filter(ServiceRequest.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Användare finns redan. Använd PATCH istället.")

    # Skapa ny rad i databasen
    new_user = ServiceRequest(
        name=payload.name,
        company=payload.company,
        email=payload.email,
        knowledge=1 if payload.service_choice == "knowledge" else 0,
        advice=1 if payload.service_choice == "advice" else 0,
        services=1 if payload.service_choice == "services" else 0,
    )
    db.add(new_user)
    db.commit()

    await send_info_email(
        email=payload.email,
        cc="tord@supportnet.se",
        subject="Tack för ditt intresse",
        message=generate_message(payload),
        attachment=get_attachment_name(payload.service_choice)
    )

    return {"message": "Tjänst registrerad och informationen skickad."}

# ✏️ Uppdatera befintlig användares tjänst
@router.patch("/update-service")
async def update_service(payload: ServiceForm, db: Session = Depends(get_db)):
    user = db.query(ServiceRequest).filter(ServiceRequest.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Användaren hittades inte.")

    updated = False
    if payload.service_choice == "knowledge" and not user.knowledge:
        user.knowledge = 1
        updated = True
    elif payload.service_choice == "advice" and not user.advice:
        user.advice = 1
        updated = True
    elif payload.service_choice == "services" and not user.services:
        user.services = 1
        updated = True

    if not updated:
        raise HTTPException(status_code=409, detail="Tjänsten är redan vald.")

    db.commit()

    await send_info_email(
        email=payload.email,
        cc="tord@supportnet.se",
        subject="Tjänsten har uppdaterats",
        message=generate_message(payload),
        attachment=get_attachment_name(payload.service_choice)
    )

    return {"message": "Tjänst uppdaterad och bekräftelse skickad."}

# 🧠 Enkel text för e-postmeddelandet
def generate_message(payload: ServiceForm) -> str:
    return f"""
Hej!

Här kommer lite mer information om tjänsten: {payload.service_choice.capitalize()}. 
Om du finner den intressant så låt mig veta, så berätta mer.

Med vänliga hälsningar

//Tord
"""

# 📎 Hämta rätt fil att bifoga
def get_attachment_name(service_choice: str) -> str:
    file_map = {
        "knowledge": "knowledge.pdf",
        "advice": "advice.pdf",
        "services": "services.pdf"
    }
    return file_map.get(service_choice)

