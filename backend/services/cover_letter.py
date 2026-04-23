"""Cover letter generation — rule-based, no AI."""
from typing import Dict, Optional
from datetime import date

TEMPLATES = {
    "professional": {
        "name": "Professional",
        "desc": "Formal tone, suitable for corporate and enterprise roles.",
    },
    "enthusiastic": {
        "name": "Enthusiastic",
        "desc": "Warm and energetic, great for startups and creative roles.",
    },
    "concise": {
        "name": "Concise",
        "desc": "Three-paragraph brevity, ideal when the JD says 'brief cover letter'.",
    },
    "fresher": {
        "name": "Fresher / Campus",
        "desc": "Education-first format for students and recent graduates.",
    },
}


def _name(resume_data: Dict) -> str:
    return (resume_data.get("personal") or {}).get("fullName") or "Candidate"


def _email(resume_data: Dict) -> str:
    return (resume_data.get("personal") or {}).get("email") or ""


def _phone(resume_data: Dict) -> str:
    return (resume_data.get("personal") or {}).get("phone") or ""


def _top_skills(resume_data: Dict, n: int = 5) -> str:
    skills = resume_data.get("skills") or []
    return ", ".join(skills[:n]) or "relevant skills"


def _latest_role(resume_data: Dict) -> str:
    exp = resume_data.get("experience") or []
    if exp:
        return f"{exp[0].get('role', 'professional')} at {exp[0].get('company', 'my previous employer')}"
    return "my previous role"


def _latest_edu(resume_data: Dict) -> str:
    edu = resume_data.get("education") or []
    if edu:
        e = edu[0]
        return f"{e.get('degree', 'degree')}{' in ' + e['field'] if e.get('field') else ''} from {e.get('school', 'university')}"
    return "my degree programme"


def generate_cover_letter(
    resume_data: Dict,
    job_title: str,
    company_name: str,
    template_id: str = "professional",
    custom_note: Optional[str] = None,
) -> str:
    name = _name(resume_data)
    skills = _top_skills(resume_data)
    role = _latest_role(resume_data)
    edu = _latest_edu(resume_data)
    today = date.today().strftime("%d %B %Y")

    header = f"{name}\n{_email(resume_data)}  ·  {_phone(resume_data)}\n{today}\n\n"
    salutation = f"Hiring Manager\n{company_name}\n\nDear Hiring Manager,\n\n"

    if template_id == "professional":
        body = (
            f"I am writing to express my strong interest in the {job_title} position at {company_name}. "
            f"With my background as {role}, I have developed expertise in {skills}, and I am confident these "
            f"competencies align well with your requirements.\n\n"
            f"Throughout my career I have consistently delivered results in fast-paced environments. "
            f"I am particularly drawn to {company_name} because of its reputation for innovation and impact. "
            f"I am eager to bring my skills and commitment to your team and contribute to your continued success.\n\n"
            f"I would welcome the opportunity to discuss how my experience can benefit {company_name}. "
            f"Thank you for considering my application; I look forward to speaking with you."
        )

    elif template_id == "enthusiastic":
        body = (
            f"When I saw the {job_title} opening at {company_name}, I immediately knew this was the role I had been "
            f"working towards! My journey as {role} has given me hands-on experience in {skills} — "
            f"and I am genuinely excited to bring that energy and expertise to your team.\n\n"
            f"{company_name}'s work really resonates with me. I love how the organisation pushes boundaries, "
            f"and I am 100% ready to roll up my sleeves and contribute from day one.\n\n"
            f"I would love to chat more — please feel free to reach out at any time. Thank you so much for "
            f"considering my application!"
        )

    elif template_id == "concise":
        body = (
            f"I am applying for the {job_title} role at {company_name}. As {role}, I have built strong capabilities "
            f"in {skills} that directly match your requirements.\n\n"
            f"I would welcome the opportunity to discuss my suitability further. Please find my resume attached."
        )

    elif template_id == "fresher":
        body = (
            f"I am a recent graduate with {edu}, applying for the {job_title} position at {company_name}. "
            f"During my studies and projects, I have developed foundational skills in {skills}.\n\n"
            f"I am eager to begin my professional career at an organisation like {company_name} where I can "
            f"learn from experienced mentors and contribute fresh perspectives. I am a quick learner, detail-oriented, "
            f"and passionate about growing in this field.\n\n"
            f"I would be grateful for the opportunity to discuss how I can contribute to your team. "
            f"Thank you for considering my application."
        )

    else:
        body = (
            f"I am applying for the {job_title} role at {company_name}. "
            f"My experience as {role} and skills in {skills} make me a strong candidate. "
            f"I look forward to discussing this further."
        )

    if custom_note:
        body += f"\n\n{custom_note}"

    closing = "\n\nWarm regards,\n" + name

    return header + salutation + body + closing
