"""Self-check ATS — resume-only rule-based scoring.

Rules per user spec:
- Has contact info (name, email, phone) → +15
- Has professional summary → +10
- Has at least 2 work experiences → +20
- Each experience has bullet points with action verbs → +15
- Skills section has 5+ skills → +15
- Education section filled → +10
- Resume length is 400–800 words → +10
- No special characters/emojis → +5
Total: 100
"""
import re
from typing import Dict, Any

ACTION_VERBS = {
    "led", "built", "managed", "developed", "designed", "created", "launched",
    "implemented", "delivered", "optimized", "reduced", "increased", "improved",
    "drove", "owned", "shipped", "architected", "scaled", "mentored", "coordinated",
    "executed", "spearheaded", "pioneered", "automated", "engineered", "analyzed",
    "established", "restructured", "negotiated", "orchestrated", "founded",
    "generated", "grew", "transformed", "deployed", "migrated", "achieved",
}

EMOJI_RE = re.compile(
    "[\U0001F300-\U0001FAFF\U0001F600-\U0001F64F\U0001F680-\U0001F6FF"
    "\u2600-\u27BF\u2B50\u2B55\u203C\u2049\u20E3\uFE0F]"
)


def flatten_text(data: Dict[str, Any]) -> str:
    parts = []
    if data.get("summary"): parts.append(data["summary"])
    for exp in data.get("experience", []) or []:
        parts.append(f"{exp.get('role', '')} {exp.get('company', '')} {exp.get('description', '')}")
        for b in exp.get("bullets", []) or []:
            parts.append(str(b))
    for pr in data.get("projects", []) or []:
        parts.append(f"{pr.get('name', '')} {pr.get('description', '')}")
        for b in pr.get("bullets", []) or []:
            parts.append(str(b))
    for sk in data.get("skills", []) or []:
        parts.append(str(sk))
    for edu in data.get("education", []) or []:
        parts.append(f"{edu.get('degree', '')} {edu.get('school', '')}")
    return " ".join(parts)


def self_check(resume_data: Dict[str, Any]) -> Dict[str, Any]:
    personal = resume_data.get("personal", {}) or {}
    summary = resume_data.get("summary") or ""
    experience = resume_data.get("experience", []) or []
    skills = resume_data.get("skills", []) or []
    education = resume_data.get("education", []) or []

    checks = []
    score = 0

    # 1. Contact info (15)
    has_contact = bool(personal.get("fullName") and personal.get("email") and personal.get("phone"))
    score += 15 if has_contact else 0
    checks.append({
        "label": "Contact info complete (name, email, phone)",
        "points": 15, "earned": 15 if has_contact else 0,
        "status": "pass" if has_contact else "fail",
        "tip": "Add your full name, email, and phone." if not has_contact else "Great! Your contact info is complete.",
    })

    # 2. Summary (10)
    has_summary = len(summary.split()) >= 15
    score += 10 if has_summary else 0
    checks.append({
        "label": "Professional summary (15+ words)",
        "points": 10, "earned": 10 if has_summary else 0,
        "status": "pass" if has_summary else "fail",
        "tip": "Add a 2–3 line professional summary to boost your score." if not has_summary else "Great summary.",
    })

    # 3. 2+ experiences (20)
    has_exp = len(experience) >= 2
    score += 20 if has_exp else (10 if len(experience) == 1 else 0)
    checks.append({
        "label": "At least 2 work experiences",
        "points": 20, "earned": 20 if has_exp else (10 if len(experience) == 1 else 0),
        "status": "pass" if has_exp else ("warn" if len(experience) == 1 else "fail"),
        "tip": "Add at least 2 roles to show progression." if not has_exp else "Good work history.",
    })

    # 4. Experiences use action verbs (15)
    all_bullets = []
    for e in experience:
        all_bullets.extend(e.get("bullets") or [])
    verb_hits = sum(1 for b in all_bullets if any(b.lower().startswith(v) or f" {v} " in f" {b.lower()} " for v in ACTION_VERBS))
    has_verbs = verb_hits >= max(2, len(experience))
    score += 15 if has_verbs else (7 if verb_hits >= 1 else 0)
    checks.append({
        "label": f"Bullet points start with action verbs ({verb_hits} found)",
        "points": 15, "earned": 15 if has_verbs else (7 if verb_hits >= 1 else 0),
        "status": "pass" if has_verbs else ("warn" if verb_hits >= 1 else "fail"),
        "tip": "Start bullets with verbs like Led, Built, Managed, Developed." if not has_verbs else "Strong action verbs.",
    })

    # 5. Skills 5+ (15)
    has_skills = len(skills) >= 5
    score += 15 if has_skills else (7 if len(skills) >= 3 else 0)
    checks.append({
        "label": f"Skills section (5+ skills) — {len(skills)} listed",
        "points": 15, "earned": 15 if has_skills else (7 if len(skills) >= 3 else 0),
        "status": "pass" if has_skills else ("warn" if len(skills) >= 3 else "fail"),
        "tip": "Add at least 5 relevant skills." if not has_skills else "Nice skills list.",
    })

    # 6. Education (10)
    has_edu = len(education) >= 1 and any((e.get("degree") or e.get("school")) for e in education)
    score += 10 if has_edu else 0
    checks.append({
        "label": "Education section filled",
        "points": 10, "earned": 10 if has_edu else 0,
        "status": "pass" if has_edu else "fail",
        "tip": "Add at least one education entry." if not has_edu else "Education looks good.",
    })

    # 7. Length 400-800 (10)
    text = flatten_text(resume_data)
    word_count = len(text.split())
    length_ok = 400 <= word_count <= 800
    near = (300 <= word_count < 400) or (800 < word_count <= 1000)
    score += 10 if length_ok else (5 if near else 0)
    checks.append({
        "label": f"Length 400–800 words (currently {word_count})",
        "points": 10, "earned": 10 if length_ok else (5 if near else 0),
        "status": "pass" if length_ok else ("warn" if near else "fail"),
        "tip": "Aim for 400–800 words — concise but detailed.",
    })

    # 8. No emojis/special chars (5)
    has_emoji = bool(EMOJI_RE.search(text))
    score += 0 if has_emoji else 5
    checks.append({
        "label": "No emojis or special graphics characters",
        "points": 5, "earned": 5 if not has_emoji else 0,
        "status": "pass" if not has_emoji else "fail",
        "tip": "Remove emojis — ATS systems strip them anyway." if has_emoji else "Clean text — ATS friendly.",
    })

    level = "green" if score > 75 else ("yellow" if score >= 50 else "red")
    return {
        "score": min(100, score),
        "level": level,
        "word_count": word_count,
        "checks": checks,
    }
