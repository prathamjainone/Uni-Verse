from fastapi import APIRouter
from typing import List
from models import ProjectBase
from database import get_collection, create_document, update_document
from pydantic import BaseModel

router = APIRouter(prefix="/api/projects", tags=["Projects"])

class UpvoteRequest(BaseModel):
    user_id: str

class CommentRequest(BaseModel):
    user_id: str
    user_name: str
    text: str

class JoinRequest(BaseModel):
    user_id: str

@router.get("/", response_model=List[ProjectBase])
def get_all_projects():
    docs = get_collection('projects')
    docs_sorted = sorted(docs, key=lambda x: x.get('upvotes', 0), reverse=True)
    return [ProjectBase(**doc) for doc in docs_sorted]
    
@router.post("/", response_model=ProjectBase)
def create_project(project: ProjectBase):
    data = project.model_dump(exclude={'id'})
    data['created_at'] = project.created_at.strftime('%Y-%m-%dT%H:%M:%S')
    data['upvoted_by'] = []
    data['comments'] = []
    new_id = create_document('projects', data)
    project.id = new_id
    return project

@router.post("/{project_id}/upvote")
def upvote_project(project_id: str, payload: UpvoteRequest):
    docs = get_collection('projects')
    for doc in docs:
        if doc.get("id") == project_id:
            upvoted_by = doc.get("upvoted_by", [])
            upvotes = doc.get("upvotes", 0)
            
            if payload.user_id in upvoted_by:
                upvoted_by.remove(payload.user_id)
                upvotes -= 1
            else:
                upvoted_by.append(payload.user_id)
                upvotes += 1
                
            update_document('projects', project_id, {"upvotes": upvotes, "upvoted_by": upvoted_by})
            return {"success": True, "new_upvotes": upvotes, "upvoted_by": upvoted_by}
    return {"success": False, "error": "Project not found"}

@router.post("/{project_id}/comments")
def add_project_comment(project_id: str, payload: CommentRequest):
    import uuid
    from datetime import datetime
    docs = get_collection('projects')
    for doc in docs:
        if doc.get("id") == project_id:
            comments = doc.get("comments", [])
            new_comment = {
                "id": str(uuid.uuid4()),
                "user_id": payload.user_id,
                "user_name": payload.user_name,
                "text": payload.text,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            comments.append(new_comment)
            update_document('projects', project_id, {"comments": comments})
            return {"success": True, "comment": new_comment}
    return {"success": False, "error": "Project not found"}

@router.post("/{project_id}/join")
def join_project(project_id: str, payload: JoinRequest):
    docs = get_collection('projects')
    for doc in docs:
        if doc.get("id") == project_id:
            members = doc.get("members", [])
            
            if payload.user_id in members:
                members.remove(payload.user_id)
            else:
                members.append(payload.user_id)
                
            update_document('projects', project_id, {"members": members})
            return {"success": True, "members": members}
    return {"success": False, "error": "Project not found"}

@router.get("/{project_id}/members")
def get_project_members(project_id: str):
    from database import get_document
    docs = get_collection('projects')
    for doc in docs:
        if doc.get("id") == project_id:
            member_uids = doc.get("members", [])
            resolved = []
            for uid in member_uids:
                profile = get_document('users', uid)
                if profile:
                    resolved.append({
                        "uid": uid,
                        "name": profile.get("display_name", "Unknown"),
                        "email": profile.get("email", "No email"),
                        "branch": profile.get("branch", ""),
                        "skills": profile.get("skills", [])
                    })
                else:
                    resolved.append({"uid": uid, "name": "Unknown", "email": "No profile yet", "branch": "", "skills": []})
            return {"success": True, "members": resolved}
    return {"success": False, "error": "Project not found"}

@router.post("/{project_id}/match")
def match_project(project_id: str, payload: dict):
    from database import get_document
    from services.ai_matcher import calculate_match_score

    # Check Project
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
        
    # Check User
    user_id = payload.get("user_id")
    inline_skills = payload.get("skills", [])  # Fallback skills sent directly from frontend
    
    user_profile = get_document('users', user_id)
    student_skills = user_profile.get("skills", []) if user_profile else inline_skills
    
    project_reqs = ", ".join(proj.get("required_skills", []))
    
    # Always run matcher — calculate_match_score handles empty skills gracefully
    match_result = calculate_match_score(student_skills, project_reqs)
    return {"success": True, "match": match_result}

@router.delete("/{project_id}")
def delete_project(project_id: str):
    from database import delete_document
    success = delete_document("projects", project_id)
    if success:
        return {"success": True}
    return {"success": False, "error": "Project not found"}
