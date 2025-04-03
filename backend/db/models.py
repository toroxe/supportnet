from sqlalchemy import Column, Integer, String, Text, Enum, ForeignKey, DateTime, func,Boolean, Float, Date, SmallInteger
from sqlalchemy.orm import Mapped, relationship, clear_mappers
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime ,date
from backend.db.database import Base
from pydantic import BaseModel, HttpUrl
from typing import Optional
import enum
from enum import Enum as PyEnum
from sqlalchemy.dialects.mysql import ENUM
    
# --------------------------------------
# Users Model
# --------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    c_name = Column(String(255), nullable=False)
    s_name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    role = Column(String(50), nullable=False, default="PROSPECT")  # Borttagen Enum
    status = Column(String(50), nullable=False, default="PROSPECT")  # Borttagen Enum
    password_hash = Column(String(255), nullable=False)
    session_cookie = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    company_name = Column(String(100), nullable=False, default="MySupportNet")
    rights = Column(String(50), nullable=False, default="NONE")  # Sträng istället för Enum
    active = Column(Boolean, default=True, nullable=False)  # 🔥 Nytt fält för aktivering/inaktivering
    
    postits = relationship("PostIt", back_populates="user")
    tasks = relationship("Task", back_populates="user")
    
    class Config:
        from_attributes = True

# --------------------------------------
# Analytic_log Model
# --------------------------------------

class AnalyticsLog(Base):
    __tablename__ = "analytics_log"
    __table_args__ = {"extend_existing": True}  # Lägg till denna rad
    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(String(255), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)
    page_url = Column(String(2048), nullable=True)
    action_type = Column(String(255), nullable=True)
    user_agent = Column(Text, nullable=True)
    region = Column(String(255), nullable=True)
    timevisit = Column(DateTime, nullable=False, default=func.current_timestamp())
    is_bot = Column(Boolean, nullable=False, default=False)
    
    class Config:
        from_attributes = True  # Ersätt orm_mode med detta
