# Uni-Verse — Changes Log

## Summary of Changes

This document lists all features added, files modified, APIs used, and setup instructions so teammates can understand the codebase changes and run the project locally.

---

## Features Added

### 1. Anti-Freeloader Contribution Tracker
A real-time dashboard that tracks each team member's GitHub contributions and displays contribution percentages, commit counts, and verified/low badges.

- **What it does:** Fetches contributor data from GitHub (commits, additions, deletions) and displays an animated contribution bar chart per member.
- **Access:** Only visible to team members (gated behind `isMember` check, same as War Room).
- **Scan speed:** Under 1 second — uses GitHub's `/contributors` API (2 API calls total).

### 2. GitHub API Proxy (Backend)
All GitHub API calls from the frontend now route through the backend to avoid browser-side rate limits.

- **Before:** Frontend called GitHub directly → 60 requests/hour (unauthenticated).
- **After:** Frontend calls backend proxy → backend calls GitHub with `GITHUB_TOKEN` → 5,000 requests/hour.

### 3. AST Proof-of-Work Engine
A deterministic code analysis engine using `tree-sitter` that parses Python, JavaScript, and TypeScript diffs to score contributions based on structural complexity (functions, classes, conditionals).

- Used for webhook-triggered analysis (auto-scores on `git push`).

### 4. GitHub Webhook Receiver
Automatically analyzes commits when code is pushed to the linked repo.

- Listens for `push` and `pull_request` events.
- Auto-scores each commit via the AST engine.

### 5. War Room Access Control for Contributions Tab
The Contributions tab is only visible to authenticated team members, matching the War Room access pattern.

### 6. Performance Optimizations
- Replaced slow per-commit diff fetching (50+ API calls) with GitHub's `/contributors` endpoint (1 API call).
- Added `python-dotenv` for automatic `.env` loading on server startup.

---

## Files Modified

| File | What Changed |
|------|-------------|
| `backend/main.py` | Added `python-dotenv` to load `.env` on startup |
| `backend/requirements.txt` | Added `python-dotenv` dependency |
| `backend/routers/vetting.py` | Added scan endpoint, contributions endpoint, and GitHub proxy endpoints |
| `backend/services/github_webhook.py` | GitHub webhook receiver, repo scanner (fast `/contributors` API), URL parser fix |
| `backend/services/ast_engine.py` | AST code analysis engine using tree-sitter |
| `backend/services/firebase_gate.py` | Firebase score sync and team evaluation logic |
| `frontend/src/components/ContributionTracker.jsx` | Contribution dashboard UI with animated bars, commit log, badges |
| `frontend/src/components/WarRoomChat.jsx` | Updated GitHub fetch to use backend proxy instead of direct API calls |
| `frontend/src/pages/ProjectDetails.jsx` | Added Contributions tab (members-only), integrated ContributionTracker component |
| `antigravity_state.json` | Updated project state with completed tasks |

## New Files Created

| File | Purpose |
|------|---------|
| `backend/routers/vetting.py` | All vetting/contribution API endpoints |
| `backend/services/ast_engine.py` | Tree-sitter based AST code analyzer |
| `backend/services/firebase_gate.py` | Firebase integration for score syncing |
| `backend/services/github_webhook.py` | GitHub webhook processing & repo scanning |
| `frontend/src/components/ContributionTracker.jsx` | Contribution tracker dashboard component |

---

## APIs Used

### GitHub REST API v3
| Endpoint | Purpose | Auth Required |
|----------|---------|---------------|
| `GET /repos/{owner}/{repo}/contributors` | Fetch all contributors with commit counts | Recommended (token) |
| `GET /repos/{owner}/{repo}/commits` | Fetch recent commit log for display | Recommended (token) |
| `GET /repos/{owner}/{repo}/pulls` | Fetch open PRs for War Room display | Recommended (token) |

### Backend API Endpoints (FastAPI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/vetting/scan/{project_id}` | Trigger a contribution scan for a project |
| `GET` | `/api/vetting/contributions/{project_id}` | Get cached contribution data |
| `POST` | `/api/vetting/analyze` | Manually analyze a code diff |
| `GET` | `/api/vetting/team/{project_id}` | Get team contribution standings |
| `POST` | `/api/vetting/webhook/github` | GitHub webhook receiver (auto-triggered) |
| `GET` | `/api/vetting/github-proxy/{owner}/{repo}/commits` | Proxy for GitHub commits API |
| `GET` | `/api/vetting/github-proxy/{owner}/{repo}/pulls` | Proxy for GitHub pulls API |

### External Services
| Service | Purpose |
|---------|---------|
| **Firebase Firestore** | Database for projects, users, scores |
| **Firebase Auth** | Google authentication |
| **Groq Llama-3.3** | AI-powered applicant vetting |
| **GitHub API** | Repository data, contributor stats |

---

## Environment Setup

### 1. Backend `.env` File
Create `backend/.env` with the following variables:

```env
GITHUB_TOKEN=your_github_personal_access_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GROQ_API_KEY=your_groq_api_key
```

> **GITHUB_TOKEN:** Generate at https://github.com/settings/tokens (needs `repo` scope for private repos, no scope needed for public repos). This increases rate limits from 60 to 5,000 requests/hour.

### 2. Firebase Service Account
Place `serviceAccountKey.json` in `backend/` directory. This is required for Firestore access.

### 3. Frontend `.env`
The frontend `.env` should already have Firebase config variables set up.

---

## How to Run Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Access
- **Frontend:** http://localhost:5173
- **Backend API Docs:** http://localhost:8000/docs
- **Backend Health:** http://localhost:8000

---

## Architecture Flow

```
User → Frontend (React/Vite, port 5173)
        ↓
    Backend (FastAPI, port 8000)
        ↓
    Firebase Firestore (Database)
        ↓
    GitHub API (via GITHUB_TOKEN)
```

### Contribution Tracking Flow
```
1. User clicks "Re-Scan" in Contributions tab
2. Frontend POSTs to /api/vetting/scan/{project_id}
3. Backend extracts owner/repo from project's github_url
4. Backend calls GitHub /contributors API (1 call, instant)
5. Backend calls GitHub /commits API (1 call, recent log)
6. Scores calculated, synced to Firebase
7. Frontend fetches & displays animated contribution bars
```

### War Room GitHub Flow
```
1. War Room loads project page
2. Frontend calls /api/vetting/github-proxy/{owner}/{repo}/commits
3. Backend forwards to GitHub API with GITHUB_TOKEN
4. Response returned to frontend (no rate limits)
```
