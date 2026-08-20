from fastapi import APIRouter, HTTPException, Request
import os

router = APIRouter()

@router.get("/list-mydocs")
def list_mydocs(request: Request):
    doc_path = "backend/db/mydocs"
    ip = request.client.host
    agent = request.headers.get("user-agent")
    print(f"[👀 API HIT] IP: {ip} | UA: {agent}")
    try:
        files = os.listdir(doc_path)
        return {"files": files}
    except Exception as e:
        return {"error": str(e)}