"""Skill Gap Radar — compare user skills vs top job listings for a target role."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from db import resumes, job_listings
from auth_utils import get_current_user
from engine.skill_gap import compute_skill_gap, resolve_role, ROLE_SKILLS

router = APIRouter(prefix="/skill-gap", tags=["skill-gap"])


class RadarIn(BaseModel):
    resume_id: str
    target_role: str                  # e.g. "Frontend Developer"
    location: Optional[str] = None    # optionally filter JDs by city


@router.get("/roles")
async def list_roles():
    """Return all supported role keys so the frontend can show a picker."""
    return sorted(ROLE_SKILLS.keys())


@router.post("/analyse")
async def analyse(payload: RadarIn, user=Depends(get_current_user)):
    """
    Main endpoint.
    1. Load the user's resume skills.
    2. Pull up to 100 active job listings matching the target role.
    3. Feed both into compute_skill_gap.
    4. Return the radar data + learning path.
    """
    resume = await resumes.find_one(
        {"id": payload.resume_id, "user_id": user["id"]}, {"_id": 0}
    )
    if not resume:
        raise HTTPException(404, "Resume not found.")

    resume_data = resume.get("data") or {}
    user_skills = resume_data.get("skills") or []

    # Also extract skills mentioned in experience bullets
    for exp in resume_data.get("experience") or []:
        for bullet in exp.get("bullets") or []:
            if bullet.strip():
                user_skills.append(bullet)  # tokenizer will normalise

    role_key = resolve_role(payload.target_role)
    if not role_key:
        raise HTTPException(
            400,
            {
                "error": "unknown_role",
                "message": f"Role '{payload.target_role}' not recognised. Try: frontend, backend, fullstack, data science, devops, mobile, machine learning, product manager, ui/ux designer, sales, hr, marketing",
                "supported": sorted(ROLE_SKILLS.keys()),
            },
        )

    # Pull real JDs from the job board
    q: dict = {"is_active": True, "is_flagged": False}
    role_terms = payload.target_role.lower().split()
    # Build a regex OR across the role title words
    q["$or"] = [
        {"title":       {"$regex": payload.target_role, "$options": "i"}},
        {"description": {"$regex": role_key,            "$options": "i"}},
    ]
    if payload.location:
        q["location"] = {"$regex": payload.location, "$options": "i"}

    jd_docs = await job_listings.find(q, {"_id": 0, "description": 1, "title": 1}).limit(100).to_list(100)
    jd_texts = [
        (d.get("title") or "") + " " + (d.get("description") or "")
        for d in jd_docs
    ]

    result = compute_skill_gap(
        user_skills=user_skills,
        role_key=role_key,
        job_descriptions=jd_texts,
        top_n_from_jds=40,
    )
    result["target_role"]  = payload.target_role
    result["role_key"]     = role_key
    result["jds_analysed"] = len(jd_texts)
    # Don't expose full JD text in response
    return result


@router.get("/role-skills/{role_key}")
async def role_skill_list(role_key: str):
    """Return the full skill list for a given role — no auth needed (public)."""
    from engine.skill_gap import ROLE_SKILLS
    skills = ROLE_SKILLS.get(role_key.lower())
    if not skills:
        raise HTTPException(404, f"Role '{role_key}' not found.")
    return {"role": role_key, "skills": skills}
