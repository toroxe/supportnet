from fastapi import APIRouter, HTTPException, Depends, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from enum import Enum
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from datetime import datetime
from typing import Optional, List
from core.backend.db.database import get_db
from core.backend.db.models import User
from core.backend.api.contracts import Contract
from core.backend.auth.security import get_current_user
from core.backend.utils import hash_password
import logging

router = APIRouter()


def require_admin(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    current_user = db.query(User).filter(User.user_id == current_user_id).first()
    if not current_user or not current_user.active or current_user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Administratörsbehörighet krävs")
    return current_user

# Pydantic-modeller
class UserSchema(BaseModel):
    user_id: Optional[int] = None
    c_name: str
    s_name: str
    email: str
    role: str
    status: str
    password_hash: str | None = None  # 🟢 Måste finnas
    session_cookie: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    contract_id: Optional[int] = 1
    rights: str
    active: bool  # ✅ Lägger till active

    class Config:
        from_attributes = True


class PublicUserCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    c_name: str = Field(min_length=1, max_length=100)
    s_name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class AdminUserCreateSchema(PublicUserCreateSchema):
    role: str
    status: str
    rights: str
    active: bool = True
    contract_id: int = 1

# -------------------------------------------------------------------------------
# GET: Alla användare
# -------------------------------------------------------------------------------
@router.get("/users")
def get_all_users(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    users = db.query(
        User.user_id.label("id"),
        User.contract_id,
        User.c_name,
        User.s_name,
        User.email,
        User.status,
        User.role,
        User.rights,
        Contract.company_name
    ).join(
        Contract, User.contract_id == Contract.contract_id, isouter=True  # 🧠 Byt till outer join
    ).all()

    users_json = []
    for user in users:
        users_json.append({
            "id": user.id,
            "contract_id": user.contract_id,
            "company_name": user.company_name or "saknas",  # Lägg till fallback
            "full_name": f"{user.c_name} {user.s_name}",
            "email": user.email,
            "status": user.status,
            "role": user.role,
            "rights": user.rights
        })

    return users_json

# -----------------------------------------------------------------------------
# GET: En specifik user
# ----------------------------------------------------------------------------
@router.get("/users/{user_id}", response_model=dict)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Användare hittades inte")

    return {
        "id": user.user_id,  # ✅
        "contract_id": user.contract_id,  # 🟢 Lägg till detta
        "name": f"{user.c_name} {user.s_name}",
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "rights": user.rights
    }

# ----------------------------------------------------------------------------
# POST: Skapa en ny användare
# ----------------------------------------------------------------------------
@router.post("/users")
def create_user(payload: PublicUserCreateSchema, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Användare med denna e-post finns redan")

    new_user = User(
        c_name=payload.c_name,
        s_name=payload.s_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role="CUSTOMER",
        status="ACTIVE",
        rights="READ",
        active=True,
        contract_id=1
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Användare skapad",
        "user_id": new_user.user_id,
        "email": new_user.email,
        "c_name": new_user.c_name,
        "s_name": new_user.s_name
    }


@router.post("/admin/users")
def create_admin_managed_user(
    payload: AdminUserCreateSchema,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Användare med denna e-post finns redan")

    new_user = User(
        c_name=payload.c_name,
        s_name=payload.s_name,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        status=payload.status,
        rights=payload.rights,
        active=payload.active,
        contract_id=payload.contract_id,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "Användare skapad",
        "user_id": new_user.user_id,
        "email": new_user.email,
        "c_name": new_user.c_name,
        "s_name": new_user.s_name,
    }

# ---------------------------------------------------------------------------
# PUT: Uppdatera en användare
# ---------------------------------------------------------------------------
@router.put("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UserSchema,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Användaren hittades inte")

    user.c_name = payload.c_name
    user.s_name = payload.s_name
    user.email = payload.email
    user.role = payload.role
    user.status = payload.status
    user.rights = payload.rights
    user.active = payload.active if payload.active is not None else user.active
    user.contract_id = payload.contract_id if payload.contract_id else user.contract_id

    db.commit()
    db.refresh(user)

    return {"message": "Användare uppdaterad", "user_id": user.user_id}

# ---------------------------------------------------------------------------
# DELETE: Radera en användare
# ---------------------------------------------------------------------------
@router.delete("/users/{user_id}", response_model=dict)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.user_id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Användare hittades inte")

    # 🛑 Hämta all relevant data innan radering
    deleted_user_data = {
        "id": user.user_id,  # ✅
        "name": f"{user.c_name} {user.s_name}",
        "email": user.email,
        "role": user.role,
        "status": user.status,
        "rights": user.rights  # ✅ Återställd
    }

    # 🗑️ Ta bort användaren från databasen
    db.delete(user)
    db.commit()

    return {"message": "Användare raderad", "user": deleted_user_data}




