from fastapi import APIRouter, Form
from fastapi.responses import JSONResponse
from .mail import send_contact_email  # Importera befintlig mejlfunktion

router = APIRouter()

@router.post("/submit-service")
async def submit_service(
    service: str = Form(...),
    name: str = Form(...),
    company: str = Form(...),
    email: str = Form(...)
):
    try:
        # Validera inkommande data
        if not service or not name or not company or not email:
            raise ValueError("Alla fält är obligatoriska!")

        # Format för e-postmeddelandet
        message = f"""
        En ny tjänsteförfrågan har inkommit!
        
        Tjänst: {service}
        Namn: {name}
        Företag: {company}
        E-post: {email}
        """

        # Skicka e-post med befintlig funktion
        email_response = await send_contact_email(name=name, email=email, message=message)

        return JSONResponse(content={"message": "Tjänsteförfrågan har skickats!"}, status_code=200)

    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=500)
