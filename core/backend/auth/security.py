# ============================================================
# 📦 IMPORTER – Standardbibliotek och externa paket
# ============================================================

from datetime import datetime, timedelta
import os
from pathlib import Path
from typing import Optional, Dict

from dotenv import load_dotenv
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

# ============================================================
# 🔐 KONFIGURATION FÖR SÄKERHET och kloka beslut
# ============================================================

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY saknas i miljökonfigurationen")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# ============================================================
# 🔐 LÖSENORD – Hashning och verifiering
# ============================================================

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# ============================================================
# 🪪 AUTENTISERING – Token-hantering (OAuth2 + JWT)
# ============================================================

# 🎟️ Förväntad token-url från klienten
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="userapi/login")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Skapar och returnerar en JWT-token med valfri expire-tid."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str = Depends(oauth2_scheme)) -> Dict:
    print("🧪 TOKEN MOTTAGEN I verify_token!")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id: int = payload.get("user_id")
        contract_id: int = payload.get("contract_id")
        c_name: str = payload.get("c_name")
        s_name: str = payload.get("s_name")

        if not all([user_id, contract_id]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token saknar nödvändig användarinformation",
                headers={"WWW-Authenticate": "Bearer"},
            )

        return {
            "user_id": user_id,
            "contract_id": contract_id,
            "c_name": c_name,
            "s_name": s_name
        }

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token ogiltig eller kunde inte tolkas",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(token_data: dict = Depends(verify_token)) -> int:
    """Returnerar user_id från verifierad token."""
    return token_data["user_id"]
