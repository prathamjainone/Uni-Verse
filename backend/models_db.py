from sqlalchemy import Column, String, Integer, DateTime, Text, JSON
from datetime import datetime
from database import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class ProjectDB(Base):
    __tablename__ = "projects"
    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, index=True)
    description = Column(Text)
    owner_uid = Column(String)
    required_skills = Column(JSON) # List of strings stored as JSON
    members = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)

class PostDB(Base):
    __tablename__ = "posts"
    id = Column(String, primary_key=True, default=generate_uuid)
    author_uid = Column(String)
    author_name = Column(String)
    title = Column(String)
    content = Column(Text)
    tags = Column(JSON)
    upvotes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
