from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import User
from backend.db.models import Status, Role

router = APIRouter(
    prefix="/api",
    tags=["admin"]
)

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    try:
        users = db.query(User).all()
        return [{
            "id": user.id,
            "c_name": user.c_name,
            "s_name": user.s_name,
            "email": user.email,
            "status": Status(user.status).value,  # Konvertera till Status Enum
            "role": Role(user.role).value        # Konvertera till Role Enum
        } for user in users]
    except Exception as e:
        return {"error": str(e)}

