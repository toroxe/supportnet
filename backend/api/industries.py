from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import Industry
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/industries", tags=["industries"])

# ---------------------------
# 🧠 Pydantic-schema
# ---------------------------
class IndustrySchema(BaseModel):
    ind_id: Optional[int] = None
    name: str
    note: Optional[str] = None
    active: bool = True

    class Config:
        from_attributes = True

# ---------------------------
# 🔍 GET - Hämta alla industrier
# ---------------------------
@router.get("/", response_model=List[IndustrySchema])
def get_all_industries(db: Session = Depends(get_db)):
    return db.query(Industry).order_by(Industry.name).all()

# ---------------------------
# 🆕 POST - Skapa ny bransch
# ---------------------------
@router.post("/", response_model=IndustrySchema)
def create_(payload: IndustrySchema, db: Session = Depends(get_db)):
    new_industry = Industry(
        name=payload.name,
        note=payload.note,
        active=payload.active
    )
    db.add(new_industry)
    db.commit()
    db.refresh(new_industry)
    return new_industry

# ---------------------------
# ✏️ PUT - Uppdatera bransch
# ---------------------------
@router.put("/{ind_id}", response_model=IndustrySchema)
def update_industry(ind_id: int, payload: IndustrySchema, db: Session = Depends(get_db)):
    industry = db.query(Industry).filter(Industry.ind_id == ind_id).first()
    if not industry:
        raise HTTPException(status_code=404, detail="Bransch hittades inte")

    industry.name = payload.name
    industry.note = payload.note
    industry.active = payload.active
    db.commit()
    return industry

# ---------------------------
# ❌ DELETE - Radera bransch
# ---------------------------
@router.delete("/{ind_id}", response_model=dict)
def delete_industry(ind_id: int, db: Session = Depends(get_db)):
    industry = db.query(Industry).filter(Industry.ind_id == ind_id).first()
    if not industry:
        raise HTTPException(status_code=404, detail="Bransch finns inte")
    db.delete(industry)
    db.commit()
    return {"message": "Bransch raderad"}
