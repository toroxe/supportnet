# File: core/backend/auth/auth.py
# Version: 2026.10.04-1534
# Source: UTV
# Status: VERIFIED
# Verified: Tord UA/PASS 2026-10-04 – vanlig login och adminlogin
# ------------------------------------------------------------

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from core.backend.db.database import get_db
from core.backend.db.models import User
from core.backend.auth.security import (
    verify_password,
    create_access_token,
    get_current_user,
)
try:
    from core.backend.aina_broker_client import decision_for_user
except ImportError:
    decision_for_user = None


router = APIRouter()


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()

    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=400,
            detail="Felaktigt användarnamn eller lösenord!",
        )

    if not user.active or str(user.status).upper() != "ACTIVE":
        raise HTTPException(
            status_code=403,
            detail="Användarkontot är inte aktivt",
        )

    iam_decision = None

    if user.aina_uid and decision_for_user:
        iam_decision = decision_for_user(
            user.aina_uid,
            "RES_AINA_Applications",
            "admin",
            "AINA",
        )

    token_payload = {
        "sub": user.email,
        "user_id": user.user_id,
        "contract_id": user.contract_id,
        "c_name": user.c_name,
        "s_name": user.s_name,
        "aina_uid": user.aina_uid,
        "role": user.role,
        "rights": user.rights,
        "status": user.status,
        "active": bool(user.active),
        "iam_decision": iam_decision.get("decision") if iam_decision else None,
        "iam_role": iam_decision.get("role") if iam_decision else None,
        "iam_policy": iam_decision.get("policy") if iam_decision else None,
    }

    token = create_access_token(token_payload)

    return {
        "token": token,
        "token_type": "bearer",
        "user": {
            "user_id": user.user_id,
            "contract_id": user.contract_id,
            "c_name": user.c_name,
            "s_name": user.s_name,
            "email": user.email,
            "aina_uid": user.aina_uid,
            "role": user.role,
            "rights": user.rights,
            "status": user.status,
            "active": bool(user.active),
            "iam_decision": iam_decision.get("decision") if iam_decision else None,
            "iam_role": iam_decision.get("role") if iam_decision else None,
        },
    }


@router.get("/user/profile")
def get_user_profile(
    current_user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.user_id == current_user_id).first()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="Användaren finns inte",
        )

    return {
        "user_id": user.user_id,
        "contract_id": user.contract_id,
        "c_name": user.c_name,
        "s_name": user.s_name,
        "email": user.email,
        "role": user.role,
        "rights": user.rights,
        "status": user.status,
        "active": bool(user.active),
    }
