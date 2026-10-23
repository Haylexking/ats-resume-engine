"""Template generator script for CV Engine.
Generates 3 ATS-compliant Jinja2-tagged master Word templates using python-docx:
1. classic-harvard.docx
2. modern-executive.docx
3. tech-linear.docx
"""

import os
from pathlib import Path
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn


def add_bottom_border(paragraph, color_hex="333333", sz="6", space="2"):
    """Adds a clean horizontal bottom border line to a paragraph."""
    pPr = paragraph._element.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), sz)  # 6 = 1/8 pt
    bottom.set(qn('w:space'), space)
    bottom.set(qn('w:color'), color_hex)
    pBdr.append(bottom)
    pPr.append(pBdr)


def set_margins(section, top=0.75, bottom=0.75, left=0.75, right=0.75):
    """Sets page margins in inches."""
    section.top_margin = Inches(top)
    section.bottom_margin = Inches(bottom)
    section.left_margin = Inches(left)
    section.right_margin = Inches(right)


def apply_tab_stop(paragraph, position_inches=7.0):
    """Adds a right-aligned tab stop for aligning dates to the right margin."""
    paragraph.paragraph_format.tab_stops.add_tab_stop(
        Inches(position_inches), WD_TAB_ALIGNMENT.RIGHT
    )


