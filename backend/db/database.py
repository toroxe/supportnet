from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Anslutningssträng till databasen
DATABASE_URL = "mysql+pymysql://root:frejaHund@localhost:3307/supportnet"

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
