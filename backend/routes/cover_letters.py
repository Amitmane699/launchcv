"""Cover letter generation routes."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import Optional
from db import resumes, cover_letters
from auth_utils import get_current_user
from services.cover_letter import generate_cover_letter, TEMPLATES

router = APIRouter(prefix="/cover-letters", tags=["cover-letters"])


class CoverLetterIn(BaseModel):
    resume_id: str
    job_title: str
    company_name: str
    template_id: Optional[str] = "professional"
    custom_note: Optional[str] = None


class CoverLetterSave(BaseModel):
    title: Optional[str] = "Cover Letter"
    content: str
    resume_id: Optional[str] = None
    job_title: Optional[str] = None
    company_name: Optional[str] = None


@router.get("/templates")
async def list_templates():
    return [{"id": k, **v} for k, v in TEMPLATES.items()]


@router.post("/generate")
async def generate(payload: CoverLetterIn, user=Depends(get_current_user)):
    resume = await resumes.find_one({"id": payload.resume_id, "user_id": user["id"]}, {"_id": 0})
    if not resume:
        raise HTTPException(404, "Resume not found.")
    resume_data = resume.get("data") or {}
    text = generate_cover_letter(
        resume_data=resume_data,
        job_title=payload.job_title,
        company_name=payload.company_name,
        template_id=payload.template_id,
        custom_note=payload.custom_note,
    )
    return {"content": text, "template_id": payload.template_id}


@router.post("")
async def save_cover_letter(payload: CoverLetterSave, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "title": payload.title or "Cover Letter",
        "content": payload.content,
        "resume_id": payload.resume_id,
        "job_title": payload.job_title,
        "company_name": payload.company_name,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await cover_letters.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("")
async def list_cover_letters(user=Depends(get_current_user)):
    docs = await cover_letters.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs


@router.put("/{cl_id}")
async def update_cover_letter(cl_id: str, payload: CoverLetterSave, user=Depends(get_current_user)):
    result = await cover_letters.update_one(
        {"id": cl_id, "user_id": user["id"]},
        {"$set": {
            "content": payload.content,
            "title": payload.title,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
    )
    if result.matched_count == 0:
        raise HTTPException(404, "Not found.")
    return {"success": True}


@router.delete("/{cl_id}")
async def delete_cover_letter(cl_id: str, user=Depends(get_current_user)):
    await cover_letters.delete_one({"id": cl_id, "user_id": user["id"]})
    return {"success": True}
