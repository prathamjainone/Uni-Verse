"""
Vetting Router — deterministic AST Proof-of-Work endpoints.

POST /api/vetting/analyze          → score a diff (manual)
GET  /api/vetting/team/{id}        → team contribution standings
POST /api/vetting/webhook/github   → GitHub webhook receiver (auto)
POST /api/vetting/scan/{id}        → scan a project's GitHub repo (manual trigger)
GET  /api/vetting/contributions/{id} → get cached contribution data for frontend
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from services.ast_engine import ASTEngine
from services.firebase_gate import FirebaseGate
from services.github_webhook import (
    process_push_event,
    process_pr_event,
    scan_repo_contributions,
    verify_signature,
)
from database import get_document

router = APIRouter(prefix="/api/vetting", tags=["Vetting"])


# ── Request / Response Models ───────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    uid: str
    project_id: str
    diff: str


class AnalyzeResponse(BaseModel):
    success: bool
    score: int
    raw_score: int
    penalized: bool
    density: float
    breakdown: dict
    updated_total: int


# ── Manual Analyze ──────────────────────────────────────────────────────────
@router.post("/analyze", response_model=AnalyzeResponse)
def analyze_contribution(payload: AnalyzeRequest):
    """Score a code diff deterministically via tree-sitter AST analysis."""
    engine = ASTEngine.instance()
    result = engine.analyze_commit(payload.diff)

    updated_total = FirebaseGate.sync_score(
        uid=payload.uid,
        project_id=payload.project_id,
        new_points=result.score,
    )

    return AnalyzeResponse(
        success=True,
        score=result.score,
        raw_score=result.raw_score,
        penalized=result.penalized,
        density=result.density,
        breakdown=result.breakdown,
        updated_total=updated_total,
    )


# ── Team Evaluation ────────────────────────────────────────────────────────
@router.get("/team/{project_id}")
def get_team_scores(project_id: str):
    """Evaluate every member's contribution. Triggers badge stripping."""
    evaluation = FirebaseGate.evaluate_team(project_id)
    if evaluation is None:
        raise HTTPException(status_code=404, detail="Project not found")

    return {
        "success": True,
        "project_id": evaluation.project_id,
        "team_total": evaluation.team_total,
        "team_average": evaluation.team_average,
        "member_scores": evaluation.member_scores,
        "stripped_uids": evaluation.stripped_uids,
    }


# ── GitHub Webhook Receiver ────────────────────────────────────────────────
@router.post("/webhook/github")
async def github_webhook(request: Request):
    """
    Receives GitHub webhook events (push, pull_request).
    Auto-analyzes commit diffs and syncs scores.
    """
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    event_type = request.headers.get("X-GitHub-Event", "")

    if not verify_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")

    payload = await request.json()

    if event_type == "push":
        result = process_push_event(payload)
    elif event_type == "pull_request":
        result = process_pr_event(payload)
    elif event_type == "ping":
        return {"success": True, "message": "pong"}
    else:
        return {"success": True, "message": f"Ignored event: {event_type}"}

    return {"success": True, "event": event_type, **result}


# ── Manual Repo Scan ───────────────────────────────────────────────────────
@router.post("/scan/{project_id}")
def scan_project_repo(project_id: str):
    """
    Manually trigger a full scan of a project's linked GitHub repo.
    Fetches recent commits, analyzes diffs, scores all contributors.
    """
    result = scan_repo_contributions(project_id)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])

    return {"success": True, **result}


# ── Get Cached Contributions ───────────────────────────────────────────────
@router.get("/contributions/{project_id}")
def get_contributions(project_id: str):
    """
    Return the cached contribution scan data for the frontend dashboard.
    """
    project = get_document("projects", project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    scan = project.get("contribution_scan")
    if not scan:
        return {
            "success": True,
            "has_data": False,
            "message": "No contribution scan yet. Trigger a scan first.",
        }

    return {
        "success": True,
        "has_data": True,
        **scan,
    }


# ── GitHub Proxy (avoids browser rate limits) ──────────────────────────────
@router.get("/github-proxy/{owner}/{repo}/commits")
def proxy_github_commits(owner: str, repo: str, per_page: int = 10):
    """Proxy GitHub commits API with server-side auth token."""
    import os, requests as req
    headers = {"Accept": "application/vnd.github.v3+json"}
    token = os.getenv("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"token {token}"
    try:
        r = req.get(
            f"https://api.github.com/repos/{owner}/{repo}/commits?per_page={per_page}",
            headers=headers, timeout=10,
        )
        if r.status_code == 200:
            return r.json()
        raise HTTPException(status_code=r.status_code, detail=r.json().get("message", "GitHub API error"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.get("/github-proxy/{owner}/{repo}/pulls")
def proxy_github_pulls(owner: str, repo: str, state: str = "open", per_page: int = 5):
    """Proxy GitHub pulls API with server-side auth token."""
    import os, requests as req
    headers = {"Accept": "application/vnd.github.v3+json"}
    token = os.getenv("GITHUB_TOKEN", "")
    if token:
        headers["Authorization"] = f"token {token}"
    try:
        r = req.get(
            f"https://api.github.com/repos/{owner}/{repo}/pulls?state={state}&per_page={per_page}",
            headers=headers, timeout=10,
        )
        if r.status_code == 200:
            return r.json()
        raise HTTPException(status_code=r.status_code, detail=r.json().get("message", "GitHub API error"))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

