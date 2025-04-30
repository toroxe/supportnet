from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import Transaction
from backend.db.models import EcoSetting

# Skapa router
router = APIRouter(prefix="/eco", tags=["Economy"])

class EcoSettingCreate(BaseModel):
    contract_id: int
    limit_balance: float = 0
    limit_tax: float = 10
    limit_vat: float = 10

class EcoSettingOut(EcoSettingCreate):
    setting_id: int

# ===========================================================================================================
# ================================ Inställningar-relaterade endpoints =======================================
# ===========================================================================================================
#----------------------------------------------
# Hämta inställningsr per kontrakt
#---------------------------------------------

@router.get("/settings/{contract_id}", response_model=EcoSettingOut)
async def get_eco_setting(contract_id: int, db: Session = Depends(get_db)):
    setting = db.query(EcoSetting).filter(EcoSetting.contract_id == contract_id).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Inställningar för kontraktet hittades inte.")
    return setting

#---------------------------------------------
# Uppdaterar inställningar
#---------------------------------------------

@router.put("/settings/{contract_id}", response_model=EcoSettingOut)
async def update_eco_setting(contract_id: int, setting: EcoSettingCreate, db: Session = Depends(get_db)):
    existing = db.query(EcoSetting).filter(EcoSetting.contract_id == contract_id).first()
    if not existing:
        raise HTTPException(status_code=404, detail="Inställningar för kontraktet finns inte.")

    existing.limit_balance = setting.limit_balance
    existing.limit_tax = setting.limit_tax
    existing.limit_vat = setting.limit_vat
    db.commit()
    db.refresh(existing)
    return existing

# ==========================================================================================================
# ================================= Transaktions-relaterade endpoints ======================================
# ==========================================================================================================

#--------------------------------------------
# Lägg till transaktion
#--------------------------------------------

@router.post("/add-transaction")
def add_transaction(transaction: dict, db: Session = Depends(get_db)):
    try:
        # Logga inkommande data för felsökning
        print("Incoming transaction data:", transaction)

        # Skapa en ny transaktion
        new_transaction = Transaction(
            transaction_date=transaction.get("transaction_date"),
            description=transaction.get("description"),
            income=transaction.get("income", 0.0),
            expense=transaction.get("expense", 0.0),
            vat=transaction.get("vat", 0.0),  # Hanterar moms som float om tillgängligt
            reserved_tax=transaction.get("reserved_tax", 0.0),
            is_personal=1 if transaction.get("is_personal", False) else 0,  # Hantera boolean korrekt
            no_vat=1 if transaction.get("no_vat", False) else 0,  # Hantera no_vat explicit
            t_type="update"  # Flaggar som moms/skatt-uppdatering
        )

        # Lägg till i databasen
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)

        return {"message": "Transaktion sparad", "id": new_transaction.transid}
    except Exception as e:
        # Lägg till en mer detaljerad loggning av felet
        print(f"Error when adding transaction: {e}")
        raise HTTPException(status_code=500, detail=f"Ett fel inträffade: {str(e)}")

#-------------------------------------------
# Hämta saldo
#-------------------------------------------
@router.get("/balance")
def get_balance(db: Session = Depends(get_db)):
    try:
        balance = db.query(
            (Transaction.income - Transaction.expense).label("balance")
        ).all()
        return {"balance": balance[0][0] if balance else 0.0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ett fel inträffade: {str(e)}")

#-------------------------------------------
# Uppdatera moms och skatt
#-------------------------------------------

@router.post("/vat-summary")
def update_vat_summary(vat_adjustment: dict, db: Session = Depends(get_db)):
    try:
        new_transaction = Transaction(
            transaction_date=vat_adjustment.get("transaction_date"),
            vat=vat_adjustment.get("vat", 0.0),
            reserved_tax=vat_adjustment.get("reserved_tax", 0.0),
        )
        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)
        return {"message": "Moms och skatt uppdaterad"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ett fel inträffade: {str(e)}")

#------------------------------------------------
# Hämtar alla posterna på DB  
#------------------------------------------------  
@router.get("/transactions")
def get_transactions(db: Session = Depends(get_db)):
    try:
        transactions = db.query(Transaction).order_by(Transaction.transaction_date.desc()).all()
        return [
            {
                "id": t.transid,
                "transaction_date": t.transaction_date.strftime('%Y-%m-%d'),
                "income": t.income,
                "expense": t.expense,
                "vat": t.vat,
                "description": t.description,
                "is_personal": t.is_personal,
                "no_vat": t.no_vat,
                "user_id": t.user_id,  
            }
            for t in transactions
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ett fel inträffade: {str(e)}")

#-------------------------------------------------------
# Hämtar en specifik transaktion på Databasen
#-------------------------------------------------------

@router.get("/transactions/{transid}")
def get_transaction(transid: int, db: Session = Depends(get_db)):
    transaction = db.query(Transaction).filter(Transaction.transid == transid).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaktion hittades inte.")

    return {
        "id": transaction.transid,
        "transaction_date": transaction.transaction_date.strftime('%Y-%m-%d'),
        "income": transaction.income,
        "expense": transaction.expense,
        "vat": transaction.vat,
        "description": transaction.description,
        "is_personal": transaction.is_personal,
        "no_vat": transaction.no_vat,
        "user_id": transaction.user_id,
    }
    
#-------------------------------------------
# Uppdatera en transaktion
#-------------------------------------------

@router.put("/update-transaction/{transid}")
def update_transaction(transid: int, data: dict, db: Session = Depends(get_db)):
    try:
        transaction = db.query(Transaction).filter(Transaction.transid == transid).first()
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaktionen kunde inte hittas.")

        transaction.transaction_date = data.get("transaction_date", transaction.transaction_date)
        transaction.description = data.get("description", transaction.description)
        transaction.income = data.get("income", transaction.income)
        transaction.expense = data.get("expense", transaction.expense)
        transaction.vat = data.get("vat", transaction.vat)
        transaction.is_personal = data.get("is_personal", transaction.is_personal)
        transaction.no_vat = data.get("no_vat", transaction.no_vat)

        db.commit()
        db.refresh(transaction)

        return {"message": "Transaktion uppdaterad", "id": transaction.transid}
    except Exception as e:
        print(f"Error when updating transaction: {e}")
        raise HTTPException(status_code=500, detail=f"Ett fel inträffade: {str(e)}")
