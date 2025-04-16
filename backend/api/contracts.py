from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import Column, Integer, Boolean, ForeignKey
from sqlalchemy.orm import Session, relationship, joinedload
from backend.db.database import get_db, Base
from backend.db.models import Contract, User, ContractServices
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

router = APIRouter()

# -----------------------
# 📌 Pydantic-modell för kontrakt
# -----------------------
class ContractPayload(BaseModel):
    contract_id: Optional[int] = None  # 🔁 Ändrat från id
    company_name: str
    industry_id: Optional[int] = None
    industry_name: Optional[str] = None  # för frontend grid
    ref_person: str
    email: str
    phone: str
    zip: str
    address: str
    city: str
    credit_assessed: bool = True
    pay_cond: str
    invoice_model: Optional[str] = None
    registration_date: Optional[datetime] = None  # Hanteras av DB
    status: bool = True  # Default = Aktivt kontrakt
    services: List[dict] = []  # 🔥 Nytt! Gör att services alltid finns

    class Config:
        from_attributes = True

# -----------------------
# 📌 Hämta alla kontrakt och alla tjänster
# -----------------------
@router.get("/contracts", response_model=List[ContractPayload])
def get_all_contracts(db: Session = Depends(get_db)):
    contracts = db.query(Contract).options(joinedload(Contract.services)).all()

    return [
        ContractPayload(
            contract_id=contract.contract_id,
            company_name=contract.company_name,
            industry_id=contract.industry_id,
            industry_name=contract.industry.name if contract.industry else None,
            status=contract.status,
            ref_person=contract.ref_person,
            registration_date=contract.registration_date.isoformat() if contract.registration_date else None,
            credit_assessed=contract.credit_assessed,
            email=contract.email,
            phone=contract.phone,
            invoice_model=contract.invoice_model,
            zip=contract.zip,
            address=contract.address,
            city=contract.city,
            pay_cond=contract.pay_cond,
            services=[
                {
                    "member": s.member,
                    "userdoc": s.userdoc,
                    "todo": s.todo,
                    "postit": s.postit,
                    "inbound": s.inbound,
                    "survey": s.survey
                } for s in contract.services
            ] if contract.services else []
        ) for contract in contracts
    ]

# -------------------------
# 📌 Hämta ett specifikt kontrakt baserat på ID
# -------------------------
@router.get("/contracts/{contract_id}", response_model=ContractPayload)
def get_contract_by_id(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).options(joinedload(Contract.services)).filter(Contract.contract_id == contract_id).first()
    
    if not contract:
        raise HTTPException(status_code=404, detail="Kontraktet hittades inte")
    
    return ContractPayload(
        contract_id=contract.contract_id,
        company_name=contract.company_name,
        industry_id=contract.industry_id,
        industry_name=contract.industry.name if contract.industry else None,
        status=contract.status,
        ref_person=contract.ref_person,
        registration_date=contract.registration_date.isoformat() if contract.registration_date else None,
        credit_assessed=contract.credit_assessed,
        email=contract.email,
        phone=contract.phone,
        invoice_model=contract.invoice_model,
        zip=contract.zip,
        address=contract.address,
        city=contract.city,
        pay_cond=contract.pay_cond,
        services=[
            {
                "member": s.member,
                "userdoc": s.userdoc,
                "todo": s.todo,
                "postit": s.postit,
                "inbound": s.inbound,
                "survey": s.survey
            } for s in contract.services
        ] if contract.services else []
    )

# ---------------------------------------------------------------------------------------
# 📌 Skapa nytt kontrakt
# ---------------------------------------------------------------------------------------
@router.post("/contracts")
def create_contract(payload: ContractPayload, db: Session = Depends(get_db)):
    print("💾 Får in data:", payload)  # 🔥 Loggar hela request payload

    # ✅ Skapa och spara kontraktet först
    new_contract = Contract(
        company_name=payload.company_name,
        ref_person=payload.ref_person,
        industry_id=payload.industry_id,
        email=payload.email,
        phone=payload.phone,
        zip=payload.zip,
        address=payload.address,
        city=payload.city,
        credit_assessed=payload.credit_assessed,
        pay_cond=payload.pay_cond,
        invoice_model=payload.invoice_model,
        registration_date=payload.registration_date if payload.registration_date else None,
        status=payload.status
    )
    db.add(new_contract)
    db.commit()  # 🔥 Viktigt! Vi måste committa först så att new_contract får ett ID
    db.refresh(new_contract)  # 🔄 Uppdaterar objektet med det nya ID:t

    print("✅ Kontrakt skapat, ID:", new_contract.contract_id)

    # ✅ Skapa och spara tjänster om de finns
    if payload.services and isinstance(payload.services, list):
        for service in payload.services:
            print("🔹 Lägger till tjänst:", service)  # 🔥 Debug-logg

            new_service = ContractServices(
                contract_id=new_contract.contract_id,  # 🔥 ID:t är nu tillgängligt!
                member=service.get("member", False),
                userdoc=service.get("userdoc", False),
                todo=service.get("todo", False),
                postit=service.get("postit", False),
                inbound=service.get("inbound", False),
                survey=service.get("survey", False),  # 🔥 Lägg till denna
            )
            db.add(new_service)

        db.commit()  # ✅ Andra commit för att spara tjänster
        print("✅ Alla tjänster sparade!")
    else:
        print("⚠️ Inga tjänster att spara.")

    return {"message": "Kontrakt + tjänster skapade", "id": new_contract.contract_id, "status": new_contract.status}

