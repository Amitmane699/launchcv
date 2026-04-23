"""Public job board + applicant routes."""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from typing import Optional, List
from db import job_listings, job_applications, saved_jobs, resumes, users
from auth_utils import get_current_user, get_current_user_optional, require_feature, require_roles
from engine.ats_score import score_resume

router = APIRouter(tags=["jobs"])


# ───── PUBLIC JOBS ─────
@router.get("/jobs")
async def list_jobs(
    search: Optional[str] = None,
    location: Optional[str] = None,
    category: Optional[str] = None,
    employment_type: Optional[str] = None,
    location_type: Optional[str] = None,
    experience_min: Optional[int] = None,
    salary_min: Optional[int] = None,
    featured: Optional[bool] = None,
    page: int = 1,
    limit: int = 20,
):
    q = {"is_active": True, "is_flagged": False}
    if search:
        q["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"company": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]
    if location:
        q["location"] = {"$regex": location, "$options": "i"}
    if category:
        q["category"] = category
    if employment_type:
        q["employment_type"] = employment_type
    if location_type:
        q["location_type"] = location_type
    if experience_min is not None:
        q["experience_min"] = {"$lte": experience_min}
    if salary_min is not None:
        q["salary_max"] = {"$gte": salary_min}
    if featured:
        q["is_featured"] = True

    skip = max(0, (page - 1) * limit)
    total = await job_listings.count_documents(q)
    # Featured first, then newest
    docs = await job_listings.find(q, {"_id": 0}).sort([("is_featured", -1), ("created_at", -1)]).skip(skip).limit(limit).to_list(limit)
    return {"total": total, "page": page, "limit": limit, "items": docs}


@router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    doc = await job_listings.find_one({"id": job_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Job not found")
    return doc


@router.post("/jobs/{job_id}/view")
async def increment_view(job_id: str):
    await job_listings.update_one({"id": job_id}, {"$inc": {"views_count": 1}})
    return {"success": True}


@router.get("/jobs/{job_id}/similar")
async def similar_jobs(job_id: str):
    job = await job_listings.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    docs = await job_listings.find(
        {"id": {"$ne": job_id}, "category": job.get("category"), "is_active": True},
        {"_id": 0},
    ).sort("created_at", -1).limit(5).to_list(5)
    return docs


# ───── JOBSEEKER APPLICATIONS ─────
class ApplyIn(BaseModel):
    job_id: str
    resume_id: str
    cover_letter: Optional[str] = None


@router.post("/job-applications")
async def apply_to_job(payload: ApplyIn, user=Depends(require_feature("canApplyJobs"))):
    job = await job_listings.find_one({"id": payload.job_id, "is_active": True}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found or inactive")
    resume = await resumes.find_one({"id": payload.resume_id, "user_id": user["id"]}, {"_id": 0})
    if not resume:
        raise HTTPException(404, "Resume not found")

    existing = await job_applications.find_one({"job_id": payload.job_id, "applicant_id": user["id"]})
    if existing:
        raise HTTPException(400, "You already applied to this job")

    jd = f"{job.get('title', '')} {job.get('description', '')} {job.get('requirements', '')}"
    ats = score_resume(resume.get("data") or {}, jd)

    doc = {
        "id": str(uuid.uuid4()),
        "job_id": payload.job_id,
        "applicant_id": user["id"],
        "resume_id": payload.resume_id,
        "cover_letter": payload.cover_letter,
        "status": "applied",
        "ats_score": ats["score"],
        "employer_notes": None,
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await job_applications.insert_one(doc)
    await job_listings.update_one({"id": payload.job_id}, {"$inc": {"applications_count": 1}})
    doc.pop("_id", None)
    return doc


@router.get("/job-applications")
async def list_my_applications(user=Depends(get_current_user)):
    apps = await job_applications.find({"applicant_id": user["id"]}, {"_id": 0}).sort("applied_at", -1).to_list(200)
    # Attach job info
    job_ids = list({a["job_id"] for a in apps})
    jobs = await job_listings.find({"id": {"$in": job_ids}}, {"_id": 0}).to_list(len(job_ids))
    jobs_by_id = {j["id"]: j for j in jobs}
    for a in apps:
        a["job"] = jobs_by_id.get(a["job_id"])
    return apps


@router.put("/job-applications/{app_id}/withdraw")
async def withdraw(app_id: str, user=Depends(get_current_user)):
    await job_applications.update_one(
        {"id": app_id, "applicant_id": user["id"]},
        {"$set": {"status": "withdrawn", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"success": True}


# ───── SAVED JOBS ─────
@router.get("/saved-jobs")
async def get_saved(user=Depends(get_current_user)):
    saved = await saved_jobs.find({"user_id": user["id"]}, {"_id": 0}).sort("saved_at", -1).to_list(200)
    job_ids = [s["job_id"] for s in saved]
    jobs = await job_listings.find({"id": {"$in": job_ids}}, {"_id": 0}).to_list(len(job_ids))
    return jobs


@router.post("/saved-jobs/{job_id}")
async def save_job(job_id: str, user=Depends(get_current_user)):
    await saved_jobs.update_one(
        {"user_id": user["id"], "job_id": job_id},
        {"$set": {"user_id": user["id"], "job_id": job_id, "saved_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"success": True}


@router.delete("/saved-jobs/{job_id}")
async def unsave_job(job_id: str, user=Depends(get_current_user)):
    await saved_jobs.delete_one({"user_id": user["id"], "job_id": job_id})
    return {"success": True}
