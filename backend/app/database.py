"""
Database setup.

Single-user, local-first: SQLite by default. Because we only use
SQLAlchemy's ORM layer (no raw SQLite-specific SQL), switching to
Postgres later is just changing DATABASE_URL and installing psycopg2 -
no query rewrites needed.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DATA_DIR = os.environ.get("SE_TOOL_DATA_DIR", os.path.expanduser("~/.se-tool"))
os.makedirs(DATA_DIR, exist_ok=True)

DATABASE_URL = os.environ.get(
    "DATABASE_URL", f"sqlite:///{os.path.join(DATA_DIR, 'se_tool.db')}"
)

connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