# -----------------------
# 📌 Uppdatera kontrakt
# -----------------------
@router.put("/contracts/{contract_id}")
def update_contract(contract_id: int, payload: ContractPayload, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.contract_id == contract_id).first()
    if not contract:
        raise HTTPException(status_code=404, detail="Kontraktet hittades inte")

    # ✅ Uppdatera kontraktsdata
    contract.company_name = payload.company_name
    contract.ref_person = payload.ref_person
    contract.industry_id = payload.industry_id
    contract.email = payload.email
    contract.phone = payload.phone
    contract.zip = payload.zip
    contract.address = payload.address
    contract.city = payload.city
    contract.credit_assessed = payload.credit_assessed
    contract.pay_cond = payload.pay_cond
    contract.invoice_model = payload.invoice_model
    contract.status = payload.status

    db.commit()
    db.refresh(contract)

    print("✅ Kontrakt uppdaterat:", contract.contract_id)

    # ✅ Ta bort gamla tjänster innan vi lägger till nya
    db.query(ContractServices).filter(ContractServices.contract_id == contract.contract_id).delete()

    db.commit()

    # ✅ Lägg till nya tjänster – här rättar vi till strukturen
    if payload.services:
        for service in payload.services:
            if isinstance(service, dict):  # 🔥 Säkerställ att det är en dict
                new_service = ContractServices(
                    contract_id=contract.contract_id,
                    member=service.get("member", False),
                    userdoc=service.get("userdoc", False),
                    todo=service.get("todo", False),
                    postit=service.get("postit", False),
                    inbound=service.get("inbound", False),
                    survey=service.get("survey", False),  # 🔥 Lägg till denna                    
                )
                db.add(new_service)
            else:
                print("❌ Felaktigt format på tjänster:", service)

        db.commit()
        print("✅ Alla tjänster uppdaterade!")

    return {"message": "Kontrakt + tjänster uppdaterade", "id": contract_id, "status": contract.status}

# -----------------------
# 📌 Radera kontrakt (om vi behåller den)
# -----------------------
@router.delete("/contracts/{contract_id}")
def delete_contract(contract_id: int, db: Session = Depends(get_db)):
    contract = db.query(Contract).filter(Contract.contract_id == contract_id).first()

    if not contract:
        raise HTTPException(status_code=404, detail="Kontraktet hittades inte")

    # 🔥 Flytta användare till standardkontrakt (ID 1)
    users = db.query(User).filter(User.contract_id == contract.contract_id).all()
    for user in users:
        user.contract_id = 1  # 🔄 Flytta användaren till default-kontrakt

    db.delete(contract)
    db.commit()

    return {"message": f"Kontrakt {contract.contract_id} raderat och användare flyttade till standardkontrakt"}

# -------------------------------------------------------------------------------
# Hämtar användare från user-tabellen
# -------------------------------------------------------------------------------
@router.get("/contracts/{contract_id}/users")
def get_users_for_contract(contract_id: int, db: Session = Depends(get_db)):
    users = db.query(User).filter(User.contract_id == contract_id, User.active == True).all()

    if not users:
        raise HTTPException(status_code=404, detail="Inga aktiva användare hittades för detta kontrakt")

    return [
        {
            "id": u.user_id,
            "name": f"{u.c_name} {u.s_name}",
            "email": u.email,
            "rights": u.rights,
            "active": u.active
        }
        for u in users
    ]

# -------------------------------------------------------------------------------
# Sparar redigerad användardata till DB
# -------------------------------------------------------------------------------
@router.put("/contracts/{contract_id}/users/{user_id}")
def update_user(contract_id: int, user_id: int, user_data: dict, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.user_id == user_id, User.contract_id == contract_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="Användare ej hittad")

    # Uppdatera användardata
    if "rights" in user_data:
        user.rights = user_data["rights"]
    if "active" in user_data:
        user.active = user_data["active"]

    db.commit()
    db.refresh(user)

    return {"message": "Användare uppdaterad", "user": {
        "user_id": user.user_id,
        "name": f"{user.c_name} {user.s_name}",
        "email": user.email,
        "rights": user.rights,
        "active": user.active
    }}

# -------------------------------------------------------------------------------
# Hämtar och returnerar alla company_names
# -------------------------------------------------------------------------------
@router.get("/contracts/names")
def get_contract_names(db: Session = Depends(get_db)):
    contracts = db.query(Contract.contract_id, Contract.company_name).all()

    if not contracts:
        raise HTTPException(status_code=404, detail="Inga kontrakt hittades")

    return [
        {"contract_id": c.contract_id, "company_name": c.company_name}
        for c in contracts
    ]

