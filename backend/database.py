import json
import os
import uuid
from typing import List, Dict, Any
from firebase import get_db as get_firestore_db

DB_FILE = "universe.json"

def _load_db() -> Dict[str, Any]:
    if not os.path.exists(DB_FILE):
        default_db = {
            "projects": [],
            "posts": []
        }
        with open(DB_FILE, "w") as f:
            json.dump(default_db, f, indent=2)
        return default_db
    with open(DB_FILE, "r") as f:
        return json.load(f)

def _save_db(data: Dict[str, Any]):
    with open(DB_FILE, "w") as f:
        json.dump(data, f, indent=2)

def get_collection(collection_name: str) -> List[Dict[str, Any]]:
    fs_db = get_firestore_db()
    if fs_db:
        docs = fs_db.collection(collection_name).stream()
        return [doc.to_dict() | {"id": doc.id} for doc in docs]
        
    db = _load_db()
    return db.get(collection_name, [])

def create_document(collection_name: str, data: Dict[str, Any]) -> str:
    fs_db = get_firestore_db()
    if fs_db:
        doc_ref = fs_db.collection(collection_name).document()
        data["id"] = doc_ref.id
        doc_ref.set(data)
        return doc_ref.id
        
    db = _load_db()
    new_id = str(uuid.uuid4())
    data["id"] = new_id
    if collection_name not in db:
        db[collection_name] = []
    db[collection_name].append(data)
    _save_db(db)
    return new_id

def update_document(collection_name: str, doc_id: str, updates: Dict[str, Any]) -> bool:
    fs_db = get_firestore_db()
    if fs_db:
        doc_ref = fs_db.collection(collection_name).document(doc_id)
        if doc_ref.get().exists:
            doc_ref.update(updates)
            return True
        return False
        
    db = _load_db()
    items = db.get(collection_name, [])
    for item in items:
        if item.get("id") == doc_id:
            item.update(updates)
            _save_db(db)
            return True
    return False

def delete_document(collection_name: str, doc_id: str) -> bool:
    fs_db = get_firestore_db()
    if fs_db:
        doc_ref = fs_db.collection(collection_name).document(doc_id)
        if doc_ref.get().exists:
            doc_ref.delete()
            return True
        return False
        
    db = _load_db()
    items = db.get(collection_name, [])
    for i, item in enumerate(items):
        if item.get("id") == doc_id:
            del items[i]
            _save_db(db)
            return True
    return False

def get_document(collection_name: str, doc_id: str) -> Dict[str, Any]:
    fs_db = get_firestore_db()
    if fs_db:
        doc_ref = fs_db.collection(collection_name).document(doc_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict() | {"id": doc.id}
        return None
        
    db = _load_db()
    items = db.get(collection_name, [])
    for item in items:
        if item.get("id") == doc_id:
            return item
    return None

def upsert_document(collection_name: str, doc_id: str, data: Dict[str, Any]) -> str:
    fs_db = get_firestore_db()
    if fs_db:
        doc_ref = fs_db.collection(collection_name).document(doc_id)
        data["id"] = doc_id
        doc_ref.set(data, merge=True)
        return doc_id
        
    db = _load_db()
    if collection_name not in db:
        db[collection_name] = []
    
    data["id"] = doc_id
    items = db[collection_name]
    for i, item in enumerate(items):
        if item.get("id") == doc_id:
            items[i].update(data)
            _save_db(db)
            return doc_id
            
    items.append(data)
    _save_db(db)
    return doc_id
