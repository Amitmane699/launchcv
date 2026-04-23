"""Simple PDF export using ReportLab."""
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.colors import HexColor, black, grey
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, HRFlowable,
)
from reportlab.lib.enums import TA_LEFT


def _p(text, style):
    if not text:
        return Spacer(0, 0)
    # Escape angle brackets for reportlab
    text = str(text).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return Paragraph(text, style)


def build_resume_pdf(resume_doc, watermark: bool = False) -> bytes:
    data = resume_doc.get("data") or {}
    personal = data.get("personal") or {}
    template_id = resume_doc.get("template_id", "classic")

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.6 * cm, rightMargin=1.6 * cm,
        topMargin=1.4 * cm, bottomMargin=1.4 * cm,
    )
    styles = getSampleStyleSheet()
    accent = HexColor("#0D0D12")
    orange = HexColor("#FF4400")

    style_name = ParagraphStyle(
        "name", parent=styles["Heading1"], fontName="Helvetica-Bold",
        fontSize=22, leading=26, textColor=accent, spaceAfter=4, alignment=TA_LEFT,
    )
    style_role = ParagraphStyle(
        "role", parent=styles["Normal"], fontName="Helvetica",
        fontSize=11, leading=14, textColor=HexColor("#4A4D57"), spaceAfter=8,
    )
    style_contact = ParagraphStyle(
        "contact", parent=styles["Normal"], fontName="Helvetica",
        fontSize=9, leading=12, textColor=HexColor("#4A4D57"), spaceAfter=10,
    )
    style_h = ParagraphStyle(
        "sh", parent=styles["Heading2"], fontName="Helvetica-Bold",
        fontSize=11, leading=14, textColor=orange if template_id in ("modern", "creative") else accent,
        spaceBefore=10, spaceAfter=4,
    )
    style_body = ParagraphStyle(
        "body", parent=styles["Normal"], fontName="Helvetica",
        fontSize=10, leading=13, textColor=HexColor("#1A1A1F"), spaceAfter=4,
    )
    style_bullet = ParagraphStyle(
        "bullet", parent=style_body, leftIndent=12, bulletIndent=2,
    )

    flow = []

    # Header
    flow.append(_p(personal.get("fullName") or "Your Name", style_name))
    headline_bits = []
    if personal.get("headline"):
        headline_bits.append(personal["headline"])
    if headline_bits:
        flow.append(_p(" · ".join(headline_bits), style_role))
    contact_parts = []
    if personal.get("email"): contact_parts.append(personal["email"])
    if personal.get("phone"): contact_parts.append(personal["phone"])
    if personal.get("location"): contact_parts.append(personal["location"])
    if personal.get("linkedin"): contact_parts.append(personal["linkedin"])
    if personal.get("website"): contact_parts.append(personal["website"])
    if contact_parts:
        flow.append(_p(" &nbsp;·&nbsp; ".join(contact_parts), style_contact))

    flow.append(HRFlowable(width="100%", color=accent, thickness=1.2, spaceAfter=8))

    section_order = resume_doc.get("section_order") or [
        "summary", "experience", "skills", "education", "projects", "certifications"
    ]

    for sec in section_order:
        if sec == "summary" and data.get("summary"):
            flow.append(_p("SUMMARY", style_h))
            flow.append(_p(data["summary"], style_body))
        elif sec == "experience" and data.get("experience"):
            flow.append(_p("EXPERIENCE", style_h))
            for exp in data["experience"]:
                title_line = f"<b>{exp.get('role', '')}</b> — {exp.get('company', '')}"
                dates = exp.get("duration") or f"{exp.get('startDate', '')} - {exp.get('endDate', '')}"
                flow.append(_p(title_line, style_body))
                flow.append(_p(f"<i>{dates}{' · ' + exp.get('location', '') if exp.get('location') else ''}</i>", style_body))
                if exp.get("description"):
                    flow.append(_p(exp["description"], style_body))
                for b in exp.get("bullets") or []:
                    flow.append(_p("• " + b, style_bullet))
                flow.append(Spacer(0, 4))
        elif sec == "skills" and data.get("skills"):
            flow.append(_p("SKILLS", style_h))
            flow.append(_p(" · ".join(data["skills"]), style_body))
        elif sec == "education" and data.get("education"):
            flow.append(_p("EDUCATION", style_h))
            for edu in data["education"]:
                line = f"<b>{edu.get('degree', '')}</b>{' — ' + edu.get('field', '') if edu.get('field') else ''}"
                flow.append(_p(line, style_body))
                flow.append(_p(f"<i>{edu.get('school', '')} · {edu.get('duration', '')}</i>", style_body))
                if edu.get("grade"):
                    flow.append(_p(f"Grade: {edu['grade']}", style_body))
                flow.append(Spacer(0, 4))
        elif sec == "projects" and data.get("projects"):
            flow.append(_p("PROJECTS", style_h))
            for proj in data["projects"]:
                flow.append(_p(f"<b>{proj.get('name', '')}</b>", style_body))
                if proj.get("description"):
                    flow.append(_p(proj["description"], style_body))
                for b in proj.get("bullets") or []:
                    flow.append(_p("• " + b, style_bullet))
                flow.append(Spacer(0, 4))
        elif sec == "certifications" and data.get("certifications"):
            flow.append(_p("CERTIFICATIONS", style_h))
            for c in data["certifications"]:
                if isinstance(c, dict):
                    flow.append(_p(f"• {c.get('name', '')} — {c.get('issuer', '')}", style_bullet))
                else:
                    flow.append(_p(f"• {c}", style_bullet))
        elif sec == "languages" and data.get("languages"):
            flow.append(_p("LANGUAGES", style_h))
            flow.append(_p(" · ".join(data["languages"]), style_body))
        elif sec == "hobbies" and data.get("hobbies"):
            flow.append(_p("HOBBIES", style_h))
            flow.append(_p(" · ".join(data["hobbies"]), style_body))

    def add_watermark(canvas, doc_):
        if watermark:
            canvas.saveState()
            canvas.setFont("Helvetica-Bold", 40)
            canvas.setFillColor(HexColor("#E5E7EB"))
            canvas.translate(A4[0] / 2, A4[1] / 2)
            canvas.rotate(35)
            canvas.drawCentredString(0, 0, "RESUMEPRO FREE")
            canvas.restoreState()

    doc.build(flow, onFirstPage=add_watermark, onLaterPages=add_watermark)
    return buf.getvalue()
