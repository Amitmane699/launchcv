"""Employer routes: post/manage jobs + applicants."""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import Optional, List
import io
import csv
from db import job_listings, job_applications, users, resumes
from auth_utils import require_roles, get_current_user

router = APIRouter(prefix="/employer", tags=["employer"])


class JobIn(BaseModel):
    title: str
    company: str
    location: str
    location_type: str = "onsite"
    employment_type: str = "fulltime"
    experience_min: int = 0
    experience_max: Optional[int] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: str
    requirements: Optional[str] = None
    skills_required: List[str] = []
    category: str
    subcategory: Optional[str] = None
    application_email: Optional[str] = None
    apply_on_platform: bool = True


@router.post("/jobs")
async def post_job(payload: JobIn, user=Depends(require_roles("employer", "admin", "superadmin"))):
    now = datetime.now(timezone.utc)
    doc = {
        "id": str(uuid.uuid4()),
        "employer_id": user["id"],
        "company_logo_url": None,
        "salary_currency": "INR",
        "is_active": False,  # becomes active after mock payment
        "is_featured": False,
        "is_verified": False,
        "is_flagged": False,
        "flagged_reason": None,
        "admin_note": None,
        "featured_until": None,
        "expires_at": (now + timedelta(days=30)).isoformat(),
        "application_url": None,
        "views_count": 0,
        "applications_count": 0,
        "payment_txn_id": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        **payload.model_dump(),
    }
    await job_listings.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.get("/jobs")
async def my_jobs(user=Depends(require_roles("employer", "admin", "superadmin"))):
    q = {} if user["role"] in ("admin", "superadmin") else {"employer_id": user["id"]}
    docs = await job_listings.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@router.put("/jobs/{job_id}")
async def update_job(job_id: str, payload: JobIn, user=Depends(require_roles("employer", "admin", "superadmin"))):
    q = {"id": job_id}
    if user["role"] == "employer":
        q["employer_id"] = user["id"]
    updates = payload.model_dump()
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await job_listings.update_one(q, {"$set": updates})
    if res.matched_count == 0:
        raise HTTPException(404, "Not found")
    return {"success": True}


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str, user=Depends(require_roles("employer", "admin", "superadmin"))):
    q = {"id": job_id}
    if user["role"] == "employer":
        q["employer_id"] = user["id"]
    await job_listings.delete_one(q)
    return {"success": True}


@router.get("/jobs/{job_id}/applicants")
async def get_applicants(job_id: str, user=Depends(require_roles("employer", "admin", "superadmin"))):
    job_q = {"id": job_id}
    if user["role"] == "employer":
        job_q["employer_id"] = user["id"]
    job = await job_listings.find_one(job_q, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    apps = await job_applications.find({"job_id": job_id}, {"_id": 0}).sort("applied_at", -1).to_list(500)
    # Enrich with user + resume
    uids = list({a["applicant_id"] for a in apps})
    people = await users.find({"id": {"$in": uids}}, {"_id": 0, "password_hash": 0}).to_list(len(uids))
    people_by_id = {p["id"]: p for p in people}
    for a in apps:
        u = people_by_id.get(a["applicant_id"]) or {}
        a["applicant_name"] = u.get("name")
        a["applicant_email"] = u.get("email")
        a["applicant_phone"] = u.get("phone")
    return apps


class ApplicantUpdate(BaseModel):
    status: Optional[str] = None
    employer_notes: Optional[str] = None


@router.put("/applicants/{app_id}")
async def update_applicant(app_id: str, payload: ApplicantUpdate, user=Depends(require_roles("employer", "admin", "superadmin"))):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await job_applications.update_one({"id": app_id}, {"$set": updates})
    return {"success": True}


@router.post("/jobs/{job_id}/renew")
async def renew(job_id: str, user=Depends(require_roles("employer", "admin", "superadmin"))):
    new_exp = datetime.now(timezone.utc) + timedelta(days=30)
    await job_listings.update_one(
        {"id": job_id, "employer_id": user["id"]},
        {"$set": {"expires_at": new_exp.isoformat(), "is_active": True}},
    )
    return {"success": True, "expires_at": new_exp.isoformat()}


@router.post("/jobs/{job_id}/feature")
async def feature_job(job_id: str, user=Depends(require_roles("employer", "admin", "superadmin"))):
    until = datetime.now(timezone.utc) + timedelta(days=30)
    await job_listings.update_one(
        {"id": job_id, "employer_id": user["id"]},
        {"$set": {"is_featured": True, "featured_until": until.isoformat()}},
    )
    return {"success": True}


@router.get("/analytics")
async def employer_analytics(user=Depends(require_roles("employer", "admin", "superadmin"))):
    q = {} if user["role"] in ("admin", "superadmin") else {"employer_id": user["id"]}
    jobs = await job_listings.find(q, {"_id": 0}).to_list(1000)
    total_views = sum(j.get("views_count", 0) for j in jobs)
    total_apps = sum(j.get("applications_count", 0) for j in jobs)
    active = sum(1 for j in jobs if j.get("is_active"))
    return {
        "total_jobs": len(jobs),
        "active_jobs": active,
        "total_views": total_views,
        "total_applications": total_apps,
        "conversion": round((total_apps / total_views * 100) if total_views else 0, 2),
        "by_job": [{"title": j["title"], "views": j.get("views_count", 0), "apps": j.get("applications_count", 0)} for j in jobs[:10]],
    }
