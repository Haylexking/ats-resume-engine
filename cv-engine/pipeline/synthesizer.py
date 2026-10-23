"""Bullet Synthesizer transforming resume experience into Google XYZ impact bullets.
Formula: Accomplished [X], measured by [Y], by doing [Z].
Strictly preserves all original metrics, percentages, dollar values, and numbers.
"""

import re
from typing import List, Dict, Any, Optional
import httpx

from schemas import TailoredBullet, TailoredExperience, GapClassification

ACTION_VERBS = [
    "Architected", "Engineered", "Optimized", "Scaled", "Spearheaded",
    "Overhauled", "Accelerated", "Streamlined", "Automated", "Delivered",
    "Designed", "Implemented", "Orchestrated", "Consolidated", "Modernized"
]

METRIC_PATTERNS = [
    r"\$[\d,]+(?:\.\d+)?(?:[kKmMbBtT]|(?:\s*(?:million|billion|thousand)))?",
    r"\b\d+(?:\.\d+)?%",
    r"\b\d+(?:\.\d+)?\s*(?:ms|seconds|sec|minutes|min|hours|hrs|days|weeks|months)\b",
    r"\b\d{1,3}(?:,\d{3})+(?:\s*(?:TPS|RPS|QPS|users|DAU|MAU|req/s|events/sec|records|nodes|clusters|cores))?\b",
    r"\b\d+(?:\.\d+)?[kKmMbB]\s*(?:TPS|RPS|QPS|users|DAU|MAU|req/s|records|queries)\b",
    r"\b\d+(?:\.\d+)?x\b",
    r"\b(?:p50|p90|p95|p99|p99\.9)\b"
]


def extract_metrics(text: str) -> List[str]:
    """Strictly extracts all metrics, percentages, dollar figures, and scale indicators."""
    metrics: List[str] = []
    for pat in METRIC_PATTERNS:
        matches = re.finditer(pat, text, re.IGNORECASE)
        for m in matches:
            val = m.group(0).strip()
            if val and val not in metrics:
                metrics.append(val)
    return metrics


def synthesize_bullet_deterministic(
    original_text: str,
    jd_keywords: List[str],
    bullet_id: Optional[str] = None
) -> TailoredBullet:
    """Transforms bullet into Google XYZ format deterministically while guaranteeing
    that all original metrics are preserved 100%.
    """
    clean_original = original_text.strip().lstrip("•-* \t")
    metrics = extract_metrics(clean_original)

    # Detect relevant keywords that can be highlighted or injected
    keywords_to_inject: List[str] = []
    clean_lower = clean_original.lower()
    for kw in jd_keywords:
        kw_clean = kw.lower()
        if kw_clean in clean_lower and kw_clean not in keywords_to_inject:
            keywords_to_inject.append(kw)
        elif len(keywords_to_inject) < 2 and any(term in clean_lower for term in kw_clean.split()):
            keywords_to_inject.append(kw)

    # Check if the bullet already closely follows Google XYZ format
    has_action_verb = any(clean_original.startswith(v) for v in ACTION_VERBS)
    has_by = " by " in clean_original.lower()

    if has_action_verb and metrics and has_by:
        # Already high-impact Google XYZ bullet; maintain integrity
        return TailoredBullet(
            id=bullet_id,
            original_text=clean_original,
            tailored_text=clean_original,
            keywords_injected=keywords_to_inject,
            metrics_preserved=metrics,
            explanation="Maintained high-impact Google XYZ structure with validated metrics."
        )

    # Synthesize Google XYZ: Accomplished [X], measured by [Y], by doing [Z]
    # Pick lead action verb
    verb = ACTION_VERBS[hash(clean_original) % len(ACTION_VERBS)]
    first_word = clean_original.split()[0] if clean_original else ""
    if first_word.endswith("ed") or first_word.endswith("ing"):
        verb = first_word.capitalize()
        core_sentence = " ".join(clean_original.split()[1:])
    else:
        core_sentence = clean_original

    # Format metrics measurement [Y]
    if metrics:
        metrics_phrase = f", measured by achieving {', '.join(metrics)},"
    else:
        metrics_phrase = ""

    # Synthesize tailored text
    if metrics_phrase and not any(m in core_sentence for m in metrics):
        tailored_text = f"{verb} {core_sentence}{metrics_phrase}."
    else:
        # If metrics are already embedded in the sentence, ensure crisp XYZ cadence
        if not clean_original.startswith(verb):
            tailored_text = f"{verb} {core_sentence}"
        else:
            tailored_text = clean_original

    # Ensure all original metrics are strictly present in the tailored text
    for m in metrics:
        if m.lower() not in tailored_text.lower():
            tailored_text += f" (delivered {m} impact)"

    # Clean punctuation
    tailored_text = tailored_text.strip().rstrip(".") + "."

    return TailoredBullet(
        id=bullet_id,
        original_text=clean_original,
        tailored_text=tailored_text,
        keywords_injected=keywords_to_inject,
        metrics_preserved=metrics,
        explanation=f"Structured into Google XYZ format; strictly preserved {len(metrics)} original metrics."
    )


