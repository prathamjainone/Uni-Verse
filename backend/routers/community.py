from fastapi import APIRouter
from typing import List
from pydantic import BaseModel
from models import PostBase
from database import get_collection, create_document, update_document

router = APIRouter(prefix="/api/community", tags=["Community"])

class UpvoteRequest(BaseModel):
    user_id: str

class CommentRequest(BaseModel):
    user_id: str
    user_name: str
    text: str

@router.get("/", response_model=List[PostBase])
def get_all_posts():
    docs = get_collection('posts')
    # Default sort by upvotes for the community page
    docs_sorted = sorted(docs, key=lambda x: x.get('upvotes', 0), reverse=True)
    return [PostBase(**doc) for doc in docs_sorted]
    
@router.post("/", response_model=PostBase)
def create_post(post: PostBase):
    data = post.model_dump(exclude={'id'})
    data['created_at'] = post.created_at.strftime('%Y-%m-%dT%H:%M:%S')
    # Default initial arrays for new posts
    data['upvoted_by'] = []
    data['comments'] = []
    new_id = create_document('posts', data)
    post.id = new_id
    return post

@router.post("/{post_id}/upvote")
def upvote_post(post_id: str, payload: UpvoteRequest):
    docs = get_collection('posts')
    for doc in docs:
        if doc.get("id") == post_id:
            upvoted_by = doc.get("upvoted_by", [])
            upvotes = doc.get("upvotes", 0)
            
            if payload.user_id in upvoted_by:
                # Remove upvote (Toggle off)
                upvoted_by.remove(payload.user_id)
                upvotes -= 1
            else:
                # Add upvote
                upvoted_by.append(payload.user_id)
                upvotes += 1
                
            update_document('posts', post_id, {"upvotes": upvotes, "upvoted_by": upvoted_by})
            return {"success": True, "new_upvotes": upvotes, "upvoted_by": upvoted_by}
            
    return {"success": False, "error": "Post not found"}

@router.post("/{post_id}/comments")
def add_comment(post_id: str, payload: CommentRequest):
    import uuid
    from datetime import datetime
    docs = get_collection('posts')
    for doc in docs:
        if doc.get("id") == post_id:
            comments = doc.get("comments", [])
            new_comment = {
                "id": str(uuid.uuid4()),
                "user_id": payload.user_id,
                "user_name": payload.user_name,
                "text": payload.text,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            comments.append(new_comment)
            update_document('posts', post_id, {"comments": comments})
            return {"success": True, "comment": new_comment}
            
    return {"success": False, "error": "Post not found"}

@router.delete("/{post_id}")
def delete_post(post_id: str):
    from database import delete_document
    success = delete_document("posts", post_id)
    if success:
        return {"success": True}
    return {"success": False, "error": "Post not found"}
