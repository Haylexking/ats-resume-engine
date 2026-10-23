"""DOCX rendering engine using docxtpl and Jinja2 templates."""

import os
import io
from pathlib import Path
from typing import Union, Dict, Any
from docxtpl import DocxTemplate

from schemas import TailoredResume

TEMPLATES_DIR = Path(__file__).parent / "templates"
DEFAULT_TEMPLATE = "classic-harvard.docx"

TEMPLATE_ALIASES = {
    "classic-harvard": "classic-harvard.docx",
    "harvard": "classic-harvard.docx",
    "classic": "classic-harvard.docx",
    "modern-executive": "modern-executive.docx",
    "executive": "modern-executive.docx",
    "modern": "modern-executive.docx",
    "tech-linear": "tech-linear.docx",
    "tech": "tech-linear.docx",
    "linear": "tech-linear.docx",
}


def resolve_template_path(template_name: str) -> Path:
    """Resolves template name to an existing .docx file path with robust fallback."""
    normalized = (template_name or "").strip().lower()
    if normalized.endswith(".docx"):
        base_name = normalized[:-5]
    else:
        base_name = normalized

    target_filename = TEMPLATE_ALIASES.get(base_name, f"{base_name}.docx")
    target_path = TEMPLATES_DIR / target_filename

    if target_path.exists():
        return target_path

    # Check direct name with .docx
    direct_path = TEMPLATES_DIR / f"{template_name}.docx"
    if direct_path.exists():
        return direct_path

    direct_raw = TEMPLATES_DIR / template_name
    if direct_raw.is_file():
        return direct_raw

    # Fallback to default template
    fallback_path = TEMPLATES_DIR / DEFAULT_TEMPLATE
    if fallback_path.exists():
        return fallback_path

    # If even default is missing, find any .docx in templates dir
    available = list(TEMPLATES_DIR.glob("*.docx"))
    if available:
        return available[0]

    raise FileNotFoundError(f"No valid Word templates found in {TEMPLATES_DIR}")


def build_template_context(resume: TailoredResume) -> Dict[str, Any]:
    """Builds a rich context dictionary for Jinja2 template rendering."""
    contact_dict = resume.contact.model_dump()

    # Build clean formatted contact line
    contact_parts = []
    if resume.contact.email:
        contact_parts.append(resume.contact.email)
    if resume.contact.phone:
        contact_parts.append(resume.contact.phone)
    if resume.contact.location:
        contact_parts.append(resume.contact.location)
    if resume.contact.linkedin:
        contact_parts.append(resume.contact.linkedin)
    if resume.contact.github:
        contact_parts.append(resume.contact.github)
    if resume.contact.portfolio:
        contact_parts.append(resume.contact.portfolio)

    contact_line = " | ".join(contact_parts)

    skills_dict = resume.skills.model_dump()
    skills_languages_str = ", ".join(resume.skills.languages)
    skills_frameworks_str = ", ".join(resume.skills.frameworks)
    skills_tools_str = ", ".join(resume.skills.tools_platforms)
    skills_practices_str = ", ".join(resume.skills.practices)

    exp_list = [exp.model_dump() for exp in resume.experience]
    edu_list = [edu.model_dump() for edu in resume.education]

    return {
        "contact": contact_dict,
        "contact_line": contact_line,
        "summary": resume.summary,
        "skills": skills_dict,
        "skills_languages": skills_languages_str,
        "skills_frameworks": skills_frameworks_str,
        "skills_tools": skills_tools_str,
        "skills_practices": skills_practices_str,
        "experience": exp_list,
        "education": edu_list,
        "certifications": resume.certifications,
        "target_role": resume.target_role or "",
        "target_company": resume.target_company or "",
        "ats_keyword_coverage": resume.ats_keyword_coverage,
        "fact_check": resume.fact_check.model_dump(),
        "gap_analysis": resume.gap_analysis.model_dump(),
    }


def render_docx(
    tailored_resume: Union[TailoredResume, Dict[str, Any]],
    template_name: str = "classic-harvard",
) -> bytes:
    """Renders a TailoredResume into a docx binary using docxtpl."""
    if isinstance(tailored_resume, dict):
        tailored_resume = TailoredResume(**tailored_resume)

    template_path = resolve_template_path(template_name)
    tpl = DocxTemplate(str(template_path))
    context = build_template_context(tailored_resume)

    tpl.render(context)

    buffer = io.BytesIO()
    tpl.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()
