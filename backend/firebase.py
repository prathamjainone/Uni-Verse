import os
import firebase_admin
from firebase_admin import credentials, firestore

def init_firebase():
    """Initializes the Firebase Admin SDK."""
    try:
        if not firebase_admin._apps:
            if os.path.exists("service-account.json"):
                cred = credentials.Certificate("service-account.json")
                firebase_admin.initialize_app(cred)
                print("Firebase initialized successfully.")
            else:
                print("WARNING: service-account.json not found. Serving mock data until Firebase is configured by the user.")
    except Exception as e:
        print(f"Firebase init error: {e}")

def get_db():
    try:
        if firebase_admin._apps:
            return firestore.client()
    except Exception:
        pass
    return None
