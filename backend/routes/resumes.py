"""Resume CRUD, sharing, drafts, export."""
import uuid
import io
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import StreamingResponse, PlainTextResponse
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from db import resumes, resume_drafts, users
from auth_utils import get_current_user, PLAN_FEATURES
from engine.ats_score import completion_pct

router = APIRouter(prefix="/resumes", tags=["resumes"])

DEFAULT_SECTION_ORDER = ["summary", "experience", "skills", "education", "projects", "certifications", "languages", "hobbies"]

DEFAULT_DATA = {
    "personal": {"fullName": "", "email": "", "phone": "", "location": "", "linkedin": "", "website": ""},
    "summary": "",
    "experience": [],
    "skills": [],
    "education": [],
    "projects": [],
    "certifications": [],
    "languages": [],
    "hobbies": [],
}


class ResumeIn(BaseModel):
    name: Optional[str] = "My Resume"
    template_id: Optional[str] = "classic"
    data: Optional[Dict[str, Any]] = None
    section_order: Optional[List[str]] = None


def _clean(doc):
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_resumes(user=Depends(get_current_user)):
    docs = await resumes.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return docs


@router.post("")
async def create_resume(payload: ResumeIn, user=Depends(get_current_user)):
    plan_features = PLAN_FEATURES.get(user["plan"], PLAN_FEATURES["free"])
    max_r = plan_features.get("maxResumes", 1)
    existing_count = await resumes.count_documents({"user_id": user["id"]})
    if existing_count >= max_r:
        raise HTTPException(403, {"error": "upgrade_required", "message": f"Free plan allows {max_r} resume(s). Upgrade to add more.", "upgradeUrl": "/pricing"})

    rid = str(uuid.uuid4())
    data = payload.data or DEFAULT_DATA.copy()
    # Pre-fill personal from user
    if isinstance(data, dict):
        data.setdefault("personal", {})
        data["personal"].setdefault("fullName", user.get("name") or "")
        data["personal"].setdefault("email", user.get("email") or "")
        data["personal"].setdefault("phone", user.get("phone") or "")

    doc = {
        "id": rid,
        "user_id": user["id"],
        "name": payload.name or "My Resume",
        "template_id": payload.template_id or "classic",
        "section_order": payload.section_order or DEFAULT_SECTION_ORDER,
        "data": data,
        "completion_pct": completion_pct(data) if isinstance(data, dict) else 0,
        "share_token": None,
        "share_expiry": None,
        "share_password": None,
        "is_public": False,
        "is_flagged": False,
        "flagged_reason": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await resumes.insert_one(doc)
    return _clean(doc)


@router.get("/{resume_id}")
async def get_resume(resume_id: str, user=Depends(get_current_user)):
    doc = await resumes.find_one({"id": resume_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@router.put("/{resume_id}")
async def update_resume(resume_id: str, payload: ResumeIn, user=Depends(get_current_user)):
    existing = await resumes.find_one({"id": resume_id, "user_id": user["id"]})
    if not existing:
        raise HTTPException(404, "Not found")
    updates = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if payload.name is not None:
        updates["name"] = payload.name
    if payload.template_id is not None:
        updates["template_id"] = payload.template_id
    if payload.data is not None:
        updates["data"] = payload.data
        updates["completion_pct"] = completion_pct(payload.data)
    if payload.section_order is not None:
        updates["section_order"] = payload.section_order
    await resumes.update_one({"id": resume_id}, {"$set": updates})
    doc = await resumes.find_one({"id": resume_id}, {"_id": 0})
    # Async graph rebuild (fire-and-forget — don't block the save response)
    try:
        from routes.career_graph import build_graph_from_resume
        from db import career_graphs as _cg
        import asyncio
        all_docs = await resumes.find({"user_id": user["id"]}, {"_id": 0}).sort("updated_at", -1).to_list(10)
        all_nodes: dict = {}
        all_edges: list = []
        seen_edges: set = set()
        for rd in all_docs:
            g = build_graph_from_resume(rd)
            for n in g["nodes"]:
                if n["id"] not in all_nodes:
                    all_nodes[n["id"]] = n
            for e in g["edges"]:
                k = f"{e['source']}_{e['target']}_{e['relation']}"
                if k not in seen_edges:
                    seen_edges.add(k)
                    all_edges.append(e)
        from datetime import datetime, timezone as tz
        await _cg.update_one({"user_id": user["id"]}, {"$set": {
            "user_id": user["id"], "nodes": list(all_nodes.values()), "edges": all_edges,
            "node_count": len(all_nodes), "edge_count": len(all_edges),
            "built_at": datetime.now(tz.utc).isoformat(),
        }}, upsert=True)
    except Exception:
        pass  # Graph rebuild is best-effort — never fail a save
    return doc


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, user=Depends(get_current_user)):
    res = await resumes.delete_one({"id": resume_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(404, "Not found")
    return {"success": True}


@router.post("/{resume_id}/duplicate")
async def duplicate_resume(resume_id: str, user=Depends(get_current_user)):
    src = await resumes.find_one({"id": resume_id, "user_id": user["id"]}, {"_id": 0})
    if not src:
        raise HTTPException(404, "Not found")
    plan_features = PLAN_FEATURES.get(user["plan"], PLAN_FEATURES["free"])
    max_r = plan_features.get("maxResumes", 1)
    existing_count = await resumes.count_documents({"user_id": user["id"]})
    if existing_count >= max_r:
        raise HTTPException(403, {"error": "upgrade_required", "message": "Resume limit reached"})
    src["id"] = str(uuid.uuid4())
    src["name"] = (src.get("name") or "Resume") + " (Copy)"
    src["share_token"] = None
    src["is_public"] = False
    src["created_at"] = datetime.now(timezone.utc).isoformat()
    src["updated_at"] = src["created_at"]
    await resumes.insert_one(src)
    src.pop("_id", None)
    return src


@router.post("/{resume_id}/share")
async def share_resume(resume_id: str, user=Depends(get_current_user)):
    plan_features = PLAN_FEATURES.get(user["plan"], PLAN_FEATURES["free"])
    if not plan_features.get("shareLink"):
        raise HTTPException(403, {"error": "upgrade_required", "feature": "shareLink", "upgradeUrl": "/pricing"})
    token = uuid.uuid4().hex[:16]
    await resumes.update_one(
        {"id": resume_id, "user_id": user["id"]},
        {"$set": {"share_token": token, "is_public": True}},
    )
    return {"share_token": token, "url": f"/r/{token}"}


@router.delete("/{resume_id}/share")
async def unshare_resume(resume_id: str, user=Depends(get_current_user)):
    await resumes.update_one(
        {"id": resume_id, "user_id": user["id"]},
        {"$set": {"share_token": None, "is_public": False}},
    )
    return {"success": True}


@router.get("/public/{share_token}")
async def get_public_resume(share_token: str):
    doc = await resumes.find_one({"share_token": share_token, "is_public": True, "is_flagged": False}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    return doc


@router.post("/{resume_id}/draft")
async def save_draft(resume_id: str, payload: Dict[str, Any], user=Depends(get_current_user)):
  
    await resume_drafts.update_one(
        {"user_id": user["id"], "resume_id": resume_id},
        {"$set": {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "resume_id": resume_id,
            "data": payload,
            "saved_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"success": True}


@router.get("/{resume_id}/draft")
async def get_draft(resume_id: str, user=Depends(get_current_user)):
    doc = await resume_drafts.find_one({"user_id": user["id"], "resume_id": resume_id}, {"_id": 0})
    return doc or {}


@router.post("/{resume_id}/export/docx")
async def export_docx(resume_id: str, user=Depends(get_current_user)):
    """DOCX export — available from Resume Pro plan upward."""
    from services.docx_export import build_resume_docx

    doc = await resumes.find_one({"id": resume_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")

    plan_features = PLAN_FEATURES.get(user["plan"], PLAN_FEATURES["free"])
    if not plan_features.get("docxExport"):
        raise HTTPException(403, {"error": "upgrade_required", "message": "DOCX export requires Resume Pro or higher.", "upgradeUrl": "/pricing"})

    docx_bytes = build_resume_docx(doc)
    return StreamingResponse(
        io.BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{doc.get("name", "resume").replace(" ", "_")}.docx"'},
    )


@router.post("/{resume_id}/export/pdf")
async def export_pdf(resume_id: str, user=Depends(get_current_user)):
    """Simple PDF export using ReportLab."""
    from services.pdf_export import build_resume_pdf

    doc = await resumes.find_one({"id": resume_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")

    plan_features = PLAN_FEATURES.get(user["plan"], PLAN_FEATURES["free"])
    max_dl = plan_features.get("maxDownloads", 1)
    if max_dl < 9999 and user.get("downloads_used", 0) >= max_dl:
        raise HTTPException(403, {"error": "upgrade_required", "message": "Download limit reached. Upgrade or buy a single download.", "upgradeUrl": "/pricing"})

    pdf_bytes = build_resume_pdf(doc, watermark=(user["plan"] == "free"))
    await users.update_one({"id": user["id"]}, {"$inc": {"downloads_used": 1}})

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{doc.get("name", "resume").replace(" ", "_")}.pdf"'},
    )


@router.get("/{resume_id}/export/txt")
async def export_txt(resume_id: str, user=Depends(get_current_user)):
    """Plain-text export — most ATS-friendly format."""
    doc = await resumes.find_one({"id": resume_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Not found")
    d = doc.get("data") or {}
    p = d.get("personal") or {}
    lines: List[str] = []
    if p.get("fullName"): lines.append(p["fullName"].upper())
    contact = [x for x in [p.get("email"), p.get("phone"), p.get("location"), p.get("linkedin")] if x]
    if contact: lines.append(" | ".join(contact))
    lines.append("")

    order = doc.get("section_order") or ["summary", "experience", "skills", "education", "projects", "certifications"]
    for sec in order:
        if sec == "summary" and d.get("summary"):
            lines += ["SUMMARY", "-" * 40, d["summary"], ""]
        elif sec == "experience" and d.get("experience"):
            lines += ["EXPERIENCE", "-" * 40]
            for e in d["experience"]:
                lines.append(f"{e.get('role', '')} — {e.get('company', '')}")
                if e.get("duration"): lines.append(e["duration"])
                for b in e.get("bullets") or []:
                    lines.append(f"- {b}")
                lines.append("")
        elif sec == "skills" and d.get("skills"):
            lines += ["SKILLS", "-" * 40, ", ".join(d["skills"]), ""]
        elif sec == "education" and d.get("education"):
            lines += ["EDUCATION", "-" * 40]
            for e in d["education"]:
                lines.append(f"{e.get('degree', '')} — {e.get('school', '')}")
                if e.get("duration"): lines.append(e["duration"])
                lines.append("")
        elif sec == "projects" and d.get("projects"):
            lines += ["PROJECTS", "-" * 40]
            for pr in d["projects"]:
                lines.append(pr.get("name", ""))
                if pr.get("description"): lines.append(pr["description"])
                for b in pr.get("bullets") or []:
                    lines.append(f"- {b}")
                lines.append("")
    txt = "\n".join(lines)
    return PlainTextResponse(txt, headers={
        "Content-Disposition": f'attachment; filename="{doc.get("name", "resume").replace(" ", "_")}.txt"',
    })


@router.post("/parse-upload")
async def parse_upload(file: UploadFile = File(...), user=Depends(get_current_user)):
    """Parse an uploaded PDF/DOCX and return structured resume data."""
    from services.resume_parser import parse_resume_bytes
    filename = (file.filename or "").lower()
    if not (filename.endswith(".pdf") or filename.endswith(".docx")):
        raise HTTPException(400, "Only .pdf and .docx files are supported")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 8 MB)")
    try:
        parsed = parse_resume_bytes(data, filename)
    except Exception as e:
        raise HTTPException(400, f"Could not parse file: {e}")
    return parsed
