# File: app_notes/backend/msn_access.py
# Version: 2026.10.05-01
# Source: UTV
# Status: VERIFIED
# Verified: Tord UA/PASS 2026-10-05 UTV Notes MSN-access, CRUD och ägarisolering
# ------------------------------------------------------------

import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


bearer = HTTPBearer(auto_error=False)


def get_notes_identity(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_url = os.getenv("MSN_NOTES_ACCESS_URL")

    if not access_url:
        raise HTTPException(
            status_code=503,
            detail="MSN access service not configured",
        )

    request = Request(
        access_url,
        headers={
            "Authorization": f"Bearer {credentials.credentials}",
            "Accept": "application/json",
        },
    )

    try:
        with urlopen(request, timeout=3) as response:
            identity = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        if error.code in (401, 403):
            raise HTTPException(
                status_code=error.code,
                detail="Notes access denied",
            ) from error
        raise HTTPException(
            status_code=503,
            detail="MSN access service unavailable",
        ) from error
    except (URLError, TimeoutError, OSError, ValueError) as error:
        raise HTTPException(
            status_code=503,
            detail="MSN access service unavailable",
        ) from error

    if (
        not isinstance(identity, dict)
        or identity.get("app_id") != "APP-NOTES-001"
        or identity.get("decision") != "ALLOW"
        or type(identity.get("user_id")) is not int
        or type(identity.get("contract_id")) is not int
        or identity["user_id"] <= 0
        or identity["contract_id"] <= 0
    ):
        raise HTTPException(
            status_code=503,
            detail="Invalid MSN access response",
        )

    return identity
