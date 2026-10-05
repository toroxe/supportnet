# File: app_notes/Dockerfile
# Version: 0.1.0
# Source: UTV – aktuell Notes-backend, Python 3.12
# Status: DEVELOPMENT
# Verified: NO

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY backend/main.py /app/backend/main.py
RUN mkdir -p /data && ln -s /data/notes.db /app/backend/notes.db

EXPOSE 8001

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8001"]
