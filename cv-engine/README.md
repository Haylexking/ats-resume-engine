# CV Engine Microservice (`cv-engine`)

A production-grade Python microservice providing end-to-end ATS resume tailoring, hybrid gap analysis, Google XYZ bullet synthesis with 100% metric preservation, adversarial fact-checking, and Jinja2-tagged Word (`.docx`) template rendering.

---

## Architecture Overview

```
                        ┌────────────────────────────────────────┐
                        │           cv-engine (FastAPI)          │
                        └───────────────────┬────────────────────┘
                                            │
                     ┌──────────────────────┴──────────────────────┐
                     ▼                                             ▼
        [POST /api/tailor]                                [POST /api/render]
                 │                                                 │
    ┌────────────┴─────────────┐                                   │
    │ 1. Resume Parser         │                                   │
    │    (Extract structured)  │                                   │
    ├──────────────────────────┤                                   │
    │ 2. Hybrid Gap Analyzer   │                                   │
    │    Pass A: Deterministic │                                   │
    │    Pass B: Semantic (Tier)                                   │
    ├──────────────────────────┤                                   │
    │ 3. XYZ Synthesizer       │                                   │
    │    Google XYZ Formula    │                                   │
    │    100% Metric Preserved │                                   │
    ├──────────────────────────┤                                   │
    │ 4. Adversarial Critic    │                                   │
    │    Fact-check audit      │                                   │
    └────────────┬─────────────┘                                   │
                 ▼                                                 ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                 DOCX Renderer (docxtpl)                     │
        │  • classic-harvard.docx                                     │
        │  • modern-executive.docx                                    │
        │  • tech-linear.docx                                         │
        └─────────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
cv-engine/
├── Dockerfile                  # Containerized deployment with healthcheck
├── README.md                   # Service documentation
├── requirements.txt            # Python dependencies (fastapi, docxtpl, docx, pydantic)
├── schemas.py                  # Pydantic v2 schemas for resumes, requests, and audits
├── generate_templates.py       # Programmatic builder for master Jinja2 .docx templates
├── renderer.py                 # Word document compiler using docxtpl
├── main.py                     # FastAPI application endpoints
├── pipeline/
│   ├── parser.py               # Raw text & JSON resume parsing
│   ├── gap_analyzer.py         # Pass A (Deterministic) & Pass B (Semantic) matching
│   ├── synthesizer.py          # Google XYZ impact bullet synthesizer
│   └── fact_checker.py         # Adversarial critic auditing hallucinated metrics/tools
└── templates/
    ├── classic-harvard.docx    # Calibri, 0.75" margins, clean line dividers
    ├── modern-executive.docx   # Garamond, executive summary, Navy palette
    └── tech-linear.docx        # Technical skills priority block, linear layout
```

---

## Core Pipeline Features

### 1. Hybrid Gap Analysis (`pipeline/gap_analyzer.py`)
- **Pass A (Deterministic)**: Normalized token matching against JD requirements, tools, and technical keywords.
- **Pass B (Semantic Evaluation)**: Classifies requirements into four discrete tiers:
  1. `evidenced_direct`: Verbatim or direct matches in resume bullets and skills.
  2. `evidenced_semantic`: Conceptually demonstrated competencies (e.g. distributed ledger for Kafka).
  3. `plausible_context`: Plausible given candidate seniority and domain (Tier 2 candidate).
  4. `genuine_gaps`: Unmet requirements with zero candidate evidence (Tier 3 candidate, never fabricated).

### 2. Google XYZ Bullet Synthesis (`pipeline/synthesizer.py`)
- Transforms bullets into the Google formula: **"Accomplished [X], measured by [Y], by doing [Z]"**.
- **Strict Metric Preservation**: Audits and preserves all original percentages (`42%`), throughput indicators (`120,000 TPS`), dollar values (`$1.4M`), and latencies (`p99`). Original metrics are never dropped or modified.

### 3. Adversarial Critic & Fact-Checker (`pipeline/fact_checker.py`)
- Audits every tailored bullet against original source text.
- Detects and flags:
  - `critical`: Hallucinated metrics (numbers not present in original resume).
  - `critical`: Fabricated tools or platforms matching identified genuine gaps.
  - `high`: Dropped or corrupted original metrics.
  - `medium`: Injected tools lacking prior resume evidence.
- Calculates an objective `confidence_score` (0–100) and `verified: bool`.

### 4. Master Word Templates (`generate_templates.py` & `renderer.py`)
- **`classic-harvard.docx`**: Single-column Calibri layout, 0.75" margins, uppercase headers with subtle bottom border rules.
- **`modern-executive.docx`**: Garamond layout with executive summary block, Navy accent color (`#1A365D`), and clean bullet spacing.
- **`tech-linear.docx`**: Engineering-first layout featuring the **Technical Skills Priority Block** immediately below contact information.

---

## API Endpoints

### 1. Health Check
```http
GET /health
```
**Response (200 OK):**
```json
{
  "status": "healthy",
  "service": "cv-engine",
  "version": "1.0.0",
  "available_templates": [
    "classic-harvard",
    "modern-executive",
    "tech-linear"
  ]
}
```

### 2. End-to-End Resume Tailoring
```http
POST /api/tailor
Content-Type: application/json
```
**Payload:**
```json
{
  "resume_text": "Alex Morgan\nalex@example.com | 555-0199...",
  "jd_text": "Looking for a Lead Distributed Systems Engineer with Go and Kafka...",
  "template_name": "classic-harvard",
  "target_role": "Lead Distributed Systems Engineer",
  "target_company": "Stripe"
}
```
**Response (200 OK):**
Returns JSON with:
- `tailored_resume`: Full structured `TailoredResume` data.
- `docx_base64`: Base64-encoded Word document ready for download.
- `ats_keyword_coverage`: Hard-match keyword match percentage.
- `fact_check`: FactCheckResult with verification status, confidence score, and violations list.
- `gap_analysis`: Tiered GapClassification (direct, semantic, plausible, genuine gaps).

*Tip:* Add `?format=docx` to receive the binary `.docx` file as a direct attachment.

### 3. Direct Template Rendering
```http
POST /api/render
Content-Type: application/json
```
**Payload:**
```json
{
  "tailored_resume": { ... },
  "template_name": "modern-executive"
}
```
**Response (200 OK):**
Returns binary `application/vnd.openxmlformats-officedocument.wordprocessingml.document` download.

---

## Local Development & Setup

### 1. Install Dependencies
```bash
py -3.12 -m pip install -r cv-engine/requirements.txt
```

### 2. Generate Master Word Templates
```bash
py -3.12 cv-engine/generate_templates.py
```

### 3. Run FastAPI Development Server
```bash
py -3.12 -m uvicorn cv-engine.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Docker Deployment

### Build Container
```bash
docker build -t ats-cv-engine -f cv-engine/Dockerfile cv-engine/
```

### Run Container
```bash
docker run -d --name ats-cv-engine -p 8000:8000 ats-cv-engine
```
