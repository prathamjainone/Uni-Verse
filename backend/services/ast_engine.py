"""
Deterministic AST Proof-of-Work Engine.

Singleton tree-sitter parser that scores code contributions via a
single-pass recursive tree walk. Zero external API calls.

Target node types (S-expression equivalents):
  (function_definition) → F (weight: 10)
  (class_definition)    → C (weight: 20)
  (if_statement)        → L (weight: 5)

Scoring: Points = (F × 10) + (C × 20) + (L × 5)
Anti-Bloat: density = nodes / chars — if < 0.01, apply 0.5× penalty.
"""

from __future__ import annotations

import threading
from dataclasses import dataclass, field
from typing import Dict, Optional

import tree_sitter_python as tspython
from tree_sitter import Language, Parser, Node


# ── Target S-expression node types ─────────────────────────────────────────
TARGET_TYPES = frozenset({
    "function_definition",  # (function_definition)
    "class_definition",     # (class_definition)
    "if_statement",         # (if_statement)
})

# ── Weights ─────────────────────────────────────────────────────────────────
W_FUNCTION    = 10
W_CLASS       = 20
W_CONDITIONAL = 5

# ── Anti-Bloat Threshold ────────────────────────────────────────────────────
DENSITY_THRESHOLD = 0.01
BLOAT_PENALTY     = 0.5


@dataclass(frozen=True)
class ScoringResult:
    """Immutable result of a single analyze_commit() call."""
    score: int
    raw_score: int
    functions: int
    classes: int
    conditionals: int
    total_nodes: int
    total_chars: int
    density: float
    penalized: bool
    breakdown: Dict[str, int] = field(default_factory=dict)


class ASTEngine:
    """
    Thread-safe singleton.

    Usage:
        engine = ASTEngine.instance()
        result = engine.analyze_commit(diff_text)
    """

    _instance: Optional[ASTEngine] = None
    _lock = threading.Lock()

    def __new__(cls) -> ASTEngine:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    inst = super().__new__(cls)
                    inst._init_parser()
                    cls._instance = inst
        return cls._instance

    @classmethod
    def instance(cls) -> ASTEngine:
        return cls()

    # ── internals ───────────────────────────────────────────────────────
    def _init_parser(self) -> None:
        self._language = Language(tspython.language())
        self._parser = Parser(self._language)

    # ── core API ────────────────────────────────────────────────────────
    def analyze_commit(self, diff: str) -> ScoringResult:
        """
        Parse *diff* (raw code or unified-diff body) and return a
        deterministic ScoringResult.

        Steps:
        1. Strip diff metadata — keep only added lines (+).
        2. Parse with tree-sitter.
        3. Single-pass recursive walk to count target node types.
        4. Apply scoring formula + anti-bloat filter.
        """
        source = self._extract_added_lines(diff)
        if not source.strip():
            return ScoringResult(
                score=0, raw_score=0,
                functions=0, classes=0, conditionals=0,
                total_nodes=0, total_chars=0,
                density=0.0, penalized=False,
                breakdown={"functions": 0, "classes": 0, "conditionals": 0},
            )

        tree = self._parser.parse(source.encode("utf-8"))
        counts = self._count_nodes(tree.root_node)

        f = counts.get("function_definition", 0)
        c = counts.get("class_definition", 0)
        l = counts.get("if_statement", 0)
        total_nodes = f + c + l

        raw_score = (f * W_FUNCTION) + (c * W_CLASS) + (l * W_CONDITIONAL)

        total_chars = len(source)
        density = total_nodes / total_chars if total_chars > 0 else 0.0
        penalized = density < DENSITY_THRESHOLD and total_chars > 0

        final_score = int(raw_score * BLOAT_PENALTY) if penalized else raw_score

        return ScoringResult(
            score=final_score,
            raw_score=raw_score,
            functions=f,
            classes=c,
            conditionals=l,
            total_nodes=total_nodes,
            total_chars=total_chars,
            density=round(density, 6),
            penalized=penalized,
            breakdown={"functions": f, "classes": c, "conditionals": l},
        )

    # ── helpers ─────────────────────────────────────────────────────────
    def _extract_added_lines(self, diff: str) -> str:
        """
        If the input looks like a unified diff, extract only the added
        lines (strip leading '+'). Otherwise treat the whole string as
        raw source code.
        """
        lines = diff.splitlines(keepends=True)
        is_diff = any(line.startswith("@@") for line in lines)
        if not is_diff:
            return diff

        added: list[str] = []
        for line in lines:
            if line.startswith("+++") or line.startswith("---"):
                continue
            if line.startswith("@@"):
                continue
            if line.startswith("+"):
                added.append(line[1:])
        return "".join(added)

    def _count_nodes(self, root: Node) -> Dict[str, int]:
        """
        Single-pass recursive tree walk. Counts occurrences of each
        target node type (equivalent to running S-expression queries
        for function_definition, class_definition, if_statement
        simultaneously).
        """
        counts: Dict[str, int] = {t: 0 for t in TARGET_TYPES}

        def _walk(node: Node) -> None:
            if node.type in TARGET_TYPES:
                counts[node.type] += 1
            for child in node.children:
                _walk(child)

        _walk(root)
        return counts
