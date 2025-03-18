from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.utils import hash_password
from backend.db.database import get_db
from backend.db.models import User
from backend.auth.security import verify_password, create_access_token, get_current_user
from pydantic import BaseModel

router = APIRouter()

# Pydantic-modell för login-request
class LoginRequest(BaseModel):
    email: str
    password_hash: str

@router.post("/login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    # Hämta användaren från databasen
    user = db.query(User).filter(User.email == request.email).first()

    # Kontrollera om användaren finns och lösenordet är korrekt
    if not user or not verify_password(request.password_hash, user.password_hash):
        raise HTTPException(status_code=400, detail="Felaktigt användarnamn eller lösenord!")

    # Skapa och returnera access token
    token = create_access_token({"sub": user.email, "user_id": user.id})

    return {
        "token": token,
        "user": {
            "id": user.id,
            "c_name": user.c_name,
            "s_name": user.s_name,
            "email": user.email,
            "role": user.role,
            "status": user.status,
            "company_name": user.company_name,
            "rights": user.rights,
            "active": user.active
        }
    }

@router.get("/user/profile")
def get_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """ Returnerar den inloggade användarens profilinfo """
    return {
        "id": current_user.id,
        "c_name": current_user.c_name,
        "s_name": current_user.s_name,
        "email": current_user.email,
        "role": current_user.role,
        "status": current_user.status,
        "contract_name": current_user.contract_name,
        "rights": current_user.rights,
        "active": current_user.active
    }