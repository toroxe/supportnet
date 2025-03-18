import os
import smtplib
from fastapi import APIRouter, Form, HTTPException
from starlette.responses import JSONResponse
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from pydantic import BaseModel

# Router
router = APIRouter()

# SMTP Konfiguration
SMTP_CONFIG = {
    "sender_email": os.getenv("SMTP_SENDER_EMAIL", "tord@supportnet.se"),
    "sender_password": os.getenv("SMTP_PASSWORD", "majo4Fq7"),
    "smtp_server": "mailcluster.loopia.se",
    "smtp_port": 587
}

def send_email(subject: str, body: str, recipient_email: str):
    """
    Generisk funktion för att skicka e-post.
    """
    try:
        msg = MIMEMultipart()
        msg["From"] = SMTP_CONFIG["sender_email"]
        msg["To"] = recipient_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

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
async def send_info_email(email: str, subject: str, message: str):
    """
    Endpoint för att skicka ett informationsmail.
    """
    response = send_email(subject, message, email)
    if "error" in response:
        raise HTTPException(status_code=500, detail=response["error"])
    return JSONResponse(content=response, status_code=200)
