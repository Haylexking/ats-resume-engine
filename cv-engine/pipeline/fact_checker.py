"""Adversarial Critic and Fact Checker for CV Engine.
Audits every tailored bullet against original resume bullets to detect:
1. Hallucinated or fabricated metrics, percentages, dollar values
2. Fabricated tools, platforms, or skills
3. Inconsistent dates, titles, or unsupported claims
"""

import re
from typing import List, Set, Optional, Dict, Any

from schemas import (
    TailoredBullet,
    TailoredExperience,
    FactCheckViolation,
    FactCheckResult,
    GapClassification
)
from pipeline.synthesizer import extract_metrics, METRIC_PATTERNS
from pipeline.gap_analyzer import extract_keywords_from_text


def audit_bullet_metrics(
    original_text: str,
    tailored_text: str,
    bullet_id: Optional[str] = None
) -> List[FactCheckViolation]:
    """Audits metrics in tailored bullet against original bullet."""
    violations: List[FactCheckViolation] = []

    orig_metrics = extract_metrics(original_text)
    tail_metrics = extract_metrics(tailored_text)

    # Normalize metrics for comparison
    orig_norm: Set[str] = {m.lower().replace(",", "").replace(" ", "") for m in orig_metrics}

    for tm in tail_metrics:
        norm_tm = tm.lower().replace(",", "").replace(" ", "")
        # Check if this metric was present in original
        if norm_tm not in orig_norm:
            # Check if it's a numeric value not supported by any original number
            orig_numbers = re.findall(r"\d+", original_text)
            tm_numbers = re.findall(r"\d+", tm)

            is_hallucinated = False
            for num in tm_numbers:
                if num not in orig_numbers:
                    is_hallucinated = True
                    break

            if is_hallucinated:
                violations.append(
                    FactCheckViolation(
                        bullet_id=bullet_id,
                        severity="critical",
                        reason=f"Hallucinated metric '{tm}' detected in tailored bullet without basis in original resume.",
                        original_claim=original_text,
                        tailored_claim=tailored_text
                    )
                )

    # Check if any original metric was omitted or mutated
    for om in orig_metrics:
        norm_om = om.lower().replace(",", "").replace(" ", "")
        tail_norm_all = " ".join(tail_metrics).lower().replace(",", "").replace(" ", "")
        if norm_om not in tail_norm_all and norm_om not in tailored_text.lower().replace(",", "").replace(" ", ""):
            violations.append(
                FactCheckViolation(
                    bullet_id=bullet_id,
                    severity="high",
                    reason=f"Original metric '{om}' was dropped or corrupted during synthesis.",
                    original_claim=original_text,
                    tailored_claim=tailored_text
                )
            )

    return violations


def audit_bullet_tools(
    original_text: str,
    tailored_text: str,
    allowed_candidate_tools: Set[str],
    genuine_gaps: Set[str],
    bullet_id: Optional[str] = None
) -> List[FactCheckViolation]:
    """Audits whether tailored bullet introduces fabricated tools or genuine skill gaps."""
    violations: List[FactCheckViolation] = []

    orig_tools = set(extract_keywords_from_text(original_text))
    tail_tools = set(extract_keywords_from_text(tailored_text))

    # Identify new tools introduced in tailored bullet
    introduced_tools = tail_tools - orig_tools

    for tool in introduced_tools:
        # Check if the tool is an acknowledged genuine gap
        if tool.lower() in {g.lower() for g in genuine_gaps}:
            violations.append(
                FactCheckViolation(
                    bullet_id=bullet_id,
                    severity="critical",
                    reason=f"Fabricated skill/tool '{tool}' introduced into bullet despite being an identified genuine gap.",
                    original_claim=original_text,
                    tailored_claim=tailored_text
                )
            )
        elif tool.lower() not in {c.lower() for c in allowed_candidate_tools}:
            # Tool is completely unverified in candidate profile
            violations.append(
                FactCheckViolation(
                    bullet_id=bullet_id,
                    severity="medium",
                    reason=f"Unverified tool '{tool}' injected into bullet without prior resume evidence.",
                    original_claim=original_text,
                    tailored_claim=tailored_text
                )
            )

    return violations


def audit_experiences(
    original_experiences: List[TailoredExperience],
    tailored_experiences: List[TailoredExperience],
    candidate_skills: List[str],
    gap_classification: Optional[GapClassification] = None
) -> FactCheckResult:
    """Performs adversarial audit of all tailored experiences against original ground truth."""
    all_violations: List[FactCheckViolation] = []

    # Build universe of verified candidate tools
    allowed_candidate_tools: Set[str] = set()
    for s in candidate_skills:
        allowed_candidate_tools.add(s.lower())

    for exp in original_experiences:
        for b in exp.bullets:
            for kw in extract_keywords_from_text(b.original_text or b.tailored_text):
                allowed_candidate_tools.add(kw.lower())

    genuine_gaps_set = set(g.lower() for g in (gap_classification.genuine_gaps if gap_classification else []))

    # Map original bullets by ID or index
    orig_bullet_map: Dict[str, str] = {}
    for exp in original_experiences:
        for idx, b in enumerate(exp.bullets):
            b_id = b.id or f"{exp.id}_b{idx}"
            orig_bullet_map[b_id] = b.original_text or b.tailored_text

    # Audit each tailored bullet
    for exp in tailored_experiences:
        for idx, b in enumerate(exp.bullets):
            b_id = b.id or f"{exp.id}_b{idx}"
            original_text = orig_bullet_map.get(b_id, b.original_text)

            if not original_text or not b.tailored_text:
                continue

            # 1. Metric Audit
            metric_violations = audit_bullet_metrics(original_text, b.tailored_text, bullet_id=b_id)
            all_violations.extend(metric_violations)

            # 2. Tool & Skill Audit
            tool_violations = audit_bullet_tools(
                original_text,
                b.tailored_text,
                allowed_candidate_tools,
                genuine_gaps_set,
                bullet_id=b_id
            )
            all_violations.extend(tool_violations)

    # Compute overall verification and confidence score
    confidence_score = 100
    has_critical_or_high = False

    for v in all_violations:
        if v.severity == "critical":
            confidence_score -= 25
            has_critical_or_high = True
        elif v.severity == "high":
            confidence_score -= 15
            has_critical_or_high = True
        elif v.severity == "medium":
            confidence_score -= 5
        elif v.severity == "low":
            confidence_score -= 2

    confidence_score = max(0, min(100, confidence_score))
    verified = not has_critical_or_high

    return FactCheckResult(
        verified=verified,
        violations=all_violations,
        confidence_score=confidence_score
    )
