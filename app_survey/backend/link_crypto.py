# File: app_survey/backend/link_crypto.py
# Version: 2026.10.06-01
# Status: DEVELOPMENT

import os
from functools import lru_cache
from pathlib import Path

from cryptography.fernet import Fernet, InvalidToken
from fastapi import HTTPException


@lru_cache(maxsize=1)
def cipher():
    path = Path(os.getenv(
        "SURVEY_LINK_KEY_FILE",
        "/run/secrets/survey_link_key",
    ))

    try:
        key = path.read_bytes().strip()
        return Fernet(key)
    except (OSError, ValueError):
        raise HTTPException(
            status_code=503,
            detail="Nyckeln för sparade länkar saknas eller är ogiltig.",
        ) from None


def encrypt_token(token: str) -> str:
    return cipher().encrypt(token.encode("utf-8")).decode("ascii")


def decrypt_token(encrypted: str) -> str:
    try:
        return cipher().decrypt(
            encrypted.encode("ascii")
        ).decode("utf-8")
    except (InvalidToken, UnicodeError, ValueError):
        raise HTTPException(
            status_code=503,
            detail="Den sparade länken kunde inte läsas med serverns nyckel.",
        ) from None
