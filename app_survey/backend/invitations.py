# File: app_survey/backend/invitations.py
# Version: 2026.10.06-04
# Status: DEVELOPMENT

import hashlib
import json
import re
import secrets
from contextlib import closing
from datetime import date
from decimal import Decimal, InvalidOperation, localcontext
from uuid import uuid4

from fastapi import Depends, HTTPException, Response
from pydantic import BaseModel, ConfigDict, Field

from backend.deadlines import deadline_passed, require_open_deadline
from backend.link_crypto import encrypt_token, decrypt_token


class CreateInvitation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    label: str = Field(min_length=1, max_length=100)
    expected_version: int = Field(ge=1)


class SubmitAnswers(BaseModel):
    model_config = ConfigDict(extra="forbid")
    answers: dict = Field(max_length=100)


def initialize_invitations(db):
    db.executescript("""
        CREATE TABLE IF NOT EXISTS survey_invitations (
            invitation_id TEXT PRIMARY KEY,
            survey_id TEXT NOT NULL,
            version INTEGER NOT NULL,
            label TEXT NOT NULL,
            token_hash TEXT NOT NULL UNIQUE,
            token_encrypted TEXT,
            created_at TEXT NOT NULL,
            sent_at TEXT,
            answered_at TEXT,
            revoked_at TEXT,
            FOREIGN KEY (survey_id, version)
                REFERENCES survey_versions(survey_id, version)
        );

        CREATE INDEX IF NOT EXISTS invitations_survey
            ON survey_invitations(survey_id);

        CREATE TABLE IF NOT EXISTS survey_responses (
            invitation_id TEXT PRIMARY KEY,
            response_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (invitation_id)
                REFERENCES survey_invitations(invitation_id)
        );

        CREATE TABLE IF NOT EXISTS survey_invitation_events (
            event_id TEXT PRIMARY KEY,
            invitation_id TEXT NOT NULL,
            action TEXT NOT NULL,
            user_id INTEGER NOT NULL,
            contract_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (invitation_id)
                REFERENCES survey_invitations(invitation_id)
        );
    """)

    columns = {
        row["name"]
        for row in db.execute("PRAGMA table_info(survey_invitations)")
    }

    if "token_encrypted" not in columns:
        db.execute(
            "ALTER TABLE survey_invitations "
            "ADD COLUMN token_encrypted TEXT"
        )

    if "hidden_at" not in columns:
        db.execute(
            "ALTER TABLE survey_invitations ADD COLUMN hidden_at TEXT"
        )


def token_hash(token):
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def invitation_result(row):
    result = {
        key: row[key]
        for key in (
            "invitation_id", "survey_id", "version", "label",
            "created_at", "sent_at", "answered_at", "revoked_at",
            "closes_on", "hidden_at",
        )
    }
    result["link_saved"] = bool(row["token_encrypted"])

    if row["answered_at"]:
        result["status"] = "ANSWERED"
    elif row["revoked_at"]:
        result["status"] = "REVOKED"
    elif deadline_passed(row["closes_on"]):
        result["status"] = "EXPIRED"
    elif row["sent_at"]:
        result["status"] = "SENT"
    else:
        result["status"] = "CREATED"

    return result


def active_invitation(db, token):
    if not re.fullmatch(r"[A-Za-z0-9_-]{43}", token):
        raise HTTPException(404, "Länken hittades inte")

    row = db.execute(
        """
        SELECT i.*, s.closes_on
        FROM survey_invitations i
        JOIN surveys s ON s.survey_id = i.survey_id
        WHERE i.token_hash = ?
        """,
        (token_hash(token),),
    ).fetchone()

    if row is None:
        raise HTTPException(404, "Länken hittades inte")
    if row["revoked_at"]:
        raise HTTPException(410, "Länken har återkallats")
    if row["answered_at"]:
        raise HTTPException(410, "Svaret är redan inskickat")

    require_open_deadline(row["closes_on"])
    return row


def invitation_form(db, row):
    version = db.execute(
        """
        SELECT form_json FROM survey_versions
        WHERE survey_id = ? AND version = ?
        """,
        (row["survey_id"], row["version"]),
    ).fetchone()

    return json.loads(version["form_json"])


