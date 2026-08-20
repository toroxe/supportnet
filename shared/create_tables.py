from core.backend.db.database import engine, Base
from core.backend.db.models import *

print("Creating tables...")

Base.metadata.create_all(bind=engine)

print("Done.")