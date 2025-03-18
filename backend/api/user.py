from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from enum import Enum
from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from backend.db.database import get_db
from backend.db.models import User
from backend.api.contracts import Contract
from backend.utils import hash_password
import logging

router = APIRouter()

# Pydantic-modeller
class UserSchema(BaseModel):
    id: Optional[int] = None
    c_name: str
    s_name: str
    email: str
    role: str
    status: str
    password_hash: str
    session_cookie: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    company_name: str
    rights: str
    active: bool  # ✅ Lägger till active

    class Config:
        from_attributes = True

# -------------------------------------------------------------------------------
# GET: Alla användare
# -------------------------------------------------------------------------------
@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    return db.query(User).all()

# -----------------------------------------------------------------------------
# GET: En specifik user
# ----------------------------------------------------------------------------
@router.get("/users/{user_id}", response_model=dict)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Användare hittades inte")

    return {
        "id": user.id,
        "name": f"{user.c_name} {user.s_name}",
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "company_name": user.company_name,  # ✅ Återställd
        "rights": user.rights,  # ✅ Återställd
        "password_hash": user.password_hash  # 🔥 Lägger till lösenordet i svaret
    }

# ----------------------------------------------------------------------------
# POST: Skapa en ny användare
# ----------------------------------------------------------------------------
@router.post("/users", response_model=UserSchema)
def create_user(user: UserSchema, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="E-postadressen används redan!")

    try:
        hashed_password = hash_password(user.password_hash)  # Hasha lösenordet
        new_user = User(
            c_name=user.c_name,
            s_name=user.s_name,
            email=user.email,
            password_hash=hashed_password,  # Sparar hashat lösenord
            role="CUSTOMER",
            status="ACTIVE",
            company_name="MySupportNet",  # Default företagsnamn
            rights="READ",
            active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Fel: Dubbel e-post!")

# ---------------------------------------------------------------------------
# PUT: Uppdatera en användare
# ---------------------------------------------------------------------------
@router.put("/users/{user_id}", response_model=UserSchema)
def update_user(user_id: int, updated_data: UserSchema, db: Session = Depends(get_db)):
    # Hämta befintlig användare från databasen
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Användaren hittades inte!")

    try:
        # Uppdatera övriga fält
        user.c_name = updated_data.c_name
        user.s_name = updated_data.s_name
        user.email = updated_data.email
        user.role = updated_data.role
        user.status = updated_data.status
        user.rights = updated_data.rights
        user.company_name = updated_data.company_name
        user.active = updated_data.active

        # Endast uppdatera lösenord om ett nytt anges i klartext
        if updated_data.password_hash:
            if not updated_data.password_hash.startswith("$2b$"):  # Kontrollera om det redan är hashat
                user.password_hash = hash_password(updated_data.password_hash)
            else:
                user.password_hash = updated_data.password_hash  # Behåll befintlig hash


        # Spara ändringarna i databasen
        db.commit()
        db.refresh(user)
        return user

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Fel vid uppdatering av användare.")

# ---------------------------------------------------------------------------
# DELETE: Radera en användare
# ---------------------------------------------------------------------------
@router.delete("/users/{user_id}", response_model=dict)
def delete_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Användare hittades inte")

    # 🛑 Hämta all relevant data innan radering
    deleted_user_data = {
        "id": user.id,
        "name": f"{user.c_name} {user.s_name}",
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "company_name": user.company_name,  # ✅ Återställd
        "rights": user.rights  # ✅ Återställd
    }

    # 🗑️ Ta bort användaren från databasen
    db.delete(user)
    db.commit()

    return {"message": "Användare raderad", "user": deleted_user_data}







