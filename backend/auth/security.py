from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# 🔑 Säkerhetsnyckel och algoritm för JWT
SECRET_KEY = "din_superhemliga_nyckel_ändra_denna"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

# 📌 Lösenordshantering med bcrypt
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# 🔑 OAuth2 Password Bearer för autentisering
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# ✅ Verifiera lösenord
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# 🔑 Hasha lösenord
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

# 🎫 Skapa en JWT-token
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# 🔍 Hämta aktuell användare från JWT-token
def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Ogiltig autentisering",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"email": email}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ogiltig autentisering",
            headers={"WWW-Authenticate": "Bearer"},
        )