def create_classic_harvard(output_path: Path):
    """Creates classic-harvard.docx template.
    Calibri, single-column, standard 0.75 margins, clean line dividers, uppercase section headers.
    """
    doc = docx.Document()
    set_margins(doc.sections[0], 0.75, 0.75, 0.75, 0.75)

    # 1. Candidate Name (Centered, Bold, 20pt)
    p_name = doc.add_paragraph()
    p_name.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_name.paragraph_format.space_before = Pt(0)
    p_name.paragraph_format.space_after = Pt(2)
    run_name = p_name.add_run("{{ contact.name }}")
    run_name.font.name = "Calibri"
    run_name.font.size = Pt(20)
    run_name.font.bold = True
    run_name.font.color.rgb = RGBColor(0x11, 0x11, 0x11)

    # 2. Contact Information Block (Centered, 9.5pt)
    p_contact = doc.add_paragraph()
    p_contact.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_contact.paragraph_format.space_before = Pt(0)
    p_contact.paragraph_format.space_after = Pt(8)
    run_contact = p_contact.add_run("{{ contact_line }}")
    run_contact.font.name = "Calibri"
    run_contact.font.size = Pt(9.5)
    run_contact.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

    # 3. Professional Summary
    p_sum_hdr = doc.add_paragraph()
    p_sum_hdr.paragraph_format.space_before = Pt(8)
    p_sum_hdr.paragraph_format.space_after = Pt(3)
    p_sum_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_sum_hdr, color_hex="222222", sz="6")
    run_sum_hdr = p_sum_hdr.add_run("PROFESSIONAL SUMMARY")
    run_sum_hdr.font.name = "Calibri"
    run_sum_hdr.font.size = Pt(11)
    run_sum_hdr.font.bold = True
    run_sum_hdr.font.color.rgb = RGBColor(0x11, 0x11, 0x11)

    p_sum = doc.add_paragraph()
    p_sum.paragraph_format.space_before = Pt(2)
    p_sum.paragraph_format.space_after = Pt(8)
    run_sum = p_sum.add_run("{{ summary }}")
    run_sum.font.name = "Calibri"
    run_sum.font.size = Pt(10)
    run_sum.font.color.rgb = RGBColor(0x22, 0x22, 0x22)

    # 4. Professional Experience
    p_exp_hdr = doc.add_paragraph()
    p_exp_hdr.paragraph_format.space_before = Pt(8)
    p_exp_hdr.paragraph_format.space_after = Pt(3)
    p_exp_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_exp_hdr, color_hex="222222", sz="6")
    run_exp_hdr = p_exp_hdr.add_run("PROFESSIONAL EXPERIENCE")
    run_exp_hdr.font.name = "Calibri"
    run_exp_hdr.font.size = Pt(11)
    run_exp_hdr.font.bold = True
    run_exp_hdr.font.color.rgb = RGBColor(0x11, 0x11, 0x11)

    # Loop over experience
    p_loop_exp_start = doc.add_paragraph("{%p for job in experience %}")
    p_loop_exp_start.paragraph_format.space_before = Pt(0)
    p_loop_exp_start.paragraph_format.space_after = Pt(0)

    # Job Title | Company \t Dates
    p_job = doc.add_paragraph()
    p_job.paragraph_format.space_before = Pt(5)
    p_job.paragraph_format.space_after = Pt(2)
    p_job.paragraph_format.keep_with_next = True
    apply_tab_stop(p_job, 7.0)

    run_title = p_job.add_run("{{ job.title }} | {{ job.company }}")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(10.5)
    run_title.font.bold = True
    run_title.font.color.rgb = RGBColor(0x11, 0x11, 0x11)

    run_dates = p_job.add_run("\t{{ job.dates }}")
    run_dates.font.name = "Calibri"
    run_dates.font.size = Pt(10)
    run_dates.font.italic = True
    run_dates.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

    # Bullets loop
    p_loop_bullet_start = doc.add_paragraph("{%p for bullet in job.bullets %}")
    p_loop_bullet_start.paragraph_format.space_before = Pt(0)
    p_loop_bullet_start.paragraph_format.space_after = Pt(0)

    p_bullet = doc.add_paragraph()
    p_bullet.paragraph_format.left_indent = Inches(0.25)
    p_bullet.paragraph_format.space_before = Pt(0)
    p_bullet.paragraph_format.space_after = Pt(2)
    run_bullet = p_bullet.add_run("•  {{ bullet.tailored_text }}")
    run_bullet.font.name = "Calibri"
    run_bullet.font.size = Pt(10)
    run_bullet.font.color.rgb = RGBColor(0x22, 0x22, 0x22)

    p_loop_bullet_end = doc.add_paragraph("{%p endfor %}")
    p_loop_bullet_end.paragraph_format.space_before = Pt(0)
    p_loop_bullet_end.paragraph_format.space_after = Pt(0)

    p_loop_exp_end = doc.add_paragraph("{%p endfor %}")
    p_loop_exp_end.paragraph_format.space_before = Pt(0)
    p_loop_exp_end.paragraph_format.space_after = Pt(0)

    # 5. Skills Section
    p_skills_hdr = doc.add_paragraph()
    p_skills_hdr.paragraph_format.space_before = Pt(8)
    p_skills_hdr.paragraph_format.space_after = Pt(3)
    p_skills_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_skills_hdr, color_hex="222222", sz="6")
    run_sk_hdr = p_skills_hdr.add_run("TECHNICAL & PROFESSIONAL SKILLS")
    run_sk_hdr.font.name = "Calibri"
    run_sk_hdr.font.size = Pt(11)
    run_sk_hdr.font.bold = True
    run_sk_hdr.font.color.rgb = RGBColor(0x11, 0x11, 0x11)

    skills_rows = [
        ("Languages: ", "{{ skills_languages }}"),
        ("Frameworks & Libraries: ", "{{ skills_frameworks }}"),
        ("Tools & Platforms: ", "{{ skills_tools }}"),
        ("Practices & Methodologies: ", "{{ skills_practices }}"),
    ]
    for lbl, val in skills_rows:
        p_sk = doc.add_paragraph()
        p_sk.paragraph_format.space_before = Pt(0)
        p_sk.paragraph_format.space_after = Pt(1.5)
        run_lbl = p_sk.add_run(lbl)
        run_lbl.font.name = "Calibri"
        run_lbl.font.size = Pt(10)
        run_lbl.font.bold = True
        run_lbl.font.color.rgb = RGBColor(0x11, 0x11, 0x11)
        run_val = p_sk.add_run(val)
        run_val.font.name = "Calibri"
        run_val.font.size = Pt(10)
        run_val.font.color.rgb = RGBColor(0x33, 0x33, 0x33)

    # 6. Education
    p_edu_hdr = doc.add_paragraph()
    p_edu_hdr.paragraph_format.space_before = Pt(8)
    p_edu_hdr.paragraph_format.space_after = Pt(3)
    p_edu_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_edu_hdr, color_hex="222222", sz="6")
    run_edu_hdr = p_edu_hdr.add_run("EDUCATION")
    run_edu_hdr.font.name = "Calibri"
    run_edu_hdr.font.size = Pt(11)
    run_edu_hdr.font.bold = True
    run_edu_hdr.font.color.rgb = RGBColor(0x11, 0x11, 0x11)

    p_loop_edu_start = doc.add_paragraph("{%p for edu in education %}")
    p_loop_edu_start.paragraph_format.space_before = Pt(0)
    p_loop_edu_start.paragraph_format.space_after = Pt(0)

    p_edu = doc.add_paragraph()
    p_edu.paragraph_format.space_before = Pt(2)
    p_edu.paragraph_format.space_after = Pt(1.5)
    apply_tab_stop(p_edu, 7.0)

    run_degree = p_edu.add_run("{{ edu.degree }} | {{ edu.institution }}")
    run_degree.font.name = "Calibri"
    run_degree.font.size = Pt(10)
    run_degree.font.bold = True
    run_degree.font.color.rgb = RGBColor(0x11, 0x11, 0x11)

    run_edudates = p_edu.add_run("\t{{ edu.dates }}")
    run_edudates.font.name = "Calibri"
    run_edudates.font.size = Pt(10)
    run_edudates.font.italic = True
    run_edudates.font.color.rgb = RGBColor(0x44, 0x44, 0x44)

    p_loop_edu_end = doc.add_paragraph("{%p endfor %}")
    p_loop_edu_end.paragraph_format.space_before = Pt(0)
    p_loop_edu_end.paragraph_format.space_after = Pt(0)

    # 7. Certifications
    p_cert_hdr = doc.add_paragraph()
    p_cert_hdr.paragraph_format.space_before = Pt(8)
    p_cert_hdr.paragraph_format.space_after = Pt(3)
    p_cert_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_cert_hdr, color_hex="222222", sz="6")
    run_cert_hdr = p_cert_hdr.add_run("CERTIFICATIONS")
    run_cert_hdr.font.name = "Calibri"
    run_cert_hdr.font.size = Pt(11)
    run_cert_hdr.font.bold = True
    run_cert_hdr.font.color.rgb = RGBColor(0x11, 0x11, 0x11)

    p_loop_cert_start = doc.add_paragraph("{%p for cert in certifications %}")
    p_loop_cert_start.paragraph_format.space_before = Pt(0)
    p_loop_cert_start.paragraph_format.space_after = Pt(0)

    p_cert = doc.add_paragraph()
    p_cert.paragraph_format.left_indent = Inches(0.25)
    p_cert.paragraph_format.space_before = Pt(0)
    p_cert.paragraph_format.space_after = Pt(1.5)
    run_cert = p_cert.add_run("•  {{ cert }}")
    run_cert.font.name = "Calibri"
    run_cert.font.size = Pt(10)
    run_cert.font.color.rgb = RGBColor(0x22, 0x22, 0x22)

    p_loop_cert_end = doc.add_paragraph("{%p endfor %}")
    p_loop_cert_end.paragraph_format.space_before = Pt(0)
    p_loop_cert_end.paragraph_format.space_after = Pt(0)

    doc.save(str(output_path))
    print(f"Generated classic-harvard at: {output_path}")


