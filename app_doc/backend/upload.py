from fastapi import APIRouter, UploadFile, Form
from fastapi.responses import JSONResponse
import os, shutil, json
from datetime import datetime

router = APIRouter()

# Stigar
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "..", "db")
DOCS_DIR = os.path.join(DB_DIR, "mydocs")
METADATA_FILE = os.path.join(DB_DIR, "sandbox.json")

# Se till att mappen finns
os.makedirs(DOCS_DIR, exist_ok=True)

@router.post("/upload")
async def upload_file(user: str = Form(...), text: str = Form(...), file: UploadFile = Form(...)):
    filename = f"{datetime.now().strftime('%Y%m%d%H%M%S')}_{file.filename}"
    file_path = os.path.join(DOCS_DIR, filename)

    # Spara filen till disk
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Skapa metadata
    entry = {
        "user": user,
        "text": text,
        "filename": filename,
        "timestamp": datetime.now().isoformat()
    }

    # Läs in befintlig metadata
    if os.path.exists(METADATA_FILE):
        with open(METADATA_FILE, "r", encoding="utf-8") as meta_file:
            try:
                metadata = json.load(meta_file)
            except json.JSONDecodeError:
                metadata = []
    else:
        metadata = []

    metadata.append(entry)

    # Spara uppdaterad metadata
    with open(METADATA_FILE, "w", encoding="utf-8") as meta_file:
        json.dump(metadata, meta_file, indent=2, ensure_ascii=False)

    # Returnera respons
    return JSONResponse({
        "message": "Fil sparad",
        "filename": filename,
        "path": f"/mydocs/{filename}",
        "entry": entry
    })