def validated_answers(form, supplied):
    editable = {
        q["id"]: q
        for q in form["questions"]
        if q["type"] != "sum"
    }

    if set(supplied) - set(editable):
        raise HTTPException(422, "Svaret innehåller okända fält")

    answers = {}
    numbers = {}

    for key, question in editable.items():
        value = supplied.get(key)
        kind = question["type"]
        label = question["label"]

        def invalid(message):
            raise HTTPException(422, f"{label}: {message}")

        if value is None or value == "" or value == []:
            if question["required"]:
                invalid("ett svar krävs")
            answers[key] = None
            continue

        if kind == "checkbox":
            if (
                not isinstance(value, list)
                or any(not isinstance(item, str) for item in value)
                or len(value) != len(set(value))
                or any(item not in question["options"] for item in value)
            ):
                invalid("ogiltiga svarsalternativ")

            answers[key] = value
            continue

        if kind == "number":
            if (
                isinstance(value, bool)
                or not isinstance(value, (str, int, float))
                or len(str(value)) > 100
            ):
                invalid("ange ett giltigt tal")

            raw = str(value).strip().replace(",", ".")

            if not re.fullmatch(
                r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?",
                raw,
            ):
                invalid("ange ett giltigt tal")

            try:
                number = Decimal(raw)
            except InvalidOperation:
                invalid("ange ett giltigt tal")

            if not number.is_finite() or abs(number) > Decimal("1e15"):
                invalid("talet är för stort eller ogiltigt")

            if number and number.adjusted() < -100:
                invalid("talet är för litet")

            numbers[key] = number
            answers[key] = str(number)
            continue

        if not isinstance(value, str) or len(value) > 10000:
            invalid("ange text med högst 10000 tecken")

        value = value.strip()

        if not value:
            if question["required"]:
                invalid("ett svar krävs")
            answers[key] = None
            continue

        if kind in {"radio", "select"}:
            if value not in question["options"]:
                invalid("välj ett giltigt alternativ")

        if kind == "date":
            try:
                if date.fromisoformat(value).isoformat() != value:
                    invalid("ange datum som ÅÅÅÅ-MM-DD")
            except ValueError:
                invalid("ange ett giltigt datum")

        answers[key] = value

    calculated = {}

    with localcontext() as context:
        context.prec = 150

        for question in form["questions"]:
            if question["type"] != "sum":
                continue

            sources = question["sources"]

            if any(source not in numbers for source in sources):
                calculated[question["id"]] = None
            else:
                total = sum(
                    (numbers[source] for source in sources),
                    Decimal(0),
                )
                rounded = total.quantize(Decimal("0.01"))
                calculated[question["id"]] = format(
                    abs(rounded) if rounded == 0 else rounded,
                    ".2f",
                )

    return answers, calculated


