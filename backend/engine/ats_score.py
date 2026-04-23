"""Rule-based ATS scoring engine. No AI."""
import re
from typing import Dict, List, Tuple

STOP_WORDS = {
    "the", "and", "or", "of", "a", "an", "to", "in", "for", "on", "with", "at",
    "by", "from", "as", "is", "are", "was", "were", "be", "been", "being", "have",
    "has", "had", "do", "does", "did", "will", "would", "should", "could", "may",
    "might", "must", "can", "this", "that", "these", "those", "i", "you", "he",
    "she", "we", "they", "it", "our", "their", "my", "your", "its", "but", "if",
    "then", "than", "so", "not", "no", "yes", "up", "down", "out", "over", "under",
    "again", "also", "any", "each", "every", "all", "some", "such",
}

SECTIONS = ["summary", "experience", "skills", "education", "projects", "certifications", "languages", "hobbies"]


def tokenize(text: str) -> List[str]:
    if not text:
        return []
    text = text.lower()
    tokens = re.findall(r"[a-z0-9+#.\-]{2,}", text)
    return [t for t in tokens if t not in STOP_WORDS and len(t) >= 2]


def extract_keywords(jd: str, top_n: int = 40) -> List[str]:
    """Extract top keywords from a JD."""
    tokens = tokenize(jd)
    freq = {}
    for t in tokens:
        freq[t] = freq.get(t, 0) + 1
    # Boost skill-like tokens
    boost_pattern = re.compile(r"^[a-z+#.][a-z0-9+#.\-]*$")
    scored = sorted(freq.items(), key=lambda x: (-x[1], x[0]))
    return [k for k, _ in scored[:top_n]]


def resume_text_of(resume_data: Dict) -> str:
    """Flatten resume JSON into a searchable text."""
    parts = []
    for key in ["summary", "objective"]:
        v = resume_data.get(key)
        if v:
            parts.append(str(v))
    for exp in resume_data.get("experience", []) or []:
        parts.extend([str(exp.get("role", "")), str(exp.get("company", "")),
                      str(exp.get("description", "")), str(exp.get("location", ""))])
        for b in exp.get("bullets", []) or []:
            parts.append(str(b))
    for proj in resume_data.get("projects", []) or []:
        parts.extend([str(proj.get("name", "")), str(proj.get("description", ""))])
        for b in proj.get("bullets", []) or []:
            parts.append(str(b))
    for edu in resume_data.get("education", []) or []:
        parts.extend([str(edu.get("degree", "")), str(edu.get("school", "")), str(edu.get("field", ""))])
    for sk in resume_data.get("skills", []) or []:
        parts.append(str(sk))
    for cert in resume_data.get("certifications", []) or []:
        parts.append(str(cert.get("name", "")) if isinstance(cert, dict) else str(cert))
    return " ".join(parts)


def completion_pct(resume_data: Dict) -> int:
    """Return completion percentage 0-100."""
    filled = 0
    total = 8
    if resume_data.get("personal", {}).get("fullName"):
        filled += 1
    if resume_data.get("personal", {}).get("email"):
        filled += 1
    if resume_data.get("summary"):
        filled += 1
    if resume_data.get("experience"):
        filled += 1
    if resume_data.get("education"):
        filled += 1
    if resume_data.get("skills"):
        filled += 1
    if resume_data.get("projects"):
        filled += 1
    if resume_data.get("personal", {}).get("phone"):
        filled += 1
    return int(filled / total * 100)


def score_resume(resume_data: Dict, jd: str) -> Dict:
    """Compute ATS score out of 100."""
    resume_text = resume_text_of(resume_data).lower()
    resume_tokens = set(tokenize(resume_text))
    jd_keywords = extract_keywords(jd, top_n=40)

    # 1. Keyword match — 40 points
    matched = [k for k in jd_keywords if k in resume_tokens]
    missing = [k for k in jd_keywords if k not in resume_tokens]
    kw_score = 0
    if jd_keywords:
        kw_score = round(len(matched) / len(jd_keywords) * 40)

    # 2. Section completeness — 30 points
    sections_present = 0
    for s in SECTIONS:
        v = resume_data.get(s)
        if v and (isinstance(v, str) or (isinstance(v, list) and len(v) > 0)):
            sections_present += 1
    sec_score = round(sections_present / len(SECTIONS) * 30)

    # 3. Resume length — 15 points (ideal 300-900 words)
    word_count = len(resume_text.split())
    if 300 <= word_count <= 900:
        len_score = 15
    elif word_count < 300:
        len_score = round(word_count / 300 * 15)
    else:
        len_score = max(0, 15 - round((word_count - 900) / 100))

    # 4. Formatting validation — 15 points
    fmt_score = 15
    suggestions = []
    personal = resume_data.get("personal", {}) or {}
    if not personal.get("email"):
        fmt_score -= 4
        suggestions.append({"type": "error", "message": "Add an email address — employers need a way to contact you."})
    if not personal.get("phone"):
        fmt_score -= 3
        suggestions.append({"type": "warning", "message": "Add a phone number for quick interview scheduling."})
    if not resume_data.get("summary"):
        fmt_score -= 3
        suggestions.append({"type": "warning", "message": "Add a professional summary (2-3 lines) at the top."})
    exp_list = resume_data.get("experience") or []
    if exp_list:
        has_bullets = any((e.get("bullets") or []) for e in exp_list)
        if not has_bullets:
            fmt_score -= 3
            suggestions.append({"type": "info", "message": "Use bullet points in experience for ATS readability."})
    if word_count < 150:
        suggestions.append({"type": "warning", "message": f"Resume is short ({word_count} words). Aim for 300+."})
    fmt_score = max(0, fmt_score)

    # Suggestions based on missing keywords
    if missing[:5]:
        suggestions.append({
            "type": "info",
            "message": f"Consider adding these JD keywords: {', '.join(missing[:5])}",
        })
    if matched:
        suggestions.append({
            "type": "success",
            "message": f"Matched {len(matched)} of {len(jd_keywords)} key terms from the JD.",
        })

    total = kw_score + sec_score + len_score + fmt_score
    return {
        "score": int(total),
        "breakdown": {
            "keywordMatch": kw_score,
            "sectionCompleteness": sec_score,
            "resumeLength": len_score,
            "formatting": fmt_score,
        },
        "matchedKeywords": matched,
        "missingKeywords": missing[:20],
        "suggestions": suggestions,
        "wordCount": word_count,
    }
