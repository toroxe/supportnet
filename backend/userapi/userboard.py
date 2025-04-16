# 📁 backend/userapi/userboard.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette.status import HTTP_401_UNAUTHORIZED

# 🔐 Säkerhet och autentisering
from backend.auth.security import verify_token

# 🧠 Databasåtkomst
from backend.db.database import get_db
from backend.db.models import User, Contract, ContractServices

router = APIRouter()

@router.get("/dashboard")
def get_dashboard(token_data: dict = Depends(verify_token), db: Session = Depends(get_db)):
    print("🔥 DEBUG: /dashboard anropades!")

    # Hämta användaren baserat på user_id från token
    user = db.query(User).filter(User.user_id == token_data.get("user_id")).first()
    if not user:
        raise HTTPException(status_code=404, detail="Användare saknas")

    # Säkerställ att användaren har ett kontrakt kopplat
    if not user.contract_id:
        raise HTTPException(status_code=404, detail="Användaren saknar kontrakt")

    # Hämta kontraktet
    contract = db.query(Contract).filter(Contract.contract_id == user.contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Kontrakt saknas")

    # Hämta tjänster
    contract_id = token_data.get("contract_id")
    services = db.query(
    ContractServices.id,
    ContractServices.contract_id,
    ContractServices.member,
    ContractServices.userdoc,
    ContractServices.todo,
    ContractServices.postit,
    ContractServices.inbound,
    ContractServices.survey
).filter(ContractServices.contract_id == contract_id).first()

    if not services:
        raise HTTPException(status_code=404, detail="Inga tjänster hittades")

    # 🧰 Lista aktiva tjänster
    service_list = []
    if services.member: service_list.append("Member")
    if services.userdoc: service_list.append("User Documents")
    if services.todo: service_list.append("To-Do List")
    if services.postit: service_list.append("Post-It Notes")
    if services.inbound: service_list.append("Inbound Management")
    if services.survey: service_list.append("Survey Access")

    return {
        "status": "OK",
        "message": "Dashboard-data hämtad korrekt",
        "data": {
            "user": {
                "id": user.user_id,
                "name": f"{user.c_name} {user.s_name}"
            },
            "contract_id": user.contract_id,
            "contract": {
                "id": contract.contract_id,
                "name": contract.company_name
            },
            "services": service_list
        }
    }

