from fastapi import APIRouter
import os

router = APIRouter()

@router.get("/list-mydocs")
def list_mydocs():
    doc_path = "backend/db/mydocs"
    try:
        files = os.listdir(doc_path)
        return {"files": files}
    except Exception as e:
        return {"error": str(e)}
