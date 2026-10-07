# File: app_survey/backend/main.py
# Version: 2026.10.06-05
# Status: DEVELOPMENT

import json
import os
import sqlite3
from contextlib import asynccontextmanager, closing
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator

from backend.msn_access import get_survey_identity
from backend.invitations import (
    initialize_invitations,
    register_invitation_routes,
)
from backend.deadlines import initialize_deadlines, validate_deadline


DB_PATH = Path(os.getenv("SURVEY_DB_PATH", "/data/survey.db"))


def connect_db():
    connection = sqlite3.connect(str(DB_PATH), timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def timestamp():
    return datetime.now(timezone.utc).isoformat()


@asynccontextmanager
async def lifespan(app):
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    with closing(connect_db()) as db:
        db.execute("PRAGMA journal_mode = WAL")
        db.executescript("""
            CREATE TABLE IF NOT EXISTS surveys (
                survey_id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                contract_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                current_version INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS surveys_owner
            ON surveys (contract_id, user_id);

            CREATE TABLE IF NOT EXISTS survey_versions (
                survey_id TEXT NOT NULL,
                version INTEGER NOT NULL,
                form_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                PRIMARY KEY (survey_id, version),
                FOREIGN KEY (survey_id)
                    REFERENCES surveys(survey_id)
            );
        """)

        initialize_deadlines(db)
        initialize_invitations(db)

        columns = {
            row["name"]
            for row in db.execute("PRAGMA table_info(surveys)")
        }
        if "hidden_at" not in columns:
            db.execute("ALTER TABLE surveys ADD COLUMN hidden_at TEXT")

        db.commit()

    yield


app = FastAPI(
    title="MySupportNet Survey",
    version="0.4.0",
    lifespan=lifespan,
)


class Question(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    id: str = Field(
        min_length=1,
        max_length=64,
        pattern=r"^[A-Za-z][A-Za-z0-9_]*$",
    )
    label: str = Field(min_length=1, max_length=500)
    type: Literal[
        "text", "textarea", "select", "radio",
        "checkbox", "number", "date", "sum"
    ]
    required: bool = False
    help: str = Field(default="", max_length=1000)
    options: list[str] = Field(default_factory=list, max_length=50)
    sources: list[str] = Field(default_factory=list, max_length=100)
    hidden: bool = False

    @model_validator(mode="after")
    def validate_settings(self):
        if self.type in {"select", "radio", "checkbox"}:
            if len(self.options) < 2:
                raise ValueError("Valfrågor behöver minst två alternativ")

            if any(
                not option or len(option) > 300
                for option in self.options
            ):
                raise ValueError("Alternativ måste innehålla 1–300 tecken")

            if len(set(self.options)) != len(self.options):
                raise ValueError("Alternativen måste vara unika")

        elif self.options:
            raise ValueError("Denna frågetyp använder inte alternativ")

        if self.type == "sum":
            if self.required:
                raise ValueError("Summafält kan inte vara obligatoriska")

            if not self.sources:
                raise ValueError("Summafält behöver minst ett talfält")

            if len(set(self.sources)) != len(self.sources):
                raise ValueError("Summafältets källor måste vara unika")

        elif self.sources or self.hidden:
            raise ValueError(
                "Endast summafält får ha källor eller döljas"
            )

        return self


class SurveyForm(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    schema_version: Literal[1] = 1
    title: str = Field(min_length=1, max_length=200)
    introduction: str = Field(default="", max_length=5000)
    questions: list[Question] = Field(min_length=1, max_length=100)

    @model_validator(mode="after")
    def validate_questions(self):
        lookup = {question.id: question for question in self.questions}

        if len(lookup) != len(self.questions):
            raise ValueError("Frågornas id måste vara unika")

        for question in self.questions:
            if question.type != "sum":
                continue

            for source in question.sources:
                target = lookup.get(source)
                if target is None or target.type != "number":
                    raise ValueError(
                        f'Summafältet "{question.label}" måste '
                        "hänvisa till befintliga talfält"
                    )

        return self


class CreateSurvey(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
    )

    name: str = Field(min_length=1, max_length=200)
    closes_on: date
    form: SurveyForm


class UpdateSurvey(CreateSurvey):
    expected_version: int = Field(ge=1)


def owned_survey(db, survey_id, identity):
    row = db.execute(
        """
        SELECT * FROM surveys
        WHERE survey_id = ? AND user_id = ? AND contract_id = ?
        """,
        (survey_id, identity["user_id"], identity["contract_id"]),
    ).fetchone()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Undersökningen hittades inte",
        )

    return row


def survey_result(db, row):
    version = db.execute(
        """
        SELECT form_json FROM survey_versions
        WHERE survey_id = ? AND version = ?
        """,
        (row["survey_id"], row["current_version"]),
    ).fetchone()

    return {
        "survey_id": row["survey_id"],
        "name": row["name"],
        "hidden_at": row["hidden_at"],
        "version": row["current_version"],
        "closes_on": row["closes_on"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
        "form": json.loads(version["form_json"]),
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "app_id": "APP-SURVEY-001",
        "version": "0.4.0",
    }


@app.get("/surveys")
def list_surveys(
    include_hidden: bool = False,
    identity=Depends(get_survey_identity),
):
    with closing(connect_db()) as db:
        rows = db.execute(
            """
            SELECT survey_id, name, current_version AS version,
                   closes_on, created_at, updated_at, hidden_at
            FROM surveys
            WHERE user_id = ? AND contract_id = ?
              AND (? OR hidden_at IS NULL)
            ORDER BY updated_at DESC
            """,
            (identity["user_id"], identity["contract_id"], include_hidden),
        ).fetchall()

        return [dict(row) for row in rows]


@app.post("/surveys", status_code=201)
def create_survey(
    payload: CreateSurvey,
    identity=Depends(get_survey_identity),
):
    closes_on = validate_deadline(payload.closes_on)
    survey_id = str(uuid4())
    now = timestamp()
    form_json = json.dumps(
        payload.form.model_dump(), ensure_ascii=False
    )

    with closing(connect_db()) as db:
        with db:
            db.execute(
                """
                INSERT INTO surveys
                (survey_id, user_id, contract_id, name,
                 current_version, closes_on, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, ?, ?, ?)
                """,
                (
                    survey_id, identity["user_id"],
                    identity["contract_id"], payload.name,
                    closes_on, now, now,
                ),
            )
            db.execute(
                """
                INSERT INTO survey_versions
                (survey_id, version, form_json, created_at)
                VALUES (?, 1, ?, ?)
                """,
                (survey_id, form_json, now),
            )

        return survey_result(
            db, owned_survey(db, survey_id, identity)
        )


@app.get("/surveys/{survey_id}")
def get_survey(
    survey_id: str,
    identity=Depends(get_survey_identity),
):
    with closing(connect_db()) as db:
        return survey_result(
            db, owned_survey(db, survey_id, identity)
        )


@app.put("/surveys/{survey_id}")
def update_survey(
    survey_id: str,
    payload: UpdateSurvey,
    identity=Depends(get_survey_identity),
):
    closes_on = validate_deadline(payload.closes_on)
    now = timestamp()
    form_json = json.dumps(
        payload.form.model_dump(), ensure_ascii=False
    )

    with closing(connect_db()) as db:
        with db:
            db.execute("BEGIN IMMEDIATE")
            row = owned_survey(db, survey_id, identity)

            if row["current_version"] != payload.expected_version:
                raise HTTPException(
                    status_code=409,
                    detail=(
                        "Undersökningen har ändrats. "
                        "Öppna den igen innan du sparar."
                    ),
                )

            next_version = row["current_version"] + 1

            db.execute(
                """
                INSERT INTO survey_versions
                (survey_id, version, form_json, created_at)
                VALUES (?, ?, ?, ?)
                """,
                (survey_id, next_version, form_json, now),
            )
            db.execute(
                """
                UPDATE surveys
                SET name = ?, current_version = ?, closes_on = ?,
                    updated_at = ?
                WHERE survey_id = ?
                """,
                (payload.name, next_version, closes_on, now, survey_id),
            )

        return survey_result(
            db, owned_survey(db, survey_id, identity)
        )


@app.post("/surveys/{survey_id}/hide")
def hide_survey(
    survey_id: str,
    identity=Depends(get_survey_identity),
):
    return set_survey_visibility(survey_id, identity, True)


@app.post("/surveys/{survey_id}/restore")
def restore_survey(
    survey_id: str,
    identity=Depends(get_survey_identity),
):
    return set_survey_visibility(survey_id, identity, False)


def set_survey_visibility(survey_id, identity, hidden):
    with closing(connect_db()) as db:
        with db:
            db.execute("BEGIN IMMEDIATE")
            row = owned_survey(db, survey_id, identity)
            hidden_at = (row["hidden_at"] or timestamp()) if hidden else None

            db.execute(
                "UPDATE surveys SET hidden_at = ? WHERE survey_id = ?",
                (hidden_at, survey_id),
            )

        return {"survey_id": survey_id, "hidden_at": hidden_at}


register_invitation_routes(
    app,
    connect_db,
    owned_survey,
    get_survey_identity,
    timestamp,
)
