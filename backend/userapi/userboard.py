from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import User, Contract, ContractServices

router = APIRouter()

@router.get("/dashboard")
def company_services(db: Session = Depends(get_db)):
    print("🔥 DEBUG: /dashboard anropades!")  # Logga om endpointen nås

    # Hämta en testanvändare från databasen
    user_data = db.query(User).first()
    if not user_data:
        raise HTTPException(status_code=404, detail="Ingen användare hittad i DB")

    # Hämta kontraktet för användarens företag (för att få rätt contract_id)
    contract = db.query(Contract).filter(Contract.company_name == user_data.company_name).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Inget kontrakt hittades för företaget")

    # Hämta tjänster kopplade till contract_id
    services = db.query(ContractServices).filter(ContractServices.contract_id == contract.id).first()

    # Om vi har ett tjänsteobjekt, returnera aktiva tjänster
    service_list = []
    if services:
        if services.member: service_list.append("Member")
        if services.userdoc: service_list.append("User Documents")
        if services.todo: service_list.append("To-Do List")
        if services.postit: service_list.append("Post-It Notes")
        if services.inbound: service_list.append("Inbound Management")
        if services.survey: service_list.append("Survey Access")

    return {
        "status": "OK",
        "message": "Data hämtad från databasen",
        "data": {
            "user": {"id": user_data.id, "name": f"{user_data.c_name} {user_data.s_name}"},
            "company": user_data.company_name,
            "contract": {"id": contract.id, "name": contract.company_name},
            "services": service_list
        }
    }


