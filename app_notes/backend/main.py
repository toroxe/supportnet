# File: app_notes/backend/main.py
# Version: 2026.10.05-01
# Source: UTV
# Status: VERIFIED
# Verified: Tord UA/PASS 2026-10-05 UTV Notes MSN-access, CRUD och ägarisolering
# ------------------------------------------------------------

from datetime import datetime, timezone
from pathlib import Path
import sqlite3

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .msn_access import get_notes_identity


APP_ID = "APP-NOTES-001"

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "notes.db"

app = FastAPI(
    title="MySupportNet App Notes",
    version="0.1.0"
)

# DEV ONLY: frontend kör på separat localhost-port.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NoteCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


class NoteUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def get_db():
    connection = sqlite3.connect(DB_FILE)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    with get_db() as db:
        db.execute(
            """
            CREATE TABLE IF NOT EXISTS notes (
                note_id INTEGER PRIMARY KEY AUTOINCREMENT,
                contract_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
            """
        )

        db.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_notes_owner
            ON notes (contract_id, user_id)
            """
        )


init_db()


def note_to_dict(row):
    return {
        "note_id": row["note_id"],
        "contract_id": row["contract_id"],
        "user_id": row["user_id"],
        "content": row["content"],
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def get_owned_note(db, note_id: int, identity: dict):
    row = db.execute(
        """
        SELECT *
        FROM notes
        WHERE note_id = ?
          AND contract_id = ?
          AND user_id = ?
        """,
        (
            note_id,
            identity["contract_id"],
            identity["user_id"],
        ),
    ).fetchone()

    if row is None:
        raise HTTPException(status_code=404, detail="Note not found")

    return row


@app.get("/health")
def health():
    return {
        "status": "ok",
        "app_id": APP_ID,
        "version": "0.1.0",
    }


@app.get("/notes")
def list_notes(identity: dict = Depends(get_notes_identity)):
    with get_db() as db:
        rows = db.execute(
            """
            SELECT *
            FROM notes
            WHERE contract_id = ?
              AND user_id = ?
            ORDER BY updated_at DESC
            """,
            (identity["contract_id"], identity["user_id"]),
        ).fetchall()

        return [note_to_dict(row) for row in rows]


@app.post("/notes", status_code=201)
def create_note(
    note: NoteCreate,
    identity: dict = Depends(get_notes_identity),
):
    content = note.content.strip()

    if not content:
        raise HTTPException(status_code=400, detail="Empty note")

    now = utc_now()

    with get_db() as db:
        cursor = db.execute(
            """
            INSERT INTO notes (
                contract_id,
                user_id,
                content,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                identity["contract_id"],
                identity["user_id"],
                content,
                now,
                now,
            ),
        )

        note_id = cursor.lastrowid

        row = db.execute(
            "SELECT * FROM notes WHERE note_id = ?",
            (note_id,),
        ).fetchone()

        return note_to_dict(row)


@app.put("/notes/{note_id}")
def update_note(
    note_id: int,
    note: NoteUpdate,
    identity: dict = Depends(get_notes_identity),
):
    content = note.content.strip()

    if not content:
        raise HTTPException(status_code=400, detail="Empty note")

    with get_db() as db:
        get_owned_note(db, note_id, identity)

        db.execute(
            """
            UPDATE notes
            SET content = ?,
                updated_at = ?
            WHERE note_id = ?
              AND contract_id = ?
              AND user_id = ?
            """,
            (
                content,
                utc_now(),
                note_id,
                identity["contract_id"],
                identity["user_id"],
            ),
        )

        row = db.execute(
            "SELECT * FROM notes WHERE note_id = ?",
            (note_id,),
        ).fetchone()

        return note_to_dict(row)


@app.delete("/notes/{note_id}")
def delete_note(
    note_id: int,
    identity: dict = Depends(get_notes_identity),
):
    with get_db() as db:
        get_owned_note(db, note_id, identity)

        db.execute(
            """
            DELETE FROM notes
            WHERE note_id = ?
              AND contract_id = ?
              AND user_id = ?
            """,
            (
                note_id,
                identity["contract_id"],
                identity["user_id"],
            ),
        )

    return {"status": "deleted", "note_id": note_id}