def create_modern_executive(output_path: Path):
    """Creates modern-executive.docx template.
    Garamond font, executive summary emphasis, bold title headers, clean bullet spacing.
    Executive Navy palette (#1A365D).
    """
    doc = docx.Document()
    set_margins(doc.sections[0], 0.75, 0.75, 0.75, 0.75)

    NAVY = RGBColor(0x1A, 0x36, 0x5D)
    CHARCOAL = RGBColor(0x22, 0x22, 0x22)
    SLATE = RGBColor(0x55, 0x55, 0x55)

    # 1. Executive Name (Left-aligned, 22pt Bold Garamond)
    p_name = doc.add_paragraph()
    p_name.paragraph_format.space_before = Pt(0)
    p_name.paragraph_format.space_after = Pt(1)
    run_name = p_name.add_run("{{ contact.name }}")
    run_name.font.name = "Garamond"
    run_name.font.size = Pt(22)
    run_name.font.bold = True
    run_name.font.color.rgb = NAVY

    # 2. Target Role / Executive Title
    p_role = doc.add_paragraph()
    p_role.paragraph_format.space_before = Pt(0)
    p_role.paragraph_format.space_after = Pt(3)
    run_role = p_role.add_run("{{ target_role }}")
    run_role.font.name = "Garamond"
    run_role.font.size = Pt(12)
    run_role.font.bold = True
    run_role.font.italic = True
    run_role.font.color.rgb = RGBColor(0x2A, 0x4B, 0x7C)

    # 3. Contact Line
    p_contact = doc.add_paragraph()
    p_contact.paragraph_format.space_before = Pt(0)
    p_contact.paragraph_format.space_after = Pt(8)
    run_contact = p_contact.add_run("{{ contact_line }}")
    run_contact.font.name = "Garamond"
    run_contact.font.size = Pt(10)
    run_contact.font.color.rgb = SLATE

    # 4. Executive Summary
    p_sum_hdr = doc.add_paragraph()
    p_sum_hdr.paragraph_format.space_before = Pt(10)
    p_sum_hdr.paragraph_format.space_after = Pt(3)
    p_sum_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_sum_hdr, color_hex="1A365D", sz="8")
    run_sum_hdr = p_sum_hdr.add_run("EXECUTIVE SUMMARY")
    run_sum_hdr.font.name = "Garamond"
    run_sum_hdr.font.size = Pt(12)
    run_sum_hdr.font.bold = True
    run_sum_hdr.font.color.rgb = NAVY

    p_sum = doc.add_paragraph()
    p_sum.paragraph_format.space_before = Pt(3)
    p_sum.paragraph_format.space_after = Pt(9)
    run_sum = p_sum.add_run("{{ summary }}")
    run_sum.font.name = "Garamond"
    run_sum.font.size = Pt(10.5)
    run_sum.font.color.rgb = CHARCOAL

    # 5. Core Competencies & Strategic Skills
    p_comp_hdr = doc.add_paragraph()
    p_comp_hdr.paragraph_format.space_before = Pt(8)
    p_comp_hdr.paragraph_format.space_after = Pt(3)
    p_comp_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_comp_hdr, color_hex="1A365D", sz="8")
    run_comp_hdr = p_comp_hdr.add_run("CORE COMPETENCIES & EXPERTISE")
    run_comp_hdr.font.name = "Garamond"
    run_comp_hdr.font.size = Pt(12)
    run_comp_hdr.font.bold = True
    run_comp_hdr.font.color.rgb = NAVY

    comp_rows = [
        ("Leadership & Practices: ", "{{ skills_practices }}"),
        ("Architectures & Platforms: ", "{{ skills_tools }}"),
        ("Frameworks & Technologies: ", "{{ skills_frameworks }}"),
        ("Core Languages: ", "{{ skills_languages }}"),
    ]
    for lbl, val in comp_rows:
        p_c = doc.add_paragraph()
        p_c.paragraph_format.space_before = Pt(0)
        p_c.paragraph_format.space_after = Pt(2)
        run_lbl = p_c.add_run(lbl)
        run_lbl.font.name = "Garamond"
        run_lbl.font.size = Pt(10)
        run_lbl.font.bold = True
        run_lbl.font.color.rgb = NAVY
        run_val = p_c.add_run(val)
        run_val.font.name = "Garamond"
        run_val.font.size = Pt(10)
        run_val.font.color.rgb = CHARCOAL

    # 6. Executive Leadership Experience
    p_exp_hdr = doc.add_paragraph()
    p_exp_hdr.paragraph_format.space_before = Pt(10)
    p_exp_hdr.paragraph_format.space_after = Pt(3)
    p_exp_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_exp_hdr, color_hex="1A365D", sz="8")
    run_exp_hdr = p_exp_hdr.add_run("PROFESSIONAL LEADERSHIP & EXPERIENCE")
    run_exp_hdr.font.name = "Garamond"
    run_exp_hdr.font.size = Pt(12)
    run_exp_hdr.font.bold = True
    run_exp_hdr.font.color.rgb = NAVY

    p_loop_exp_start = doc.add_paragraph("{%p for job in experience %}")
    p_loop_exp_start.paragraph_format.space_before = Pt(0)
    p_loop_exp_start.paragraph_format.space_after = Pt(0)

    p_job = doc.add_paragraph()
    p_job.paragraph_format.space_before = Pt(6)
    p_job.paragraph_format.space_after = Pt(1)
    p_job.paragraph_format.keep_with_next = True
    apply_tab_stop(p_job, 7.0)

    run_comp = p_job.add_run("{{ job.company }}")
    run_comp.font.name = "Garamond"
    run_comp.font.size = Pt(11.5)
    run_comp.font.bold = True
    run_comp.font.color.rgb = NAVY

    run_dates = p_job.add_run("\t{{ job.dates }}")
    run_dates.font.name = "Garamond"
    run_dates.font.size = Pt(10.5)
    run_dates.font.italic = True
    run_dates.font.color.rgb = SLATE

    p_job_sub = doc.add_paragraph()
    p_job_sub.paragraph_format.space_before = Pt(0)
    p_job_sub.paragraph_format.space_after = Pt(3)
    p_job_sub.paragraph_format.keep_with_next = True

    run_sub_title = p_job_sub.add_run("{{ job.title }}")
    run_sub_title.font.name = "Garamond"
    run_sub_title.font.size = Pt(10.5)
    run_sub_title.font.bold = True
    run_sub_title.font.italic = True
    run_sub_title.font.color.rgb = CHARCOAL

    p_loop_bullet_start = doc.add_paragraph("{%p for bullet in job.bullets %}")
    p_loop_bullet_start.paragraph_format.space_before = Pt(0)
    p_loop_bullet_start.paragraph_format.space_after = Pt(0)

    p_bullet = doc.add_paragraph()
    p_bullet.paragraph_format.left_indent = Inches(0.25)
    p_bullet.paragraph_format.space_before = Pt(0)
    p_bullet.paragraph_format.space_after = Pt(2.5)
    run_bullet = p_bullet.add_run("•  {{ bullet.tailored_text }}")
    run_bullet.font.name = "Garamond"
    run_bullet.font.size = Pt(10)
    run_bullet.font.color.rgb = CHARCOAL

    p_loop_bullet_end = doc.add_paragraph("{%p endfor %}")
    p_loop_bullet_end.paragraph_format.space_before = Pt(0)
    p_loop_bullet_end.paragraph_format.space_after = Pt(0)

    p_loop_exp_end = doc.add_paragraph("{%p endfor %}")
    p_loop_exp_end.paragraph_format.space_before = Pt(0)
    p_loop_exp_end.paragraph_format.space_after = Pt(0)

    # 7. Education & Credentials
    p_edu_hdr = doc.add_paragraph()
    p_edu_hdr.paragraph_format.space_before = Pt(10)
    p_edu_hdr.paragraph_format.space_after = Pt(3)
    p_edu_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_edu_hdr, color_hex="1A365D", sz="8")
    run_edu_hdr = p_edu_hdr.add_run("EDUCATION & CREDENTIALS")
    run_edu_hdr.font.name = "Garamond"
    run_edu_hdr.font.size = Pt(12)
    run_edu_hdr.font.bold = True
    run_edu_hdr.font.color.rgb = NAVY

    p_loop_edu_start = doc.add_paragraph("{%p for edu in education %}")
    p_loop_edu_start.paragraph_format.space_before = Pt(0)
    p_loop_edu_start.paragraph_format.space_after = Pt(0)

    p_edu = doc.add_paragraph()
    p_edu.paragraph_format.space_before = Pt(2)
    p_edu.paragraph_format.space_after = Pt(2)
    apply_tab_stop(p_edu, 7.0)

    run_degree = p_edu.add_run("{{ edu.degree }} — {{ edu.institution }}")
    run_degree.font.name = "Garamond"
    run_degree.font.size = Pt(10.5)
    run_degree.font.bold = True
    run_degree.font.color.rgb = CHARCOAL

    run_edudates = p_edu.add_run("\t{{ edu.dates }}")
    run_edudates.font.name = "Garamond"
    run_edudates.font.size = Pt(10)
    run_edudates.font.italic = True
    run_edudates.font.color.rgb = SLATE

    p_loop_edu_end = doc.add_paragraph("{%p endfor %}")
    p_loop_edu_end.paragraph_format.space_before = Pt(0)
    p_loop_edu_end.paragraph_format.space_after = Pt(0)

    # 8. Certifications
    p_cert_hdr = doc.add_paragraph()
    p_cert_hdr.paragraph_format.space_before = Pt(10)
    p_cert_hdr.paragraph_format.space_after = Pt(3)
    p_cert_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_cert_hdr, color_hex="1A365D", sz="8")
    run_cert_hdr = p_cert_hdr.add_run("CERTIFICATIONS & HONORS")
    run_cert_hdr.font.name = "Garamond"
    run_cert_hdr.font.size = Pt(12)
    run_cert_hdr.font.bold = True
    run_cert_hdr.font.color.rgb = NAVY

    p_loop_cert_start = doc.add_paragraph("{%p for cert in certifications %}")
    p_loop_cert_start.paragraph_format.space_before = Pt(0)
    p_loop_cert_start.paragraph_format.space_after = Pt(0)

    p_cert = doc.add_paragraph()
    p_cert.paragraph_format.left_indent = Inches(0.25)
    p_cert.paragraph_format.space_before = Pt(0)
    p_cert.paragraph_format.space_after = Pt(2)
    run_cert = p_cert.add_run("•  {{ cert }}")
    run_cert.font.name = "Garamond"
    run_cert.font.size = Pt(10)
    run_cert.font.color.rgb = CHARCOAL

    p_loop_cert_end = doc.add_paragraph("{%p endfor %}")
    p_loop_cert_end.paragraph_format.space_before = Pt(0)
    p_loop_cert_end.paragraph_format.space_after = Pt(0)

    doc.save(str(output_path))
    print(f"Generated modern-executive at: {output_path}")


