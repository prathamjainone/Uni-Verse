from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from firebase import init_firebase
from routers import projects, community, users

app = FastAPI(title="Uni-Verse API", description="Backend for Uni-Verse team formation system")

# Initialize Firebase on startup (gracefully falls back to Local JSON persist)
init_firebase()

# Configure CORS — explicit origins required when credentials are involved
import os
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
# Always include the Vercel deployment
allowed_origins += [
    "https://uni-verse-lake.vercel.app",
    "https://uni-verse.vercel.app",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects.router)
app.include_router(community.router)
app.include_router(users.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the Uni-Verse API!"}
