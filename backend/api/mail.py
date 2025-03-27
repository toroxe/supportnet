import os
import smtplib
from fastapi import APIRouter, Form, HTTPException
from starlette.responses import JSONResponse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from pydantic import BaseModel
from backend.db.database import get_db  # om du inte redan importerat detta
from sqlalchemy import text
from email.mime.application import MIMEApplication

# Router
router = APIRouter()

# SMTP Konfiguration
SMTP_CONFIG = {
    "sender_email": os.getenv("SMTP_SENDER_EMAIL", "tord@supportnet.se"),
    "sender_password": os.getenv("SMTP_PASSWORD", "majo4Fq7"),
    "smtp_server": "mailcluster.loopia.se",
    "smtp_port": 587
}

async def send_email(subject: str, body: str, recipient_email: str, attachment_path: str = None):
    """
    Generisk funktion för att skicka e-post med valfri bilaga.
    """
    try:
        msg = MIMEMultipart()
        msg["From"] = SMTP_CONFIG["sender_email"]
        msg["To"] = recipient_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        # Bifoga fil om sådan finns
        if attachment_path and os.path.exists(attachment_path):
            with open(attachment_path, "rb") as f:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(f.read())
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename={os.path.basename(attachment_path)}"
                )
                msg.attach(part)

        with smtplib.SMTP(SMTP_CONFIG["smtp_server"], SMTP_CONFIG["smtp_port"]) as server:
            server.starttls()
            server.login(SMTP_CONFIG["sender_email"], SMTP_CONFIG["sender_password"])
            server.sendmail(SMTP_CONFIG["sender_email"], recipient_email, msg.as_string())

        return {"message": "E-post skickades!"}
    except Exception as e:
        return {"error": f"Kunde inte skicka mail: {str(e)}"}


# Endpoints

@router.post("/send_contact_email")
async def send_contact_email(
    name: str = Form(...),
    email: str = Form(...),
    message: str = Form(...)
):
    """
    Endpoint för att skicka kontaktformulär.
    """
    subject = f"Kontaktförfrågan från {name}"
    body = f"Namn: {name}\nE-post: {email}\nMeddelande:\n{message}"
    response = send_email(subject, body, "tord.oxelgren@gmail.com")
    if "error" in response:
        raise HTTPException(status_code=500, detail=response["error"])
    return JSONResponse(content=response, status_code=200)

class WelcomeEmail(BaseModel):
    email: str
    name: str

@router.post("/send_welcome_email")
async def send_welcome_email(data: WelcomeEmail):
    print(f"Inkommande data: {data}")
    
    """
    Endpoint för att skicka välkomstmail.
    """
    subject = "Välkommen!"
    body = f"Hej {data.name},\n\nVälkommen till vår tjänst! Vi är glada att ha dig med oss.\n\nHälsningar,\nDitt team"
    response = send_email(subject, body, data.email)
    if "error" in response:
        raise HTTPException(status_code=500, detail=response["error"])
    return {"message": "Välkomstmail skickat"}


@router.post("/send_info_email")
async def send_info_email(email: str, subject: str, message: str, attachment: str = None):
    """
    Endpoint för att skicka ett informationsmail, med valfri bifogad fil.
    """
    try:
        msg = MIMEMultipart()
        msg["From"] = SMTP_CONFIG["sender_email"]
        msg["To"] = email
        msg["Subject"] = subject
        msg.attach(MIMEText(message, "plain"))

        if attachment:
            filepath = os.path.join("backend", "db", "mydocs", attachment)
            if os.path.exists(filepath):
                with open(filepath, "rb") as f:
                    part = MIMEApplication(f.read(), Name=attachment)
                    part['Content-Disposition'] = f'attachment; filename="{attachment}"'
                    msg.attach(part)
            else:
                return {"error": f"Filen '{attachment}' hittades inte."}

        with smtplib.SMTP(SMTP_CONFIG["smtp_server"], SMTP_CONFIG["smtp_port"]) as server:
            server.starttls()
            server.login(SMTP_CONFIG["sender_email"], SMTP_CONFIG["sender_password"])
            server.sendmail(SMTP_CONFIG["sender_email"], email, msg.as_string())

        return {"message": "E-post skickades!"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Kunde inte skicka mail: {str(e)}")


@router.post("/log_service_request")
async def log_service_request(
    name: str = Form(...),
    company: str = Form(...),
    email: str = Form(...),
    service: str = Form(...)
):
    query = text("""
        INSERT INTO service_requests (name, company, email, service_choice)
        VALUES (:name, :company, :email, :service)
    """)
    values = {
        "name": name,
        "company": company,
        "email": email,
        "service": service,
    }

    try:
        await database.execute(query=query, values=values)
        return {"message": "Service request loggad i databasen"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