def create_tech_linear(output_path: Path):
    """Creates tech-linear.docx template.
    Calibri, technical skills priority block at top, linear chronology, crisp impact bullets.
    Steel Blue accent (#0F4C81).
    """
    doc = docx.Document()
    set_margins(doc.sections[0], 0.75, 0.75, 0.75, 0.75)

    STEEL = RGBColor(0x0F, 0x4C, 0x81)
    DARK = RGBColor(0x1E, 0x1E, 0x1E)
    MUTED = RGBColor(0x50, 0x50, 0x50)

    # 1. Tech Candidate Header (Left-aligned)
    p_name = doc.add_paragraph()
    p_name.paragraph_format.space_before = Pt(0)
    p_name.paragraph_format.space_after = Pt(1)
    run_name = p_name.add_run("{{ contact.name }}")
    run_name.font.name = "Calibri"
    run_name.font.size = Pt(20)
    run_name.font.bold = True
    run_name.font.color.rgb = STEEL

    # Subtitle / Target Role
    p_role = doc.add_paragraph()
    p_role.paragraph_format.space_before = Pt(0)
    p_role.paragraph_format.space_after = Pt(2)
    run_role = p_role.add_run("{{ target_role }}")
    run_role.font.name = "Calibri"
    run_role.font.size = Pt(11)
    run_role.font.bold = True
    run_role.font.color.rgb = DARK

    # Contact line
    p_contact = doc.add_paragraph()
    p_contact.paragraph_format.space_before = Pt(0)
    p_contact.paragraph_format.space_after = Pt(6)
    run_contact = p_contact.add_run("{{ contact_line }}")
    run_contact.font.name = "Calibri"
    run_contact.font.size = Pt(9)
    run_contact.font.color.rgb = MUTED

    # 2. PRIORITY TECHNICAL SKILLS BLOCK (Top priority in Tech Linear)
    p_sk_hdr = doc.add_paragraph()
    p_sk_hdr.paragraph_format.space_before = Pt(6)
    p_sk_hdr.paragraph_format.space_after = Pt(3)
    p_sk_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_sk_hdr, color_hex="0F4C81", sz="6")
    run_sk_hdr = p_sk_hdr.add_run("TECHNICAL SKILLS")
    run_sk_hdr.font.name = "Calibri"
    run_sk_hdr.font.size = Pt(11)
    run_sk_hdr.font.bold = True
    run_sk_hdr.font.color.rgb = STEEL

    tech_skills = [
        ("Languages: ", "{{ skills_languages }}"),
        ("Frameworks & Engines: ", "{{ skills_frameworks }}"),
        ("Cloud, Platforms & DevOps: ", "{{ skills_tools }}"),
        ("Architecture & Practices: ", "{{ skills_practices }}"),
    ]
    for lbl, val in tech_skills:
        p_sk = doc.add_paragraph()
        p_sk.paragraph_format.space_before = Pt(0)
        p_sk.paragraph_format.space_after = Pt(1.5)
        run_lbl = p_sk.add_run(lbl)
        run_lbl.font.name = "Calibri"
        run_lbl.font.size = Pt(9.5)
        run_lbl.font.bold = True
        run_lbl.font.color.rgb = DARK
        run_val = p_sk.add_run(val)
        run_val.font.name = "Calibri"
        run_val.font.size = Pt(9.5)
        run_val.font.color.rgb = DARK

    # 3. Work Experience (Linear Chronological)
    p_exp_hdr = doc.add_paragraph()
    p_exp_hdr.paragraph_format.space_before = Pt(8)
    p_exp_hdr.paragraph_format.space_after = Pt(3)
    p_exp_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_exp_hdr, color_hex="0F4C81", sz="6")
    run_exp_hdr = p_exp_hdr.add_run("WORK EXPERIENCE")
    run_exp_hdr.font.name = "Calibri"
    run_exp_hdr.font.size = Pt(11)
    run_exp_hdr.font.bold = True
    run_exp_hdr.font.color.rgb = STEEL

    p_loop_exp_start = doc.add_paragraph("{%p for job in experience %}")
    p_loop_exp_start.paragraph_format.space_before = Pt(0)
    p_loop_exp_start.paragraph_format.space_after = Pt(0)

    p_job = doc.add_paragraph()
    p_job.paragraph_format.space_before = Pt(4)
    p_job.paragraph_format.space_after = Pt(1)
    p_job.paragraph_format.keep_with_next = True
    apply_tab_stop(p_job, 7.0)

    run_title = p_job.add_run("{{ job.title }} — {{ job.company }}")
    run_title.font.name = "Calibri"
    run_title.font.size = Pt(10)
    run_title.font.bold = True
    run_title.font.color.rgb = DARK

    run_dates = p_job.add_run("\t{{ job.dates }}")
    run_dates.font.name = "Calibri"
    run_dates.font.size = Pt(9.5)
    run_dates.font.italic = True
    run_dates.font.color.rgb = MUTED

    p_loop_bullet_start = doc.add_paragraph("{%p for bullet in job.bullets %}")
    p_loop_bullet_start.paragraph_format.space_before = Pt(0)
    p_loop_bullet_start.paragraph_format.space_after = Pt(0)

    p_bullet = doc.add_paragraph()
    p_bullet.paragraph_format.left_indent = Inches(0.2)
    p_bullet.paragraph_format.space_before = Pt(0)
    p_bullet.paragraph_format.space_after = Pt(2)
    run_bullet = p_bullet.add_run("•  {{ bullet.tailored_text }}")
    run_bullet.font.name = "Calibri"
    run_bullet.font.size = Pt(9.5)
    run_bullet.font.color.rgb = DARK

    p_loop_bullet_end = doc.add_paragraph("{%p endfor %}")
    p_loop_bullet_end.paragraph_format.space_before = Pt(0)
    p_loop_bullet_end.paragraph_format.space_after = Pt(0)

    p_loop_exp_end = doc.add_paragraph("{%p endfor %}")
    p_loop_exp_end.paragraph_format.space_before = Pt(0)
    p_loop_exp_end.paragraph_format.space_after = Pt(0)

    # 4. Summary / Systems Architecture Profile
    p_sum_hdr = doc.add_paragraph()
    p_sum_hdr.paragraph_format.space_before = Pt(8)
    p_sum_hdr.paragraph_format.space_after = Pt(3)
    p_sum_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_sum_hdr, color_hex="0F4C81", sz="6")
    run_sum_hdr = p_sum_hdr.add_run("TECHNICAL SUMMARY")
    run_sum_hdr.font.name = "Calibri"
    run_sum_hdr.font.size = Pt(11)
    run_sum_hdr.font.bold = True
    run_sum_hdr.font.color.rgb = STEEL

    p_sum = doc.add_paragraph()
    p_sum.paragraph_format.space_before = Pt(2)
    p_sum.paragraph_format.space_after = Pt(6)
    run_sum = p_sum.add_run("{{ summary }}")
    run_sum.font.name = "Calibri"
    run_sum.font.size = Pt(9.5)
    run_sum.font.color.rgb = DARK

    # 5. Education
    p_edu_hdr = doc.add_paragraph()
    p_edu_hdr.paragraph_format.space_before = Pt(8)
    p_edu_hdr.paragraph_format.space_after = Pt(3)
    p_edu_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_edu_hdr, color_hex="0F4C81", sz="6")
    run_edu_hdr = p_edu_hdr.add_run("EDUCATION")
    run_edu_hdr.font.name = "Calibri"
    run_edu_hdr.font.size = Pt(11)
    run_edu_hdr.font.bold = True
    run_edu_hdr.font.color.rgb = STEEL

    p_loop_edu_start = doc.add_paragraph("{%p for edu in education %}")
    p_loop_edu_start.paragraph_format.space_before = Pt(0)
    p_loop_edu_start.paragraph_format.space_after = Pt(0)

    p_edu = doc.add_paragraph()
    p_edu.paragraph_format.space_before = Pt(2)
    p_edu.paragraph_format.space_after = Pt(1.5)
    apply_tab_stop(p_edu, 7.0)

    run_degree = p_edu.add_run("{{ edu.degree }} | {{ edu.institution }}")
    run_degree.font.name = "Calibri"
    run_degree.font.size = Pt(9.5)
    run_degree.font.bold = True
    run_degree.font.color.rgb = DARK

    run_edudates = p_edu.add_run("\t{{ edu.dates }}")
    run_edudates.font.name = "Calibri"
    run_edudates.font.size = Pt(9.5)
    run_edudates.font.italic = True
    run_edudates.font.color.rgb = MUTED

    p_loop_edu_end = doc.add_paragraph("{%p endfor %}")
    p_loop_edu_end.paragraph_format.space_before = Pt(0)
    p_loop_edu_end.paragraph_format.space_after = Pt(0)

    # 6. Certifications
    p_cert_hdr = doc.add_paragraph()
    p_cert_hdr.paragraph_format.space_before = Pt(8)
    p_cert_hdr.paragraph_format.space_after = Pt(3)
    p_cert_hdr.paragraph_format.keep_with_next = True
    add_bottom_border(p_cert_hdr, color_hex="0F4C81", sz="6")
    run_cert_hdr = p_cert_hdr.add_run("CERTIFICATIONS")
    run_cert_hdr.font.name = "Calibri"
    run_cert_hdr.font.size = Pt(11)
    run_cert_hdr.font.bold = True
    run_cert_hdr.font.color.rgb = STEEL

    p_loop_cert_start = doc.add_paragraph("{%p for cert in certifications %}")
    p_loop_cert_start.paragraph_format.space_before = Pt(0)
    p_loop_cert_start.paragraph_format.space_after = Pt(0)

    p_cert = doc.add_paragraph()
    p_cert.paragraph_format.left_indent = Inches(0.2)
    p_cert.paragraph_format.space_before = Pt(0)
    p_cert.paragraph_format.space_after = Pt(1.5)
    run_cert = p_cert.add_run("•  {{ cert }}")
    run_cert.font.name = "Calibri"
    run_cert.font.size = Pt(9.5)
    run_cert.font.color.rgb = DARK

    p_loop_cert_end = doc.add_paragraph("{%p endfor %}")
    p_loop_cert_end.paragraph_format.space_before = Pt(0)
    p_loop_cert_end.paragraph_format.space_after = Pt(0)

    doc.save(str(output_path))
    print(f"Generated tech-linear at: {output_path}")


def main():
    templates_dir = Path(__file__).parent / "templates"
    templates_dir.mkdir(parents=True, exist_ok=True)

    create_classic_harvard(templates_dir / "classic-harvard.docx")
    create_modern_executive(templates_dir / "modern-executive.docx")
    create_tech_linear(templates_dir / "tech-linear.docx")
    print("All 3 templates successfully generated.")


if __name__ == "__main__":
    main()
