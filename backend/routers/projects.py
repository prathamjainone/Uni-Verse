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
    
@router.get("/{project_id}", response_model=dict)
def get_single_project(project_id: str):
    from database import get_document
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
    
    # Resolve members
    member_uids = proj.get("members", [])
    members_resolved = []
    for uid in member_uids:
        profile = get_document('users', uid)
        if profile:
            members_resolved.append({
                "uid": uid,
                "name": profile.get("display_name", "Unknown"),
                "email": profile.get("email", "No email"),
                "branch": profile.get("branch", ""),
                "skills": profile.get("skills", []),
                "bio": profile.get("bio", ""),
                "github": profile.get("github", "")
            })
        else:
            members_resolved.append({"uid": uid, "name": "Unknown", "email": "No profile yet", "branch": "", "skills": [], "github": ""})
            
    # Resolve join requests
    request_uids = proj.get("join_requests", [])
    requests_resolved = []
    for uid in request_uids:
        profile = get_document('users', uid)
        if profile:
            requests_resolved.append({
                "uid": uid,
                "name": profile.get("display_name", "Unknown"),
                "email": profile.get("email", "No email"),
                "branch": profile.get("branch", ""),
                "skills": profile.get("skills", []),
                "github": profile.get("github", "")
            })
        else:
            requests_resolved.append({"uid": uid, "name": "Unknown", "email": "No profile yet", "branch": "", "skills": [], "github": ""})

    proj["members_info"] = members_resolved
    proj["join_requests_info"] = requests_resolved
    return {"success": True, "project": proj}

@router.post("/", response_model=ProjectBase)
def create_project(project: ProjectBase):
    data = project.model_dump(exclude={'id'})
    data['created_at'] = project.created_at.strftime('%Y-%m-%dT%H:%M:%S')
    data['upvoted_by'] = []
    data['comments'] = []
    data['join_requests'] = []
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
            join_requests = doc.get("join_requests", [])
            
            # If they are already a member, they leave
            if payload.user_id in members:
                members.remove(payload.user_id)
                update_document('projects', project_id, {"members": members})
                return {"success": True, "status": "left", "members": members}
            else:
                # Toggle join request
                if payload.user_id in join_requests:
                    join_requests.remove(payload.user_id)
                    status = "request_cancelled"
                else:
                    join_requests.append(payload.user_id)
                    status = "requested"
                
                update_document('projects', project_id, {"join_requests": join_requests})
                return {"success": True, "status": status, "join_requests": join_requests}
                
    return {"success": False, "error": "Project not found"}

@router.post("/{project_id}/requests/{user_id}/accept")
def accept_join_request(project_id: str, user_id: str):
    from database import get_document
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
        
    members = proj.get("members", [])
    join_requests = proj.get("join_requests", [])
    
    if user_id in join_requests:
        join_requests.remove(user_id)
        if user_id not in members:
            members.append(user_id)
        update_document('projects', project_id, {"members": members, "join_requests": join_requests})
        return {"success": True}
        
    return {"success": False, "error": "User not in requests"}

@router.post("/{project_id}/requests/{user_id}/reject")
def reject_join_request(project_id: str, user_id: str):
    from database import get_document
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
        
    join_requests = proj.get("join_requests", [])
    
    if user_id in join_requests:
        join_requests.remove(user_id)
        update_document('projects', project_id, {"join_requests": join_requests})
        return {"success": True}
        
    return {"success": False, "error": "User not in requests"}

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

@router.delete("/{project_id}/members/{user_id}")
def remove_project_member(project_id: str, user_id: str):
    from database import get_document, update_document
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
        
    members = proj.get("members", [])
    if user_id in members:
        members.remove(user_id)
        update_document('projects', project_id, {"members": members})
        return {"success": True}
        
    return {"success": False, "error": "User not in project"}

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

class UpdateProjectGithub(BaseModel):
    github_url: str

@router.put("/{project_id}/github")
def update_project_github(project_id: str, payload: UpdateProjectGithub):
    from database import update_document, get_document
    proj = get_document('projects', project_id)
    if not proj:
        return {"success": False, "error": "Project not found"}
    update_document('projects', project_id, {"github_url": payload.github_url})
    return {"success": True}

@router.delete("/{project_id}")
def delete_project(project_id: str):
    from database import delete_document
    success = delete_document("projects", project_id)
    if success:
        return {"success": True}
    return {"success": False, "error": "Project not found"}

