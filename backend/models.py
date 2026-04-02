import os
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class UserBase(BaseModel):
    uid: str
    email: str
    display_name: str
    branch: str  # e.g., CSE, Business, Design
    skills: List[str] = []
    bio: Optional[str] = ""
    github: Optional[str] = ""

class ProjectBase(BaseModel):
    id: Optional[str] = None
    title: str
    description: str
    owner_uid: str
    required_skills: List[str] = []
    members: List[str] = [] 
    upvotes: int = 0
    upvoted_by: List[str] = []
    comments: List[dict] = []
    github_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PostBase(BaseModel):
    id: Optional[str] = None
    author_uid: str
    author_name: str
    title: str
    content: str
    tags: List[str] = []
    upvotes: int = 0
    upvoted_by: List[str] = []
    comments: List[dict] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
