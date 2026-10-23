"""Parser module to convert raw resume text or JSON into structured TailoredResume objects."""

import re
import json
from typing import List, Dict, Any, Optional

from schemas import (
    TailoredResume,
    ContactBlock,
    SkillsSection,
    TailoredExperience,
    TailoredBullet,
    EducationItem
)
from pipeline.gap_analyzer import extract_keywords_from_text


def parse_contact_info(text: str) -> ContactBlock:
    """Extracts email, phone, links, and name from header text."""
    contact = ContactBlock()

    # Email
    email_match = re.search(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b", text)
    if email_match:
        contact.email = email_match.group(0)

    # Phone
    phone_match = re.search(r"(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}", text)
    if phone_match:
        contact.phone = phone_match.group(0).strip()

    # LinkedIn
    li_match = re.search(r"(?:linkedin\.com/in/|linkedin\.com/)([A-Za-z0-9_-]+)", text, re.IGNORECASE)
    if li_match:
        contact.linkedin = li_match.group(0)

    # GitHub
    gh_match = re.search(r"(?:github\.com/)([A-Za-z0-9_-]+)", text, re.IGNORECASE)
    if gh_match:
        contact.github = gh_match.group(0)

    # Location (City, State / Country)
    loc_match = re.search(r"\b([A-Z][a-zA-Z\s]+,\s*[A-Z]{2}|[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z]+)\b", text)
    if loc_match:
        contact.location = loc_match.group(0).strip()

    # Name is typically the first non-empty line
    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
    if lines:
        first_line = lines[0]
        # Clean from delimiters
        if "@" not in first_line and "http" not in first_line:
            contact.name = first_line.split("|")[0].strip()
        else:
            contact.name = "Candidate"
    else:
        contact.name = "Candidate"

    return contact


def parse_resume_text(resume_text: str) -> TailoredResume:
    """Parses raw text or JSON string into structured TailoredResume."""
    cleaned = resume_text.strip()
    if cleaned.startswith("{") and cleaned.endswith("}"):
        try:
            data = json.loads(cleaned)
            return TailoredResume(**data)
        except Exception:
            pass

    # Extract contact block
    header_chunk = "\n".join(cleaned.splitlines()[:6])
    contact = parse_contact_info(header_chunk)

    # Section Splitting
    section_patterns = {
        "summary": r"(?:SUMMARY|PROFESSIONAL SUMMARY|EXECUTIVE SUMMARY|PROFILE)",
        "skills": r"(?:TECHNICAL SKILLS|SKILLS|CORE COMPETENCIES|AREAS OF EXPERTISE)",
        "experience": r"(?:EXPERIENCE|WORK EXPERIENCE|PROFESSIONAL EXPERIENCE|EMPLOYMENT HISTORY)",
        "education": r"(?:EDUCATION|ACADEMIC BACKGROUND)",
        "certifications": r"(?:CERTIFICATIONS|CREDENTIALS|LICENSES)"
    }

    sections: Dict[str, str] = {}
    current_sec = "header"
    sections[current_sec] = ""

    lines = cleaned.splitlines()
    for line in lines:
        matched_sec = None
        for sec, pat in section_patterns.items():
            if re.match(rf"^\s*{pat}\s*[:\-]?\s*$", line.strip(), re.IGNORECASE):
                matched_sec = sec
                break

        if matched_sec:
            current_sec = matched_sec
            sections[current_sec] = ""
        else:
            sections[current_sec] += line + "\n"

    # 1. Summary
    summary = sections.get("summary", "").strip()
    if not summary and "header" in sections:
        # Fallback to lines after contact
        hdr_lines = [l.strip() for l in sections["header"].splitlines()[2:] if l.strip()]
        if hdr_lines:
            summary = " ".join(hdr_lines)

    # 2. Skills
    skills_text = sections.get("skills", "")
    languages: List[str] = []
    frameworks: List[str] = []
    tools: List[str] = []
    practices: List[str] = []

    for sline in skills_text.splitlines():
        lower = sline.lower()
        parts = [p.strip() for p in re.split(r"[,|•;]", re.sub(r"^[^:]+:\s*", "", sline)) if p.strip()]
        if "language" in lower:
            languages.extend(parts)
        elif "framework" in lower or "library" in lower:
            frameworks.extend(parts)
        elif "tool" in lower or "platform" in lower or "cloud" in lower:
            tools.extend(parts)
        elif "practice" in lower or "methodolog" in lower:
            practices.extend(parts)
        else:
            tools.extend(parts)

    if not (languages or frameworks or tools or practices):
        # Extract keywords directly
        all_kws = extract_keywords_from_text(skills_text or cleaned)
        tools = all_kws[:15]

    skills_sec = SkillsSection(
        languages=sorted(list(set(languages))),
        frameworks=sorted(list(set(frameworks))),
        tools_platforms=sorted(list(set(tools))),
        practices=sorted(list(set(practices)))
    )

    # 3. Experience
    exp_text = sections.get("experience", "")
    experiences: List[TailoredExperience] = []

    if exp_text.strip():
        # Heuristic job chunking
        job_blocks = re.split(r"\n(?=[A-Z0-9][A-Za-z0-9\s,\-|–—]+(?:19|20)\d{2})", "\n" + exp_text.strip())
        for idx, block in enumerate(job_blocks):
            if not block.strip():
                continue
            blines = [l.strip() for l in block.strip().splitlines() if l.strip()]
            if not blines:
                continue

            header_line = blines[0]
            # Parse company, title, dates
            dates_match = re.search(r"((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{4}\s*(?:–|-|to)\s*(?:Present|\d{4}))", header_line, re.IGNORECASE)
            dates = dates_match.group(0) if dates_match else "Recent"

            company_title_part = header_line.replace(dates, "").strip().strip("|-–—() \t")
            if "|" in company_title_part:
                parts = [p.strip() for p in company_title_part.split("|")]
                title = parts[0]
                company = parts[1] if len(parts) > 1 else "Enterprise"
            elif " at " in company_title_part.lower():
                parts = re.split(r"\s+at\s+", company_title_part, flags=re.IGNORECASE)
                title = parts[0].strip()
                company = parts[1].strip() if len(parts) > 1 else "Enterprise"
            elif " — " in company_title_part or " - " in company_title_part:
                parts = re.split(r"\s+[—\-]\s+", company_title_part)
                title = parts[0].strip()
                company = parts[1].strip() if len(parts) > 1 else "Enterprise"
            else:
                title = company_title_part
                company = "Enterprise"

            bullets: List[TailoredBullet] = []
            for b_idx, bl in enumerate(blines[1:]):
                if bl.startswith(("•", "-", "*")):
                    b_clean = bl.lstrip("•-* \t")
                    bullets.append(
                        TailoredBullet(
                            id=f"exp{idx}_b{b_idx}",
                            original_text=b_clean,
                            tailored_text=b_clean
                        )
                    )

            experiences.append(
                TailoredExperience(
                    id=f"exp_{idx+1}",
                    company=company,
                    title=title,
                    dates=dates,
                    bullets=bullets
                )
            )

    # 4. Education
    edu_text = sections.get("education", "")
    education_items: List[EducationItem] = []
    for line in edu_text.splitlines():
        if not line.strip():
            continue
        dates_match = re.search(r"\b(19|20)\d{2}\b", line)
        dates = dates_match.group(0) if dates_match else ""
        education_items.append(
            EducationItem(
                degree=line.split("|")[0].strip(),
                institution=line.split("|")[1].strip() if "|" in line else "",
                dates=dates
            )
        )

    # 5. Certifications
    cert_text = sections.get("certifications", "")
    certifications = [
        c.lstrip("•-* \t") for c in cert_text.splitlines() if c.strip()
    ]

    return TailoredResume(
        contact=contact,
        summary=summary,
        skills=skills_sec,
        experience=experiences,
        education=education_items,
        certifications=certifications
    )
