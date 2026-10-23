"""Pydantic schemas for CV Engine microservice."""

from typing import List, Optional, Union, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ContactBlock(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: Optional[str] = ""
    github: Optional[str] = ""
    portfolio: Optional[str] = ""


class TailoredBullet(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: Optional[str] = None
    original_text: str = ""
    tailored_text: str = ""
    keywords_injected: List[str] = Field(default_factory=list)
    metrics_preserved: List[str] = Field(default_factory=list)
    explanation: str = ""


class TailoredExperience(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str = ""
    company: str = ""
    title: str = ""
    original_title: Optional[str] = ""
    dates: str = ""
    location: Optional[str] = ""
    bullets: List[TailoredBullet] = Field(default_factory=list)


class SkillsSection(BaseModel):
    model_config = ConfigDict(extra="ignore")

    languages: List[str] = Field(default_factory=list)
    frameworks: List[str] = Field(default_factory=list)
    tools_platforms: List[str] = Field(default_factory=list)
    practices: List[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    institution: str = ""
    degree: str = ""
    dates: str = ""
    location: Optional[str] = ""
    details: Optional[str] = ""


class FactCheckViolation(BaseModel):
    model_config = ConfigDict(extra="ignore")

    bullet_id: Optional[str] = None
    severity: str = "medium"  # "low" | "medium" | "high" | "critical"
    reason: str = ""
    original_claim: str = ""
    tailored_claim: str = ""


class FactCheckResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    verified: bool = True
    violations: List[FactCheckViolation] = Field(default_factory=list)
    confidence_score: int = 100


class GapClassification(BaseModel):
    model_config = ConfigDict(extra="ignore")

    evidenced_direct: List[str] = Field(default_factory=list)
    evidenced_semantic: List[str] = Field(default_factory=list)
    plausible_context: List[str] = Field(default_factory=list)
    genuine_gaps: List[str] = Field(default_factory=list)


class TailoredResume(BaseModel):
    model_config = ConfigDict(extra="ignore")

    contact: ContactBlock = Field(default_factory=ContactBlock)
    summary: str = ""
    skills: SkillsSection = Field(default_factory=SkillsSection)
    experience: List[TailoredExperience] = Field(default_factory=list)
    education: List[EducationItem] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    target_role: Optional[str] = ""
    target_company: Optional[str] = ""
    ats_keyword_coverage: float = 0.0
    fact_check: FactCheckResult = Field(default_factory=FactCheckResult)
    gap_analysis: GapClassification = Field(default_factory=GapClassification)


class TailorRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    resume_text: str = ""
    jd_text: str = ""
    template_name: str = "classic-harvard"
    ai_provider: Optional[str] = "gemini"  # "gemini" | "openai" | "groq" | "nvidia" | "anthropic"
    api_key: Optional[str] = None
    model: Optional[str] = None
    target_role: Optional[str] = None
    target_company: Optional[str] = None


class RenderRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    tailored_resume: TailoredResume
    template_name: str = "classic-harvard"
