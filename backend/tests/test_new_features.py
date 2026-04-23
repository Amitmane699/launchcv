"""Tests for new LaunchCV features:
- POST /api/resumes/parse-upload (PDF + DOCX rule-based parser)
- POST /api/ats/self-check  (resume-only rule-based scoring)
- GET  /api/resumes/{id}/export/txt (plain-text export)
- GET  /api/settings/public (regression)
"""
import io
import uuid
import requests
import pytest
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from docx import Document


# ──────────────────────── helpers ────────────────────────
SAMPLE_RESUME_LINES = [
    "Jane Smith",
    "jane.smith@example.com | +1 415-555-0199 | San Francisco, CA",
    "linkedin.com/in/janesmith",
    "",
    "SUMMARY",
    "Senior software engineer with 8 years building distributed systems and APIs.",
    "Specialised in Python, FastAPI and cloud-native deployments.",
    "",
    "EXPERIENCE",
    "Senior Engineer",
    "Acme Corp",
    "Jan 2020 - Present",
    "- Led migration of monolith to microservices on Kubernetes",
    "- Built FastAPI services handling 5M req/day",
    "- Mentored 6 engineers and drove on-call quality improvements",
    "",
    "Software Engineer",
    "Globex Inc",
    "Jun 2016 - Dec 2019",
    "- Developed Python data pipelines using Pandas and Airflow",
    "- Optimized PostgreSQL queries reducing latency by 60%",
    "",
    "SKILLS",
    "Python, FastAPI, MongoDB, PostgreSQL, Docker, Kubernetes, AWS, React",
    "",
    "EDUCATION",
    "B.Tech Computer Science",
    "IIT Bombay",
    "2012 - 2016",
]


def _make_pdf_bytes() -> bytes:
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    y = 750
    for line in SAMPLE_RESUME_LINES:
        c.drawString(50, y, line)
        y -= 14
        if y < 50:
            c.showPage(); y = 750
    c.save()
    return buf.getvalue()


def _make_docx_bytes() -> bytes:
    buf = io.BytesIO()
    doc = Document()
    for line in SAMPLE_RESUME_LINES:
        doc.add_paragraph(line)
    doc.save(buf)
    return buf.getvalue()


