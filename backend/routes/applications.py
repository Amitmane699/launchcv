"""Manual application tracker (Kanban)."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any
from db import applications
from auth_utils import get_current_user

router = APIRouter(prefix="/applications", tags=["applications"])


class AppIn(BaseModel):
    company: str
    role: str
    status: str = "wishlist"
    resume_id: Optional[str] = None
    job_listing_id: Optional[str] = None
    jd_url: Optional[str] = None
    jd_text: Optional[str] = None
    deadline: Optional[str] = None
    salary_exp: Optional[int] = None
    notes: Optional[str] = None
    checklist: Optional[Dict[str, bool]] = None


@router.get("")
async def list_apps(user=Depends(get_current_user)):
    docs = await applications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@router.post("")
async def create_app(payload: AppIn, user=Depends(get_current_user)):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "resume_id": payload.resume_id,
        "job_listing_id": payload.job_listing_id,
        "company": payload.company,
        "role": payload.role,
        "status": payload.status,
        "jd_url": payload.jd_url,
        "jd_text": payload.jd_text,
        "deadline": payload.deadline,
        "salary_exp": payload.salary_exp,
        "notes": payload.notes,
        "checklist": payload.checklist or {
            "companyResearch": False, "starAnswers": False,
            "questionsToAsk": False, "glassdoorCheck": False,
        },
        "reminder_sent": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await applications.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.put("/{app_id}")
async def update_app(app_id: str, payload: Dict[str, Any], user=Depends(get_current_user)):
    allowed = {"company", "role", "status", "resume_id", "job_listing_id",
               "jd_url", "jd_text", "deadline", "salary_exp", "notes", "checklist"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await applications.update_one({"id": app_id, "user_id": user["id"]}, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    doc = await applications.find_one({"id": app_id}, {"_id": 0})
    return doc


@router.delete("/{app_id}")
async def delete_app(app_id: str, user=Depends(get_current_user)):
    await applications.delete_one({"id": app_id, "user_id": user["id"]})
    return {"success": True}
