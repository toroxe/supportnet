from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import Usecase
from pydantic import BaseModel
from enum import Enum as PyEnum
from datetime import date

router = APIRouter()

# ------------------------------
# 📦 Pydantic-modell för indata
# ------------------------------
class FeedbackTimeEnum(PyEnum):
    omedelbart = "omedelbart"
    inom_timmar = "inom timmar"
    inom_dagar = "inom dagar"
    aldrig_riktigt_säkert = "aldrig riktigt säkert"

class UsecasePayload(BaseModel): 
    user_id: int
    contract_id: int
    username: str
    created_date: date = date.today()

    frustration: str
    waste: str | None = None
    critical: str | None = None
    errors: str | None = None
    unused_data: str | None = None
    feedback_time: FeedbackTimeEnum | None = None
    accounting: str | None = None
    erp_system: str | None = None

    analysis: str | None = None
    suggestions: str | None = None


# ------------------------------
# 🚀 POST /usecase
# ------------------------------
@router.post("/usecase")
def create_usecase(payload: UsecasePayload, db: Session = Depends(get_db)):
    # Kontrollera om kontrakt redan har en analys
    existing = db.query(Usecase).filter(Usecase.contract_id == payload.contract_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Analys för detta kontrakt finns redan.")

    new_entry = Usecase(**payload.model_dump())
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return {"message": "Analys inskickad", "id": new_entry.id}

# ------------------------------
# 🔍 GET /usecase/{contract_id}
# ------------------------------
@router.get("/usecase/{contract_id}")
def get_usecase(contract_id: int, db: Session = Depends(get_db)):
    result = db.query(Usecase).filter(Usecase.contract_id == contract_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Ingen analys hittades för kontraktet.")
    return result
