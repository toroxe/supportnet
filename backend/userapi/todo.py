from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from backend.db.database import get_db
from backend.db.models import Todo
from backend.auth.security import get_current_user
from pydantic import BaseModel
from typing import Optional, List
import logging

# Skapa en logger
logging.basicConfig(level=logging.INFO)

router = APIRouter()

# 🟢 Schema för inkommande och utgående data
class TodoSchema(BaseModel):
    contract_id: int
    name: str
    text: Optional[str] = None
    progress: str = None
    status: str = None
    priority: str = None
    begin_date: Optional[date] = None  # ✅ Ändrat här
    due_date: Optional[date] = None
    finished: bool = False
    
class TodoUpdateSchema(BaseModel):
    name: Optional[str] = None
    text: Optional[str] = None
    progress: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    begin_date: Optional[date] = None  # ✅ Ändrat här
    due_date: Optional[date] = None
    finished: Optional[bool] = None

# 🟢 Skapa en To-Do
@router.post("/todo")
def create_todo(todo: TodoSchema, db: Session = Depends(get_db)):
    # Säkerställ att alla obligatoriska fält finns
    if  not todo.contract_id or not todo.name:
        raise HTTPException(status_code=400, detail="❌ Saknade fält!")

    # Skapa en ny Todo-instans
    new_todo = Todo(
    contract_id=todo.contract_id,
    name=todo.name,
    text=todo.text,
    progress=todo.progress,
    status=todo.status,
    priority=todo.priority,
    begin_date=todo.begin_date,  # ✅ Ändrat här
    due_date=todo.due_date,
    finished=todo.finished,
)


    db.add(new_todo)
    db.commit()
    db.refresh(new_todo)

    return {"message": "✅ Todo skapad!", "todo_id": new_todo.id}

# 🟢 Hämta alla aktiva To-Dos (ej avslutade)
@router.get("/todo/{contract_id}")
def get_todos(contract_id: int, db: Session = Depends(get_db)):
    todos = db.query(Todo).filter(Todo.contract_id == contract_id, Todo.finished == False).all()
    if not todos:
        raise HTTPException(status_code=404, detail="❌ Inga aktiva To-Dos hittades.")
    return todos

# 🟢 Uppdatera en To-Do (inkl. ändra "avslutad"-status)
@router.patch("/todo/{todo_id}")
def update_todo(todo_id: int, todo: TodoUpdateSchema, db: Session = Depends(get_db)):
    existing_todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not existing_todo:
        raise HTTPException(status_code=404, detail="❌ To-Do hittades inte.")

    for key, value in todo.dict(exclude_unset=True).items():
        setattr(existing_todo, key, value)

    db.commit()
    db.refresh(existing_todo)
    return existing_todo

# 🟢 Ta bort en To-Do
@router.delete("/todo/{todo_id}")
def delete_todo(todo_id: int, db: Session = Depends(get_db)):
    existing_todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not existing_todo:
        raise HTTPException(status_code=404, detail="❌ To-Do hittades inte.")

    db.delete(existing_todo)
    db.commit()
    return {"message": "✅ To-Do raderad"}
