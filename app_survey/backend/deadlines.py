# File: app_survey/backend/deadlines.py
# Version: 2026.10.06-01
# Status: DEVELOPMENT

from datetime import date, datetime
from zoneinfo import ZoneInfo

from fastapi import HTTPException


SWEDISH_TIME = ZoneInfo("Europe/Stockholm")


def today():
    return datetime.now(SWEDISH_TIME).date()


def initialize_deadlines(db):
    columns = {
        row["name"]
        for row in db.execute("PRAGMA table_info(surveys)")
    }

    if "closes_on" not in columns:
        # Befintliga undersökningar får inget påhittat slutdatum.
        db.execute(
            "ALTER TABLE surveys ADD COLUMN closes_on TEXT"
        )


def validate_deadline(value: date):
    if value < today():
        raise HTTPException(
            status_code=422,
            detail="Sista svarsdag får inte vara före dagens datum.",
        )

    return value.isoformat()


def deadline_passed(value):
    # En undersökning är öppen hela sista svarsdagen i svensk tid.
    return bool(value) and today() > date.fromisoformat(value)


def require_open_deadline(value):
    if not value:
        raise HTTPException(
            status_code=409,
            detail=(
                "Undersökningen saknar sista svarsdag. "
                "Ägaren behöver ange datumet."
            ),
        )

    if deadline_passed(value):
        raise HTTPException(
            status_code=410,
            detail="Svarstiden har gått ut.",
        )
