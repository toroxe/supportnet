from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.backend.auth.security import verify_token
from core.backend.db.database import get_db
from core.backend.db.models import ContractServices


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
