from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.db.models import Task, TaskReport
from backend.auth.security import get_current_user
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter()

# -----------------------------
# Pydantic Schemas
# -----------------------------

class TaskBase(BaseModel):
    todo_id: int
    user_id: Optional[int] = None
    title: str
    text: Optional[str] = None
    progress: int
    start_date: Optional[str] = None
    due_date: Optional[str] = None

class TaskReportBase(BaseModel):
    task_id: int
    user_id: Optional[int] = None
    report_text: str

# -----------------------------
# Task Endpoints
# -----------------------------

@router.post("/tasks/")
def create_task(task: TaskBase, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    new_task = Task(**task.dict())
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@router.get("/tasks/")
def get_tasks(user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Task).all()

@router.get("/tasks/{task_id}")
def get_task(task_id: int, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@router.patch("/tasks/{task_id}")
def update_task(task_id: int, updates: dict, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for key, value in updates.items():
        if hasattr(task, key):
            setattr(task, key, value)
    db.commit()
    db.refresh(task)
    return task

@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"message": "Task deleted"}

# -----------------------------
# TaskReport Endpoints
# -----------------------------

@router.post("/task_reports/")
def create_task_report(report: TaskReportBase, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    new_report = TaskReport(**report.dict())
    db.add(new_report)
    db.commit()
    db.refresh(new_report)
    return new_report

@router.get("/tasks/{task_id}/reports")
def get_task_reports(task_id: int, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    reports = db.query(TaskReport).filter(TaskReport.task_id == task_id).all()
    if not reports:
        raise HTTPException(status_code=404, detail="No reports found for this task")
    return reports

@router.delete("/task_reports/{report_id}")
def delete_task_report(report_id: int, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    report = db.query(TaskReport).filter(TaskReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"message": "Report deleted"}

@router.patch("/task_reports/{report_id}")
def update_task_report(report_id: int, updates: dict, user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    report = db.query(TaskReport).filter(TaskReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    for key, value in updates.items():
        if hasattr(report, key):
            setattr(report, key, value)
    db.commit()
    db.refresh(report)
    return report


