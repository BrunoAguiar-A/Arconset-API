import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent))

from models.user import User
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

DATABASE_URL = "postgresql://arconsetadm:ArconSet2024%23Hvac%21789@arconset-db.cdaoqsa6uqtv.sa-east-1.rds.amazonaws.com:5432/arconset_db?"

engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)
session = Session()

usuarios = session.query(User).all()

for u in usuarios:
    print(u.id, u.username, u.email, u.password_hash)