from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Anslutningssträng till databasen
import os
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[3]
load_dotenv(PROJECT_ROOT / ".env")

DATABASE_URL = (
    f"mysql+pymysql://{os.getenv('DB_USER')}:"
    f"{os.getenv('DB_PASSWORD')}@"
    f"{os.getenv('DB_HOST')}/"
    f"{os.getenv('DB_NAME')}"
)
# Skapa SQLAlchemy Engine
engine = create_engine(DATABASE_URL)

# Skapa en SessionLocal-fabrik för databasanrop
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Bas för att skapa SQLAlchemy-modeller
Base = declarative_base()

# Funktion för att få en databas-session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
