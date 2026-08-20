import asyncio
import logging
import os
import re
import smtplib
import ssl
import traceback
from email import encoders
from email.mime.application import MIMEApplication
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from fastapi import APIRouter, Form, HTTPException
from pydantic import BaseModel
from sqlalchemy import text

from core.backend.db.database import get_db


logger = logging.getLogger(__name__)
router = APIRouter()

SMTP_SERVER = "mailcluster.loopia.se"
SMTP_PORT = 587
SMTP_TIMEOUT_SECONDS = 15
CONTACT_RECIPIENT_EMAIL = os.getenv(
    "CONTACT_RECIPIENT_EMAIL",
    "tord.oxelgren@gmail.com"
)
EMAIL_PATTERN = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,189}\.[^@\s]{2,63}$")


def _smtp_credentials():
    sender_email = os.getenv("SMTP_SENDER_EMAIL", "tord@supportnet.se").strip()
    sender_password = os.getenv("SMTP_PASSWORD")

    if not sender_password:
        raise RuntimeError("SMTP_PASSWORD saknas i serverns miljö")

    return sender_email, sender_password


def _send_email_sync(
    subject: str,
    body: str,
    recipient_email: str,
    attachment_path: str = None,
    reply_to: str = None
):
    sender_email, sender_password = _smtp_credentials()

    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = recipient_email
    msg["Subject"] = subject
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.attach(MIMEText(body, "plain", "utf-8"))

    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, "rb") as attachment_file:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment_file.read())
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename={os.path.basename(attachment_path)}"
            )
            msg.attach(part)

    tls_context = ssl.create_default_context()
    with smtplib.SMTP(
        SMTP_SERVER,
        SMTP_PORT,
        timeout=SMTP_TIMEOUT_SECONDS
    ) as server:
        server.ehlo()
        server.starttls(context=tls_context)
        server.ehlo()
        server.login(sender_email, sender_password)
        server.send_message(msg)


async def send_email(
    subject: str,
    body: str,
    recipient_email: str,
    attachment_path: str = None,
    reply_to: str = None
):
    try:
        await asyncio.to_thread(
            _send_email_sync,
            subject,
            body,
            recipient_email,
            attachment_path,
            reply_to
        )
        return {"message": "E-post skickades!"}
    except Exception as error:
        logger.exception("E-postutskick misslyckades")
        return {"error": str(error)}


def _validated_contact_values(name: str, email: str, message: str):
    clean_name = name.strip()
    clean_email = email.strip().lower()
    clean_message = message.strip()

    if not clean_name or len(clean_name) > 100 or "\n" in clean_name or "\r" in clean_name:
        raise HTTPException(status_code=422, detail="Ange ett giltigt namn")

    if len(clean_email) > 254 or not EMAIL_PATTERN.fullmatch(clean_email):
        raise HTTPException(status_code=422, detail="Ange en giltig e-postadress")

    if not clean_message or len(clean_message) > 5000 or "\x00" in clean_message:
        raise HTTPException(status_code=422, detail="Meddelandet måste vara 1-5000 tecken")

    return clean_name, clean_email, clean_message


@router.post("/send_contact_email")
async def send_contact_email(
    name: str = Form(...),
    email: str = Form(...),
    message: str = Form(...)
):
    clean_name, clean_email, clean_message = _validated_contact_values(
        name,
        email,
        message
    )

    subject = f"Kontaktförfrågan från {clean_name}"
    body = (
        f"Namn: {clean_name}\n"
        f"E-post: {clean_email}\n"
        f"Meddelande:\n{clean_message}"
    )
    response = await send_email(
        subject,
        body,
        CONTACT_RECIPIENT_EMAIL,
        reply_to=clean_email
    )

    if "error" in response:
        raise HTTPException(
            status_code=502,
            detail="Meddelandet kunde inte skickas just nu"
        )

    return response


class EmailPayload(BaseModel):
    email: str
    name: str


@router.post("/send_welcome_email")
async def send_welcome_email(data: EmailPayload):
    subject = "Välkommen till MySupportNet"
    body = f"""
    Hej {data.name}!

    Tack för att du vill testa och se vad detta är.
    Vi är glada att ha med dig, hör gärna av dig!

    Vänliga hälsningar,
    Teamet på MySupportNet
    """

    try:
        response = await send_email(subject, body, data.email)

        if "error" in response:
            logger.error("Kunde inte skicka valkomstmail: %s", response["error"])
            raise HTTPException(status_code=500, detail=response["error"])

        logger.info("Welcome-mail skickat till %s", data.email)
        return {"status": "sent", "email": data.email}

    except Exception as error:
        logger.error("Fel vid e-postutskick till %s: %s", data.email, error)
        traceback.print_exc()
        return {"status": "error", "detail": str(error)}


@router.post("/send_info_email")
async def send_info_email(
    email: str,
    subject: str,
    message: str,
    attachment: str = None,
    cc: str = None
):
    try:
        sender_email, sender_password = _smtp_credentials()
        msg = MIMEMultipart()
        msg["From"] = sender_email
        msg["To"] = email
        msg["Cc"] = cc
        recipients = [email]
        if cc:
            recipients.append(cc)

        msg["Subject"] = subject
        msg.attach(MIMEText(message, "plain", "utf-8"))

        if attachment:
            base_dir = os.path.dirname(os.path.abspath(__file__))
            filepath = os.path.join(base_dir, "../db/mydocs", attachment)
            if os.path.exists(filepath):
                with open(filepath, "rb") as attachment_file:
                    part = MIMEApplication(attachment_file.read(), Name=attachment)
                    part["Content-Disposition"] = f'attachment; filename="{attachment}"'
                    msg.attach(part)
            else:
                return {"error": f"Filen '{attachment}' hittades inte."}

        tls_context = ssl.create_default_context()
        with smtplib.SMTP(
            SMTP_SERVER,
            SMTP_PORT,
            timeout=SMTP_TIMEOUT_SECONDS
        ) as server:
            server.starttls(context=tls_context)
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, recipients, msg.as_string())

        return {"message": "E-post skickades!"}

    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Kunde inte skicka mail: {str(error)}"
        )


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
        db = next(get_db())
        db.execute(query, values)
        db.commit()
        return {"message": "Service request loggad i databasen"}
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error))
