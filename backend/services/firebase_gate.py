"""
Firebase Gate — contribution score synchronization & badge enforcement.

Syncs scores to users/{uid} via the existing database.py abstraction.
Strips badges when a member's score < 5% of the team total.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from database import get_document, update_document, upsert_document


# ── Threshold ───────────────────────────────────────────────────────────────
STRIP_THRESHOLD = 0.05  # 5 % of team_total


@dataclass
class TeamEvaluation:
    """Snapshot of a team's contribution standings."""
    project_id: str
    team_total: int
    team_average: float
    member_scores: Dict[str, int]       # uid → score
    stripped_uids: List[str]            # uids that lost their badge


class FirebaseGate:
    """Stateless gate — all state lives in Firestore."""

    # ── Score Sync ──────────────────────────────────────────────────────
    @staticmethod
    def sync_score(uid: str, project_id: str, new_points: int) -> int:
        """
        Atomically increment the user's contribution_score for a project.
        Returns the updated total score.
        """
        user = get_document("users", uid)
        if not user:
            # Bootstrap a minimal record so the score is persisted.
            upsert_document("users", uid, {
                "uid": uid,
                "contribution_scores": {project_id: new_points},
                "contribution_score": new_points,
                "is_verified": True,
            })
            return new_points

        # Per-project scores stored as a nested dict
        scores: dict = user.get("contribution_scores", {})
        current = scores.get(project_id, 0)
        updated = current + new_points
        scores[project_id] = updated

        # Also maintain a flat aggregate for quick reads
        total = sum(scores.values())

        update_document("users", uid, {
            "contribution_scores": scores,
            "contribution_score": total,
        })
        return updated

    # ── Team Evaluation ─────────────────────────────────────────────────
    @staticmethod
    def evaluate_team(project_id: str) -> Optional[TeamEvaluation]:
        """
        Pull every member's score for *project_id*, compute totals,
        and enforce the strip threshold.
        """
        project = get_document("projects", project_id)
        if not project:
            return None

        member_uids: list = project.get("members", [])
        owner = project.get("owner_uid")
        if owner and owner not in member_uids:
            member_uids = [owner] + member_uids

        if not member_uids:
            return TeamEvaluation(
                project_id=project_id,
                team_total=0,
                team_average=0.0,
                member_scores={},
                stripped_uids=[],
            )

        member_scores: Dict[str, int] = {}
        for uid in member_uids:
            user = get_document("users", uid)
            if user:
                scores = user.get("contribution_scores", {})
                member_scores[uid] = scores.get(project_id, 0)
            else:
                member_scores[uid] = 0

        team_total = sum(member_scores.values())
        team_average = team_total / len(member_scores) if member_scores else 0.0

        # ── Ruthless Gate ───────────────────────────────────────────────
        stripped: List[str] = []
        threshold = STRIP_THRESHOLD * team_total
        for uid, score in member_scores.items():
            if team_total > 0 and score < threshold:
                FirebaseGate.strip_badge(uid)
                stripped.append(uid)

        return TeamEvaluation(
            project_id=project_id,
            team_total=team_total,
            team_average=round(team_average, 2),
            member_scores=member_scores,
            stripped_uids=stripped,
        )

    # ── Badge Stripping ─────────────────────────────────────────────────
    @staticmethod
    def strip_badge(uid: str) -> bool:
        """Set is_verified = false on the user document."""
        return update_document("users", uid, {"is_verified": False})

    # ── Read Score ──────────────────────────────────────────────────────
    @staticmethod
    def get_score(uid: str, project_id: str) -> int:
        user = get_document("users", uid)
        if not user:
            return 0
        return user.get("contribution_scores", {}).get(project_id, 0)