# --------------------------------------
# Kontrakt Model
# --------------------------------------
class Contract(Base):
    __tablename__ = "contracts"
    
    id = Column(Integer, primary_key=True, index=True)
    company_name = Column(String(100), nullable=False)
    ref_person = Column(String(50), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    phone = Column(String(20), nullable=False)
    zip = Column(String(10), nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False)  # ✅ NYTT FÄLT
    credit_assessed = Column(Boolean, default=False)
    pay_cond = Column(String(50), nullable=False)  # ✅ NYTT FÄLT
    invoice_model = Column(String(50), nullable=True)
    registration_date = Column(DateTime, server_default=func.now())
    status = Column(Boolean, default=True, nullable=False)  # Aktivt eller inaktivt kontrakt
    
    services = relationship("ContractServices", back_populates="contract", cascade="all, delete-orphan")
    todos = relationship("Todo", back_populates="contract", cascade="all, delete-orphan")

    class Config:
        from_attributes = True  # Säkerställer kompatibilitet med Pydantic
        
# -------------------------------------------------------------------------------------------------
# Tjänster kopplad till kontrakt
# -------------------------------------------------------------------------------------------------
class ContractServices(Base):
    __tablename__ = "contract_services"
    __table_args__ = {"extend_existing": True}  # ✅ Fixar problemet

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    
    member = Column(Boolean, default=False)
    userdoc = Column(Boolean, default=False)
    todo = Column(Boolean, default=False)
    postit = Column(Boolean, default=False)
    inbound = Column(Boolean, default=False)
    contract = relationship("Contract", back_populates="services")
    survey = Column(Boolean, default=False)
    
    class Config:
        from_attributes = True  # Säkerställer kompatibilitet med Pydantic
    
# --------------------------------------
# Eknonomiska transaktioner företag Model
# --------------------------------------
    
class Transaction(Base):
    __tablename__ = "transactions"
    __table_args__ = {'extend_existing': True}  # Lägg till detta
    transid = Column(Integer, primary_key=True, index=True, autoincrement=True)
    transaction_date = Column(Date, nullable=False)
    description = Column(String(255), nullable=True)
    income = Column(Float, default=0.0, nullable=True)
    expense = Column(Float, default=0.0, nullable=True)
    vat = Column(Float, default=0.0, nullable=True)
    balance = Column(Float, default=0.0, nullable=True)
    reserved_tax = Column(Float, default=0.0, nullable=True)
    total_vat = Column(Float, default=0.0, nullable=True)    
    created_at = Column(DateTime, default=func.now(), nullable=False)
    is_personal = Column(Boolean, default=False, nullable=False)
    no_vat = Column(Boolean, default=False, nullable=False)
    t_type = Column(Enum("regular", "update", name="transaction_type_enum"), nullable=False, default="regular")  # Ny kolumn
    
    class Config:
        from_attributes = True  # Ersätt orm_mode med detta
# -------------------------------------------------------------
# Blogginlägg med likes Är också modell för annons.
# -------------------------------------------------------------

class BlogPost(Base):
    __tablename__ = "blog_posts"
    __table_args__ = {'extend_existing': True}  # Viktigt för att undvika konflikt     
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    content = Column(String, nullable=False)
    likes = Column(Integer, default=0)
    contact_link = Column(String, nullable=False)
    is_advertisement = Column(Boolean, default=False)
    image_url = Column(String, nullable=True)  # Lägg till denna kolumn
    company_name = Column(String, nullable=True)  # Lägg till denna kolumn för kundhantering 

    class Config:
        from_attributes = True  # Ersätt orm_mode med detta
        
# ---------------------------------------------------------------------------
# Hanterar anslagstavlan och postit
# ---------------------------------------------------------------------------
class PostIt(Base):
    __tablename__ = "postit_notes"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    contract_id = Column(Integer, ForeignKey("contracts.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    text = Column(Text, nullable=False)
    
    user = relationship("User", back_populates="postits")
    
    class Config:
        from_attributes = True  # Ersätt orm_mode med detta
        
# ---------------------------------------------------------------------------
# Hanterar Att Göra
# ---------------------------------------------------------------------------
        
class Todo(Base):
    __tablename__ = "todo"

    id = Column(Integer, primary_key=True, autoincrement=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)  # Rubrik
    text = Column(Text, nullable=True)  # Beskrivning
    progress = Column(Enum("ej påbörjad", "påbörjad", "avslutad", name="progress_enum"), default="ej påbörjad", nullable=False)
    status = Column(Enum("ej planerad", "planerad", "enligt plan", "fördröjd", "avbruten", "arbete avslutat", "fakturerad", name="status_enum"),default="ej planerad", nullable=True)
    priority = Column(Enum("låg", "medel", "hög", name="priority_enum"), nullable=False)
    begin_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    finished = Column(Boolean, default=False, nullable=False)

    contract = relationship("Contract", back_populates="todos")
    tasks = relationship("Task", back_populates="todo", cascade="all, delete-orphan")   

    class Config:
        from_attributes = True

# ---------------------------------------------------------------------------
# Hanterar Tasks som är häng till Todo
# ---------------------------------------------------------------------------

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    todo_id = Column(Integer, ForeignKey("todo.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)  # Rubrik
    text = Column(Text, nullable=True)  # Instruktion/Beskrivning
    progress = Column(Integer, default=0, nullable=False)  # % färdigt (0–100)
    start_date = Column(Date, nullable=True)
    end_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    todo = relationship("Todo", back_populates="tasks")
    user = relationship("User", back_populates="tasks", foreign_keys=[user_id])
    reports = relationship("TaskReport", back_populates="task", cascade="all, delete-orphan")

    class Config:
        from_attributes = True 

# ---------------------------------------------------------------------------
# Hanterar task-reports so är häng till tasks
# ---------------------------------------------------------------------------

class TaskReport(Base):
    __tablename__ = "task_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    report_text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    task = relationship("Task", back_populates="reports")
    user = relationship("User")

    class Config:
        from_attributes = True

# -----------------------------------------------------------
# hanterar min tjänster
# -----------------------------------------------------------

Base = declarative_base()

class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    company = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    knowledge = Column(SmallInteger, default=0)
    advice = Column(SmallInteger, default=0)
    services = Column(SmallInteger, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    class Config:
        from_attributes = True
        
# ---------------------------------------------------------------
# Hanterar fälten för use case - survey
# ---------------------------------------------------------------

class Usecase(Base):
    __tablename__ = "usecases"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, autoincrement=True)

    # FK till user & kontrakt
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    contract_id = Column(Integer, ForeignKey("contracts.id", ondelete="CASCADE"), nullable=False)

    created_date = Column(Date, default=date.today, nullable=False)
    username = Column(String(100), nullable=False)

    frustration = Column(Text, nullable=False)
    waste = Column(Text, nullable=True)
    critical = Column(Text, nullable=True)
    errors = Column(Text, nullable=True)
    unused_data = Column(Text, nullable=True)
    feedback_time = Column(String(50), nullable=True)
    accounting = Column(Text, nullable=True)
    erp_system = Column(String(100), nullable=True)

    analysis = Column(Text, nullable=True)
    suggestions = Column(Text, nullable=True)

    class Config:
        from_attributes = True