def register_invitation_routes(
    app, connect_db, owned_survey, get_identity, timestamp
):
    def owned_invitation(db, survey_id, invitation_id, identity):
        owned_survey(db, survey_id, identity)

        row = db.execute(
            """
            SELECT i.*, s.closes_on
            FROM survey_invitations i
            JOIN surveys s ON s.survey_id = i.survey_id
            WHERE i.survey_id = ? AND i.invitation_id = ?
            """,
            (survey_id, invitation_id),
        ).fetchone()

        if row is None:
            raise HTTPException(404, "Inbjudningen hittades inte")

        return row

    def require_usable_link(row):
        if row["answered_at"]:
            raise HTTPException(409, "Svaret är redan inskickat")
        if row["revoked_at"]:
            raise HTTPException(409, "Länken är återkallad")

        require_open_deadline(row["closes_on"])

    def record_event(db, invitation_id, action, identity):
        db.execute(
            """
            INSERT INTO survey_invitation_events
            (event_id, invitation_id, action,
             user_id, contract_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                str(uuid4()), invitation_id, action,
                identity["user_id"], identity["contract_id"],
                timestamp(),
            ),
        )

    @app.get("/surveys/{survey_id}/invitations")
    def list_invitations(
        survey_id: str,
        include_hidden: bool = False,
        identity=Depends(get_identity),
    ):
        with closing(connect_db()) as db:
            owned_survey(db, survey_id, identity)

            rows = db.execute(
                """
                SELECT i.*, s.closes_on
                FROM survey_invitations i
                JOIN surveys s ON s.survey_id = i.survey_id
                WHERE i.survey_id = ? AND (? OR i.hidden_at IS NULL)
                ORDER BY i.created_at DESC
                """,
                (survey_id, include_hidden),
            ).fetchall()

            return [invitation_result(row) for row in rows]

    def set_invitation_visibility(
        survey_id, invitation_id, identity, hidden
    ):
        with closing(connect_db()) as db:
            with db:
                db.execute("BEGIN IMMEDIATE")

                row = owned_invitation(
                    db, survey_id, invitation_id, identity
                )
                hidden_at = (
                    (row["hidden_at"] or timestamp()) if hidden else None
                )

                if hidden_at != row["hidden_at"]:
                    db.execute(
                        "UPDATE survey_invitations SET hidden_at = ? "
                        "WHERE invitation_id = ?",
                        (hidden_at, invitation_id),
                    )
                    record_event(
                        db,
                        invitation_id,
                        "HIDDEN" if hidden else "RESTORED",
                        identity,
                    )

            return invitation_result(
                owned_invitation(db, survey_id, invitation_id, identity)
            )

    @app.post("/surveys/{survey_id}/invitations/{invitation_id}/hide")
    def hide_invitation(
        survey_id: str,
        invitation_id: str,
        identity=Depends(get_identity),
    ):
        return set_invitation_visibility(
            survey_id, invitation_id, identity, True
        )

    @app.post("/surveys/{survey_id}/invitations/{invitation_id}/restore")
    def restore_invitation(
        survey_id: str,
        invitation_id: str,
        identity=Depends(get_identity),
    ):
        return set_invitation_visibility(
            survey_id, invitation_id, identity, False
        )

    @app.post("/surveys/{survey_id}/invitations", status_code=201)
    def create_invitation(
        survey_id: str,
        payload: CreateInvitation,
        response: Response,
        identity=Depends(get_identity),
    ):
        token = secrets.token_urlsafe(32)
        invitation_id = str(uuid4())

        with closing(connect_db()) as db:
            with db:
                db.execute("BEGIN IMMEDIATE")
                survey = owned_survey(db, survey_id, identity)

                if survey["current_version"] != payload.expected_version:
                    raise HTTPException(
                        409, "Formuläret har ändrats. Öppna det igen."
                    )

                require_open_deadline(survey["closes_on"])
                encrypted = encrypt_token(token)

                db.execute(
                    """
                    INSERT INTO survey_invitations
                    (invitation_id, survey_id, version, label,
                     token_hash, token_encrypted, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        invitation_id, survey_id,
                        payload.expected_version, payload.label,
                        token_hash(token), encrypted, timestamp(),
                    ),
                )

                record_event(db, invitation_id, "CREATED", identity)

                row = owned_invitation(
                    db, survey_id, invitation_id, identity
                )

            response.headers["Cache-Control"] = "no-store"
            return {**invitation_result(row), "token": token}

    @app.get("/surveys/{survey_id}/invitations/{invitation_id}/link")
    def get_saved_link(
        survey_id: str,
        invitation_id: str,
        response: Response,
        identity=Depends(get_identity),
    ):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"

        with closing(connect_db()) as db:
            row = owned_invitation(
                db, survey_id, invitation_id, identity
            )
            require_usable_link(row)

            if not row["token_encrypted"]:
                raise HTTPException(
                    409,
                    "Den äldre länken är inte sparad. "
                    "Skapa en ersättningslänk.",
                )

            token = decrypt_token(row["token_encrypted"])

            if not secrets.compare_digest(
                token_hash(token), row["token_hash"]
            ):
                raise HTTPException(
                    503, "Den sparade länken kunde inte verifieras."
                )

            return {**invitation_result(row), "token": token}

    @app.post("/surveys/{survey_id}/invitations/{invitation_id}/replace-link")
    def replace_link(
        survey_id: str,
        invitation_id: str,
        response: Response,
        identity=Depends(get_identity),
    ):
        response.headers["Cache-Control"] = "no-store"
        token = secrets.token_urlsafe(32)

        with closing(connect_db()) as db:
            with db:
                db.execute("BEGIN IMMEDIATE")

                row = owned_invitation(
                    db, survey_id, invitation_id, identity
                )
                require_usable_link(row)

                # Behåll respondent och ursprunglig formulärversion.
                # Den gamla tokenens hash ersätts, så länken spärras.
                db.execute(
                    """
                    UPDATE survey_invitations
                    SET token_hash = ?, token_encrypted = ?, sent_at = NULL
                    WHERE invitation_id = ?
                    """,
                    (
                        token_hash(token), encrypt_token(token),
                        invitation_id,
                    ),
                )

                record_event(
                    db, invitation_id, "LINK_REPLACED", identity
                )

                updated = owned_invitation(
                    db, survey_id, invitation_id, identity
                )

            return {**invitation_result(updated), "token": token}

    @app.post("/surveys/{survey_id}/invitations/{invitation_id}/sent")
    def mark_sent(
        survey_id: str,
        invitation_id: str,
        identity=Depends(get_identity),
    ):
        with closing(connect_db()) as db:
            with db:
                db.execute("BEGIN IMMEDIATE")

                row = owned_invitation(
                    db, survey_id, invitation_id, identity
                )
                require_usable_link(row)

                if not row["sent_at"]:
                    db.execute(
                        """
                        UPDATE survey_invitations
                        SET sent_at = ?
                        WHERE invitation_id = ?
                        """,
                        (timestamp(), invitation_id),
                    )

                    record_event(db, invitation_id, "SENT", identity)

            return invitation_result(
                owned_invitation(db, survey_id, invitation_id, identity)
            )

    @app.post("/surveys/{survey_id}/invitations/{invitation_id}/revoke")
    def revoke(
        survey_id: str,
        invitation_id: str,
        identity=Depends(get_identity),
    ):
        with closing(connect_db()) as db:
            with db:
                db.execute("BEGIN IMMEDIATE")

                row = owned_invitation(
                    db, survey_id, invitation_id, identity
                )

                if row["answered_at"]:
                    raise HTTPException(
                        409, "Svaret är redan inskickat"
                    )

                if not row["revoked_at"]:
                    db.execute(
                        """
                        UPDATE survey_invitations
                        SET revoked_at = ?
                        WHERE invitation_id = ?
                        """,
                        (timestamp(), invitation_id),
                    )

                    record_event(
                        db, invitation_id, "REVOKED", identity
                    )

            return invitation_result(
                owned_invitation(db, survey_id, invitation_id, identity)
            )

    @app.get("/surveys/{survey_id}/responses")
    def list_responses(
        survey_id: str,
        identity=Depends(get_identity),
    ):
        with closing(connect_db()) as db:
            owned_survey(db, survey_id, identity)

            rows = db.execute(
                """
                SELECT r.response_json
                FROM survey_responses r
                JOIN survey_invitations i
                    ON i.invitation_id = r.invitation_id
                WHERE i.survey_id = ?
                ORDER BY r.created_at DESC
                """,
                (survey_id,),
            ).fetchall()

            return [
                json.loads(row["response_json"]) for row in rows
            ]

    @app.get("/participate")
    def get_public_form(token: str, response: Response):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"

        with closing(connect_db()) as db:
            row = active_invitation(db, token)
            form = invitation_form(db, row)

            form["questions"] = [
                question for question in form["questions"]
                if not (
                    question["type"] == "sum"
                    and question.get("hidden", False)
                )
            ]

            return {
                "version": row["version"],
                "closes_on": row["closes_on"],
                "form": form,
            }

    @app.post("/participate", status_code=201)
    def submit_public_answers(
        token: str,
        payload: SubmitAnswers,
        response: Response,
    ):
        response.headers["Cache-Control"] = "no-store"

        with closing(connect_db()) as db:
            with db:
                db.execute("BEGIN IMMEDIATE")

                row = active_invitation(db, token)
                form = invitation_form(db, row)

                answers, calculated = validated_answers(
                    form, payload.answers
                )
                now = timestamp()

                result = {
                    "schema_version": 1,
                    "survey_id": row["survey_id"],
                    "version": row["version"],
                    "invitation_id": row["invitation_id"],
                    "respondent": row["label"],
                    "closes_on": row["closes_on"],
                    "answered_at": now,
                    "form": form,
                    "answers": answers,
                    "calculated": calculated,
                }

                db.execute(
                    """
                    INSERT INTO survey_responses
                    (invitation_id, response_json, created_at)
                    VALUES (?, ?, ?)
                    """,
                    (
                        row["invitation_id"],
                        json.dumps(result, ensure_ascii=False),
                        now,
                    ),
                )

                db.execute(
                    """
                    UPDATE survey_invitations
                    SET answered_at = ?
                    WHERE invitation_id = ?
                    """,
                    (now, row["invitation_id"]),
                )

            return {
                "status": "ok",
                "message": "Tack! Svaret är sparat.",
            }
