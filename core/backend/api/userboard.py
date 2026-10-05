# File: core/backend/api/userboard.py
# Version: 2026.10.05-01
# Source: UTV
# Status: VERIFIED
# Verified: Tord UA/PASS 2026-10-05 UTV: Notes access 401/403/200, fel kontrakt 403, dashboard 200
# ------------------------------------------------------------

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.backend.auth.security import verify_token
from core.backend.db.database import get_db
from core.backend.db.models import Contract, ContractServices, User


router = APIRouter()


SERVICE_NAMES = {
    "member": "Member",
    "userdoc": "User Documents",
    "todo": "To-Do List",
    "postit": "Post-It Notes",
    "inbound": "Inbound Management",
    "survey": "Survey Access",
}


@router.get("/dashboard")
def get_dashboard(
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    contract_id = token_data["contract_id"]

    services = (
        db.query(ContractServices)
        .filter(ContractServices.contract_id == contract_id)
        .first()
    )

    active_services = []

    if services:
        for field, name in SERVICE_NAMES.items():
            if getattr(services, field, False):
                active_services.append(name)

    return {
        "status": "OK",
        "data": {
            "services": active_services
        }
    }


@router.get("/apps/notes/access")
def get_notes_access(
    token_data: dict = Depends(verify_token),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.user_id == token_data["user_id"])
        .first()
    )

    if (
        user is None
        or not user.active
        or str(user.status).upper() != "ACTIVE"
        or user.contract_id != token_data["contract_id"]
    ):
        raise HTTPException(status_code=403, detail="Notes access denied")

    contract = (
        db.query(Contract)
        .filter(Contract.contract_id == user.contract_id)
        .first()
    )

    if contract is None or not contract.status:
        raise HTTPException(status_code=403, detail="Notes access denied")

    services = (
        db.query(ContractServices)
        .filter(ContractServices.contract_id == user.contract_id)
        .first()
    )

    if services is None or not services.postit:
        raise HTTPException(status_code=403, detail="Notes access denied")

    return {
        "app_id": "APP-NOTES-001",
        "decision": "ALLOW",
        "user_id": user.user_id,
        "contract_id": user.contract_id,
    }
