"""CV Engine FastAPI microservice.
Provides endpoints for:
- GET /health
- POST /api/tailor (Full pipeline: extraction -> hybrid gap -> synthesis -> fact-check -> docx render)
- POST /api/render (Given pre-computed TailoredResume JSON + template_name, returns docx binary)
"""

import base64
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    TailorRequest,
    RenderRequest,
    TailoredResume,
    FactCheckResult,
    GapClassification
)
from renderer import render_docx, TEMPLATE_ALIASES, TEMPLATES_DIR
from pipeline.parser import parse_resume_text
from pipeline.gap_analyzer import analyze_gaps, extract_keywords_from_text
from pipeline.synthesizer import synthesize_tailored_experiences
from pipeline.fact_checker import audit_experiences

app = FastAPI(
    title="CV Engine Microservice",
    description="Production-grade ATS Resume Tailoring and Templating Engine",
    version="1.0.0"
)

# Enable CORS for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """Health check endpoint listing service status and available templates."""
    available_templates = [
        p.stem for p in TEMPLATES_DIR.glob("*.docx")
    ]
    return {
        "status": "healthy",
        "service": "cv-engine",
        "version": "1.0.0",
        "available_templates": available_templates or list(TEMPLATE_ALIASES.keys())
    }


@app.post("/api/render")
def render_resume(
    request: RenderRequest,
    format: Optional[str] = Query(None, description="Output format: 'binary' or 'json'")
):
    """Renders a pre-computed TailoredResume JSON into an ATS-compliant Word document."""
    try:
        docx_bytes = render_docx(request.tailored_resume, request.template_name)

        if format == "json":
            return {
                "success": True,
                "template_name": request.template_name,
                "docx_base64": base64.b64encode(docx_bytes).decode("utf-8"),
                "size_bytes": len(docx_bytes)
            }

        filename = f"Resume_{request.template_name}.docx"
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=404, detail=str(fnf))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Rendering failed: {str(e)}")


@app.post("/api/tailor")
async def tailor_resume(
    request: TailorRequest,
    format: Optional[str] = Query(None, description="Output format: 'docx' or 'json'")
):
    """Full end-to-end ATS pipeline:
    1. Parse and extract resume text
    2. Hybrid Gap Analysis (Pass A Deterministic + Pass B Semantic Classification)
    3. Google XYZ Bullet Synthesis with strict metric preservation
    4. Adversarial Fact-Checking & Critic Audit
    5. DOCX Master Template Rendering
    """
    if not request.resume_text.strip():
        raise HTTPException(status_code=400, detail="resume_text must not be empty.")
    if not request.jd_text.strip():
        raise HTTPException(status_code=400, detail="jd_text must not be empty.")

    try:
        # Step 1: Parse Resume
        parsed_resume: TailoredResume = parse_resume_text(request.resume_text)
        if request.target_role:
            parsed_resume.target_role = request.target_role
        if request.target_company:
            parsed_resume.target_company = request.target_company

        original_experiences = [exp.model_copy(deep=True) for exp in parsed_resume.experience]

        # Step 2: Hybrid Gap Analysis
        gap_classification, coverage = await analyze_gaps(
            resume_text=request.resume_text,
            jd_text=request.jd_text,
            ai_provider=request.ai_provider,
            api_key=request.api_key,
            model=request.model
        )
        parsed_resume.gap_analysis = gap_classification
        parsed_resume.ats_keyword_coverage = coverage

        # Step 3: Synthesis of Google XYZ bullets
        jd_keywords = extract_keywords_from_text(request.jd_text)
        tailored_experiences = await synthesize_tailored_experiences(
            experiences=parsed_resume.experience,
            jd_keywords=jd_keywords,
            gap_classification=gap_classification,
            ai_provider=request.ai_provider,
            api_key=request.api_key,
            model=request.model
        )
        parsed_resume.experience = tailored_experiences

        # Step 4: Adversarial Critic & Fact-Checking
        all_candidate_skills = (
            parsed_resume.skills.languages +
            parsed_resume.skills.frameworks +
            parsed_resume.skills.tools_platforms +
            parsed_resume.skills.practices
        )
        fact_check_result = audit_experiences(
            original_experiences=original_experiences,
            tailored_experiences=tailored_experiences,
            candidate_skills=all_candidate_skills,
            gap_classification=gap_classification
        )
        parsed_resume.fact_check = fact_check_result

        # Step 5: Render DOCX
        docx_bytes = render_docx(parsed_resume, request.template_name)

        if format == "docx":
            filename = f"Tailored_Resume_{request.template_name}.docx"
            return Response(
                content=docx_bytes,
                media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                headers={
                    "Content-Disposition": f'attachment; filename="{filename}"'
                }
            )

        # Default JSON response containing tailored resume data, docx base64, and audit stats
        docx_base64 = base64.b64encode(docx_bytes).decode("utf-8")
        return {
            "success": True,
            "tailored_resume": parsed_resume,
            "docx_base64": docx_base64,
            "template_used": request.template_name,
            "ats_keyword_coverage": coverage,
            "fact_check": fact_check_result,
            "gap_analysis": gap_classification,
            "metrics_preserved_count": sum(
                len(b.metrics_preserved) for exp in parsed_resume.experience for b in exp.bullets
            )
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Tailoring pipeline failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