async def synthesize_bullet_with_llm(
    original_text: str,
    jd_keywords: List[str],
    provider: str,
    api_key: str,
    model: Optional[str] = None,
    bullet_id: Optional[str] = None
) -> TailoredBullet:
    """Invokes LLM with strict prompt instructing Google XYZ formula and 0 metric alterations."""
    original_metrics = extract_metrics(original_text)

    prompt = f"""You are a resume synthesis engine.
Transform this resume bullet into Google's XYZ formula: "Accomplished [X], measured by [Y], by doing [Z]".
STRICT RULES:
1. You MUST PRESERVE all original metrics, percentages, numbers, and dollar amounts exactly: {original_metrics}.
2. NEVER invent new numbers or change existing numbers.
3. Incorporate relevant technical keywords from: {jd_keywords[:5]}.
4. Return ONLY the rewritten bullet sentence.

Original bullet: {original_text}"""

    # For safety and deterministic performance, call LLM if provider configured,
    # and strictly verify metrics preservation in the response.
    try:
        # Call LLM endpoint based on provider (OpenAI, Groq, NVIDIA NIM, Gemini)
        base_url = "https://api.openai.com/v1"
        if provider == "groq":
            base_url = "https://api.groq.com/openai/v1"
        elif provider == "nvidia":
            base_url = "https://integrate.api.nvidia.com/v1"

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model or ("gpt-4o-mini" if provider == "openai" else "llama-3.1-8b-instant"),
            "messages": [
                {"role": "system", "content": "You are a professional resume synthesizer."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(f"{base_url}/chat/completions", headers=headers, json=payload)
            if resp.status_code == 200:
                data = resp.json()
                generated = data["choices"][0]["message"]["content"].strip().strip('"')

                # Verify metrics preserved
                tailored_metrics = extract_metrics(generated)
                missing_metrics = [m for m in original_metrics if m.lower() not in generated.lower()]

                if not missing_metrics:
                    return TailoredBullet(
                        id=bullet_id,
                        original_text=original_text,
                        tailored_text=generated,
                        keywords_injected=[kw for kw in jd_keywords if kw.lower() in generated.lower()],
                        metrics_preserved=original_metrics,
                        explanation="Synthesized via LLM with validated metric preservation."
                    )
    except Exception:
        pass

    # Deterministic fallback
    return synthesize_bullet_deterministic(original_text, jd_keywords, bullet_id)


async def synthesize_tailored_experiences(
    experiences: List[TailoredExperience],
    jd_keywords: List[str],
    gap_classification: GapClassification,
    ai_provider: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None
) -> List[TailoredExperience]:
    """Synthesizes all experiences into high-impact Google XYZ bullets while preserving metrics."""
    tailored_experiences: List[TailoredExperience] = []

    # Prioritize keywords that are semantic or plausible
    target_keywords = gap_classification.evidenced_semantic + gap_classification.plausible_context + jd_keywords

    for exp in experiences:
        new_bullets: List[TailoredBullet] = []
        for bullet in exp.bullets:
            bullet_text = bullet.tailored_text or bullet.original_text
            if not bullet_text:
                continue

            if ai_provider and api_key:
                synthesized = await synthesize_bullet_with_llm(
                    bullet_text,
                    target_keywords,
                    ai_provider,
                    api_key,
                    model,
                    bullet_id=bullet.id
                )
            else:
                synthesized = synthesize_bullet_deterministic(
                    bullet_text,
                    target_keywords,
                    bullet_id=bullet.id
                )
            new_bullets.append(synthesized)

        new_exp = exp.model_copy()
        new_exp.bullets = new_bullets
        tailored_experiences.append(new_exp)

    return tailored_experiences
