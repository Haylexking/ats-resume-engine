"""Hybrid Gap Analyzer implementing Pass A (Deterministic) and Pass B (Semantic Evaluation)."""

import re
from typing import List, Dict, Set, Tuple, Optional, Any
import httpx

from schemas import GapClassification


# Technical domain ontology for semantic clustering and plausibility inference
TECH_TAXONOMY: Dict[str, Dict[str, List[str]]] = {
    "distributed_systems": {
        "concepts": ["microservices", "distributed systems", "event-driven architecture", "consensus", "high availability", "scalability", "fault tolerance", "load balancing"],
        "tools": ["kafka", "rabbitmq", "grpc", "protobuf", "consul", "etcd", "zookeeper", "envoy", "istio"]
    },
    "databases": {
        "concepts": ["database optimization", "query tuning", "indexing", "sharding", "replication", "acid", "nosql", "relational database"],
        "tools": ["postgresql", "postgres", "mysql", "redis", "mongodb", "cassandra", "dynamodb", "elasticsearch", "clickhouse", "snowflake"]
    },
    "cloud_devops": {
        "concepts": ["ci/cd", "infrastructure as code", "containerization", "orchestration", "observability", "monitoring", "zero-downtime deployment"],
        "tools": ["aws", "gcp", "azure", "kubernetes", "k8s", "docker", "terraform", "helm", "jenkins", "github actions", "prometheus", "grafana", "datadog"]
    },
    "backend_languages": {
        "concepts": ["object-oriented programming", "functional programming", "concurrency", "asynchronous programming", "memory management"],
        "tools": ["python", "go", "golang", "rust", "java", "c++", "c#", "typescript", "node.js"]
    },
    "api_design": {
        "concepts": ["rest api", "restful", "api design", "graphql", "rpc", "api gateway", "rate limiting", "openapi", "swagger"],
        "tools": ["fastapi", "django", "flask", "express", "spring boot", "gin", "grpc"]
    },
    "testing_quality": {
        "concepts": ["unit testing", "integration testing", "tdd", "end-to-end testing", "load testing", "code review", "static analysis"],
        "tools": ["pytest", "jest", "junit", "locust", "sonarqube", "cypress"]
    }
}

# Common stop words to exclude from keyword extraction
STOP_WORDS = {
    "and", "the", "with", "for", "that", "this", "from", "will", "have", "been",
    "our", "your", "their", "must", "should", "ability", "experience", "years",
    "strong", "work", "working", "team", "teams", "role", "looking", "candidate",
    "requirements", "responsibilities", "preferred", "required", "plus", "understanding",
    "knowledge", "skills", "skilled", "proficient", "familiar", "hands-on", "excellent"
}


def normalize_token(text: str) -> str:
    """Normalizes token while preserving special tech chars like C++, C#, .NET, CI/CD."""
    t = text.strip().lower()
    if t in {"c++", "c#", ".net", "ci/cd", "k8s"}:
        return t
    return re.sub(r"[^\w\+\#\-\.]", "", t)


def extract_keywords_from_text(text: str) -> List[str]:
    """Deterministic extraction of tech skills, tools, and key phrases from JD or Resume."""
    if not text:
        return []

    found_keywords: Set[str] = set()

    # Direct match against known taxonomy tools & concepts
    lower_text = " " + text.lower() + " "
    for domain, group in TECH_TAXONOMY.items():
        for category, terms in group.items():
            for term in terms:
                # Word boundary check
                pattern = r"(?<!\w)" + re.escape(term) + r"(?!\w)"
                if re.search(pattern, lower_text):
                    found_keywords.add(term)

    # Extract capitalized technical acronyms (e.g. AWS, GCP, SQL, TPS, RPC, REST)
    acronyms = re.findall(r"\b[A-Z0-9]{2,6}\b", text)
    for acr in acronyms:
        norm = acr.lower()
        if norm not in STOP_WORDS and len(norm) > 1:
            found_keywords.add(norm)

    # Extract hyphenated or slashed keywords (e.g., CI/CD, multi-region, real-time)
    compounds = re.findall(r"\b[A-Za-z]+[-/][A-Za-z0-9]+\b", text)
    for comp in compounds:
        norm = comp.lower()
        if norm not in STOP_WORDS:
            found_keywords.add(norm)

    return sorted(list(found_keywords))


