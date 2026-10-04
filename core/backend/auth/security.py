# File: core/backend/auth/security.py
# Version: 2026.10.04-1525
# Source: UTV
# Status: VERIFIED
# Verified: Tord UA/PASS 2026-10-04 – vanlig login och adminlogin
# ------------------------------------------------------------

from datetime import datetime, timedelta

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt


SECRET_KEY = "SUPPORTNET_SECRET_KEY"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="userapi/login")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    password_bytes = plain_password.encode("utf-8")[:72]
    hashed_bytes = hashed_password.encode("utf-8")

    return bcrypt.checkpw(password_bytes, hashed_bytes)


def get_password_hash(password: str) -> str:
    password_bytes = password.encode("utf-8")[:72]
    hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())

    return hashed.decode("utf-8")


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    payload = data.copy()

    expire = datetime.utcnow() + (
        expires_delta
        if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload.update({"exp": expire})

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def verify_token(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Kunde inte verifiera användaren",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )

        user_id = payload.get("user_id")
        contract_id = payload.get("contract_id")

        if user_id is None or contract_id is None:
            raise credentials_exception

        return {
            "user_id": user_id,
            "contract_id": contract_id,
            "c_name": payload.get("c_name"),
            "s_name": payload.get("s_name"),
            "aina_uid": payload.get("aina_uid"),
            "iam_decision": payload.get("iam_decision"),
            "iam_role": payload.get("iam_role"),
            "iam_policy": payload.get("iam_policy"),
        }

    except JWTError:
        raise credentials_exception


def get_current_user(token_data=Depends(verify_token)):
    return token_data["user_id"]