# ──────────────────────── parse-upload ────────────────────────
class TestParseUpload:
    def test_requires_auth(self, api):
        r = requests.post(f"{api}/resumes/parse-upload",
                          files={"file": ("x.pdf", _make_pdf_bytes(), "application/pdf")})
        assert r.status_code == 401, r.text

    def test_no_file_returns_422(self, api, seeker):
        r = requests.post(f"{api}/resumes/parse-upload", headers=seeker["headers"])
        assert r.status_code == 422, r.text

    def test_wrong_type_returns_400(self, api, seeker):
        r = requests.post(f"{api}/resumes/parse-upload",
                          headers=seeker["headers"],
                          files={"file": ("evil.txt", b"hello", "text/plain")})
        assert r.status_code == 400
        assert "pdf" in r.text.lower() and "docx" in r.text.lower()

    def test_parse_pdf_success(self, api, seeker):
        pdf = _make_pdf_bytes()
        r = requests.post(f"{api}/resumes/parse-upload",
                          headers=seeker["headers"],
                          files={"file": ("resume.pdf", pdf, "application/pdf")})
        assert r.status_code == 200, r.text
        body = r.json()
        # top-level structure
        assert "confidence" in body and isinstance(body["confidence"], int)
        assert 0 <= body["confidence"] <= 100
        assert "data" in body
        d = body["data"]
        for k in ("personal", "summary", "experience", "skills", "education"):
            assert k in d, f"missing key {k}"
        # parsed values from sample
        assert d["personal"].get("email", "").lower().startswith("jane.smith@")
        assert d["personal"].get("phone")
        assert "Jane" in (d["personal"].get("fullName") or "")
        assert any("python" in s.lower() for s in d["skills"])
        assert len(d["experience"]) >= 1

    def test_parse_docx_success(self, api, seeker):
        docx_bytes = _make_docx_bytes()
        r = requests.post(
            f"{api}/resumes/parse-upload",
            headers=seeker["headers"],
            files={"file": ("resume.docx", docx_bytes,
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert r.status_code == 200, r.text
        body = r.json()
        d = body["data"]
        assert d["personal"].get("email", "").lower().startswith("jane.smith@")
        assert any("python" in s.lower() for s in d["skills"])

    def test_corrupt_pdf_handled(self, api, seeker):
        r = requests.post(f"{api}/resumes/parse-upload",
                          headers=seeker["headers"],
                          files={"file": ("bad.pdf", b"not really a pdf", "application/pdf")})
        # Should not be 500 — should be 400 with parse error
        assert r.status_code == 400, f"Got {r.status_code}: {r.text}"

    def test_empty_file_handled(self, api, seeker):
        r = requests.post(f"{api}/resumes/parse-upload",
                          headers=seeker["headers"],
                          files={"file": ("empty.pdf", b"", "application/pdf")})
        assert r.status_code == 400


# ──────────────────────── self-check ────────────────────────
class TestSelfCheck:
    def _create_resume(self, api, seeker, data):
        r = requests.post(f"{api}/resumes", headers=seeker["headers"],
                          json={"name": f"TEST_SC_{uuid.uuid4().hex[:6]}", "data": data})
        # If free seeker hit limit, use pro_seeker outside
        return r

    def test_full_resume_high_score(self, api, pro_seeker):
        data = {
            "personal": {"fullName": "Jane Smith",
                         "email": "j@x.com", "phone": "1234567890"},
            "summary": ("Senior software engineer with 8 years building distributed "
                        "systems APIs and cloud platforms across multiple industries."),
            "experience": [
                {"role": "Senior Engineer", "company": "Acme",
                 "bullets": ["Led migration to microservices on Kubernetes",
                             "Built FastAPI services handling 5M req per day",
                             "Mentored 6 engineers across two squads"]},
                {"role": "Engineer", "company": "Globex",
                 "bullets": ["Developed Python data pipelines",
                             "Optimized PostgreSQL queries reducing latency 60%"]},
            ],
            "skills": ["python", "fastapi", "mongodb", "react", "aws", "docker"],
            "education": [{"degree": "B.Tech CS", "school": "IIT Bombay"}],
        }
        # pro user has no resume cap
        r = requests.post(f"{api}/resumes", headers=pro_seeker["headers"],
                          json={"name": "TEST_SC_full", "data": data})
        assert r.status_code == 200, r.text
        rid = r.json()["id"]

        sc = requests.post(f"{api}/ats/self-check", headers=pro_seeker["headers"],
                           json={"resume_id": rid})
        assert sc.status_code == 200, sc.text
        body = sc.json()
        assert body["score"] >= 60, body  # full content but probably <400 words
        assert body["level"] in ("green", "yellow", "red")
        assert "word_count" in body and isinstance(body["word_count"], int)
        assert "checks" in body and len(body["checks"]) == 8
        for chk in body["checks"]:
            assert chk["status"] in ("pass", "warn", "fail")
            assert "earned" in chk and "points" in chk and "tip" in chk
            assert 0 <= chk["earned"] <= chk["points"]
        # Contact, experience, skills, edu rules should pass
        labels = {c["label"]: c for c in body["checks"]}
        contact_chk = next(c for c in body["checks"] if "Contact" in c["label"])
        assert contact_chk["status"] == "pass"
        skills_chk = next(c for c in body["checks"] if c["label"].startswith("Skills"))
        assert skills_chk["status"] == "pass"

    def test_empty_resume_low_score(self, api, pro_seeker):
        r = requests.post(f"{api}/resumes", headers=pro_seeker["headers"],
                          json={"name": "TEST_SC_empty",
                                "data": {"personal": {}, "summary": "",
                                         "experience": [], "skills": [], "education": []}})
        assert r.status_code == 200
        rid = r.json()["id"]
        sc = requests.post(f"{api}/ats/self-check", headers=pro_seeker["headers"],
                           json={"resume_id": rid})
        assert sc.status_code == 200
        body = sc.json()
        # Only the "no emoji" rule passes => 5 pts
        assert body["score"] <= 10
        assert body["level"] == "red"

    def test_self_check_resume_not_found(self, api, pro_seeker):
        r = requests.post(f"{api}/ats/self-check", headers=pro_seeker["headers"],
                          json={"resume_id": "does-not-exist"})
        assert r.status_code == 404


# ──────────────────────── export/txt ────────────────────────
class TestExportTxt:
    def test_txt_export(self, api, pro_seeker):
        r = requests.post(f"{api}/resumes", headers=pro_seeker["headers"],
                          json={"name": "TEST_TxtExport",
                                "data": {"personal": {"fullName": "Jane Smith",
                                                      "email": "j@x.com", "phone": "999"},
                                         "summary": "Senior engineer.",
                                         "skills": ["Python", "FastAPI"],
                                         "experience": [{"role": "Dev", "company": "Acme",
                                                         "bullets": ["Built APIs"]}],
                                         "education": [{"degree": "BE", "school": "IIT"}]}})
        assert r.status_code == 200
        rid = r.json()["id"]
        ex = requests.get(f"{api}/resumes/{rid}/export/txt", headers=pro_seeker["headers"])
        assert ex.status_code == 200, ex.text
        # FastAPI PlainTextResponse uses text/plain
        assert ex.headers.get("content-type", "").startswith("text/plain")
        assert "attachment" in ex.headers.get("content-disposition", "").lower()
        body_text = ex.text
        assert "JANE SMITH" in body_text
        assert "SUMMARY" in body_text
        assert "EXPERIENCE" in body_text
        assert "SKILLS" in body_text
        assert "Python" in body_text

    def test_txt_export_requires_auth(self, api, pro_seeker):
        r = requests.post(f"{api}/resumes", headers=pro_seeker["headers"],
                          json={"name": "TEST_TxtAuth",
                                "data": {"personal": {"fullName": "X"}}})
        rid = r.json()["id"]
        ex = requests.get(f"{api}/resumes/{rid}/export/txt")
        assert ex.status_code == 401

    def test_txt_export_404(self, api, pro_seeker):
        ex = requests.get(f"{api}/resumes/nonexistent/export/txt",
                          headers=pro_seeker["headers"])
        assert ex.status_code == 404


# ──────────────────────── public settings (regression) ────────────────────────
class TestPublicSettings:
    def test_settings_public(self, api):
        r = requests.get(f"{api}/settings/public")
        assert r.status_code == 200
        body = r.json()
        assert isinstance(body, dict)
