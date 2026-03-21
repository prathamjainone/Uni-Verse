<div align="center">

# 🌌 Uni-Verse

### *Where University Minds Collide*

**A full-stack social platform for university students to discover teammates, pitch projects, and connect through AI-powered matchmaking.**

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Groq](https://img.shields.io/badge/Groq-Llama--3.3-FF6B35?style=flat-square)](https://console.groq.com)

</div>

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Google Auth** | One-click sign-in with Firebase Authentication |
| 🧑‍💻 **Onboarding Flow** | New users fill in branch, year, skills, GitHub, and bio |
| 🚀 **Discover Teams** | Browse projects posted by fellow students |
| 🤖 **AI Matchmaking** | Groq Llama-3.3 scores your skills against project requirements |
| 💬 **Community Feed** | Post updates, comment, and engage with the university network |
| 👥 **Join / Leave Teams** | Request to join any open project |
| 🗑️ **Full CRUD** | Create, read, update, and delete posts & projects |
| 📋 **Member Dashboard** | Project owners see joined members with contact details |
| ✏️ **Profile Editor** | Update your name, skills, bio, and GitHub at any time |

---

## 🏗️ Tech Stack

```
Uni-Verse/
├── frontend/          # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── pages/     # Landing, Home, Discover, Onboarding, Profile
│   │   ├── components/ # Navbar, CreateProjectModal
│   │   └── context/   # AuthContext (Firebase + profile state)
│   └── .env           # Firebase credentials (see .env.example)
│
└── backend/           # Python FastAPI
    ├── routers/       # community.py, projects.py, users.py
    ├── services/      # ai_matcher.py (Groq Llama-3.3)
    ├── database.py    # Firestore + local JSON fallback
    ├── firebase.py    # Firebase Admin SDK init
    └── .env           # GROQ_API_KEY (see .env.example)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- A [Firebase project](https://console.firebase.google.com) with **Authentication** (Google) and **Firestore** enabled
- A [Groq API key](https://console.groq.com)

---

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/uni-verse.git
cd uni-verse
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt

# Add your environment variables
cp .env.example .env
# Edit .env and fill in GROQ_API_KEY

# Place your Firebase service account file
# Download from Firebase Console → Project Settings → Service Accounts
# Save as: backend/service-account.json

# Start the server
python -m uvicorn main:app --reload
```

> API runs at `http://localhost:8000`  
> Swagger docs at `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend
npm install

# Add your environment variables
cp .env.example .env
# Edit .env with your Firebase project credentials

# Start development server
npm run dev
```

> App runs at `http://localhost:5173`

---

## 🔒 Environment Variables

### `backend/.env`
| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key for AI matchmaking |

### `frontend/.env`
| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |

> ⚠️ **Never commit your `.env` files or `service-account.json` to Git.**

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/projects` | List all projects |
| `POST` | `/api/projects` | Create a project |
| `POST` | `/api/projects/{id}/join` | Join or leave a project |
| `POST` | `/api/projects/{id}/match` | AI skill matching |
| `GET` | `/api/projects/{id}/members` | Get member details (owner only) |
| `DELETE` | `/api/projects/{id}` | Delete a project |
| `GET` | `/api/community` | List community posts |
| `POST` | `/api/community` | Create a post |
| `POST` | `/api/community/{id}/upvote` | Toggle upvote |
| `POST` | `/api/community/{id}/comments` | Add comment |
| `DELETE` | `/api/community/{id}` | Delete a post |
| `GET` | `/api/users/{uid}` | Get user profile |
| `POST` | `/api/users/profile` | Create or update profile |

---

## 🤝 Contributing

Pull requests are welcome! Please open an issue first to discuss what you'd like to change.

---

<div align="center">

Made with ❤️ for university builders

</div>