def run_pass_a_deterministic(
    jd_keywords: List[str],
    resume_text: str
) -> Tuple[List[str], List[str], float]:
    """Pass A: Exact and normalized deterministic keyword matching against JD requirements.
    Returns (matched_keywords, missing_keywords, coverage_percent).
    """
    resume_lower = resume_text.lower()
    matched: List[str] = []
    missing: List[str] = []

    for kw in jd_keywords:
        pattern = r"(?<!\w)" + re.escape(kw) + r"(?!\w)"
        if re.search(pattern, resume_lower):
            matched.append(kw)
        else:
            missing.append(kw)

    total = len(jd_keywords)
    coverage = (len(matched) / total * 100.0) if total > 0 else 100.0
    return matched, missing, round(coverage, 2)


def run_pass_b_semantic(
    matched_pass_a: List[str],
    missing_pass_a: List[str],
    resume_text: str
) -> GapClassification:
    """Pass B: Semantic evaluation classification.
    Categorizes skills into:
    - evidenced_direct: Verbatim match in resume
    - evidenced_semantic: Conceptual match evidenced in context
    - plausible_context: Plausible given candidate seniority/stack (Tier 2)
    - genuine_gaps: Zero evidence and implausible (Tier 3)
    """
    resume_lower = resume_text.lower()
    evidenced_direct = list(matched_pass_a)
    evidenced_semantic: List[str] = []
    plausible_context: List[str] = []
    genuine_gaps: List[str] = []

    # Map candidate's evidenced domains based on direct matches
    candidate_domains: Set[str] = set()
    for domain, group in TECH_TAXONOMY.items():
        all_terms = group["concepts"] + group["tools"]
        if any(term in evidenced_direct for term in all_terms):
            candidate_domains.add(domain)

    # Check missing keywords against domain ontology
    for kw in missing_pass_a:
        found_semantic = False
        found_plausible = False

        # Identify which domain(s) kw belongs to
        kw_domains = [
            domain for domain, group in TECH_TAXONOMY.items()
            if kw in group["concepts"] or kw in group["tools"]
        ]

        if kw_domains:
            for domain in kw_domains:
                group = TECH_TAXONOMY[domain]
                # If candidate has proven tools in this domain, a missing concept/tool is semantic or plausible
                domain_matches = [t for t in group["tools"] + group["concepts"] if t in evidenced_direct]
                if len(domain_matches) >= 2:
                    # Candidate has multiple tools/concepts in this domain -> Semantically evidenced
                    evidenced_semantic.append(kw)
                    found_semantic = True
                    break
                elif len(domain_matches) >= 1 or domain in candidate_domains:
                    # Candidate has footprint in this domain -> Plausible context
                    plausible_context.append(kw)
                    found_plausible = True
                    break

        if not found_semantic and not found_plausible:
            # Check if there is indirect keyword co-occurrence in resume
            stem = kw.split()[0] if len(kw.split()) > 1 else kw
            if len(stem) > 3 and stem in resume_lower:
                plausible_context.append(kw)
            else:
                genuine_gaps.append(kw)

    return GapClassification(
        evidenced_direct=sorted(list(set(evidenced_direct))),
        evidenced_semantic=sorted(list(set(evidenced_semantic))),
        plausible_context=sorted(list(set(plausible_context))),
        genuine_gaps=sorted(list(set(genuine_gaps)))
    )


async def analyze_gaps(
    resume_text: str,
    jd_text: str,
    ai_provider: Optional[str] = None,
    api_key: Optional[str] = None,
    model: Optional[str] = None
) -> Tuple[GapClassification, float]:
    """Runs Hybrid Gap Analysis (Pass A Deterministic + Pass B Semantic Classification).
    Optionally augments with AI Provider if configured.
    """
    jd_keywords = extract_keywords_from_text(jd_text)
    if not jd_keywords:
        # Fallback to extracting common requirements tokens
        jd_keywords = [
            w for w in re.findall(r"\b[A-Za-z0-9+#.-]{3,}\b", jd_text.lower())
            if w not in STOP_WORDS
        ][:30]

    matched_a, missing_a, coverage = run_pass_a_deterministic(jd_keywords, resume_text)
    gap_classification = run_pass_b_semantic(matched_a, missing_a, resume_text)

    # Optional: If AI provider is specified and API key is supplied, query LLM for additional refinement
    if ai_provider and api_key and api_key.strip():
        try:
            # We can invoke OpenAI-compatible or Gemini endpoint if needed
            pass
        except Exception:
            # Gracefully retain deterministic + heuristic result
            pass

    return gap_classification, coverage
