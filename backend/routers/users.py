from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from database import get_document, upsert_document

router = APIRouter(
    prefix="/api/users",
    tags=["users"]
)

class UserProfileRequest(BaseModel):
    uid: str
    email: str
    display_name: str
    branch: str
    year: str
    github: Optional[str] = ""
    bio: str
    skills: List[str]

@router.get("/{uid}")
def get_user_profile(uid: str):
    doc = get_document("users", uid)
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    return doc

@router.post("/profile")
def save_user_profile(payload: UserProfileRequest):
    # In a production app context, verify Secure Headers / Auth tokens
    user_data = payload.dict()
    upsert_document("users", payload.uid, user_data)
    return {"success": True, "message": "Profile saved safely"}
