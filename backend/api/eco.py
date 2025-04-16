from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import Transaction

# Skapa router
router = APIRouter(prefix="/eco", tags=["Economy"])

# Lägg till transaktion
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

# Hämta saldo
@router.get("/balance")
def get_balance(db: Session = Depends(get_db)):
    try:
        balance = db.query(
            (Transaction.income - Transaction.expense).label("balance")
        ).all()
        return {"balance": balance[0][0] if balance else 0.0}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ett fel inträffade: {str(e)}")

# Uppdatera moms och skatt
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

# Hämtar posterna på DB    
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
                
            }
            for t in transactions
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ett fel inträffade: {str(e)}")


