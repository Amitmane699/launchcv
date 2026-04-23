"""ATS scoring endpoints."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from db import resumes, ats_score_history, users
from auth_utils import get_current_user, PLAN_FEATURES
from engine.ats_score import score_resume, extract_keywords

router = APIRouter(prefix="/ats", tags=["ats"])


class ScoreIn(BaseModel):
    resume_id: str
    jd: str


class MultiJDIn(BaseModel):
    resume_id: str
    jds: List[str]


@router.post("/score")
async def score(payload: ScoreIn, user=Depends(get_current_user)):
    features = PLAN_FEATURES.get(user["plan"], PLAN_FEATURES["free"])
    limit = features.get("atsChecksPerMonth", 3)
    if limit < 9999 and user.get("ats_checks_this_month", 0) >= limit:
        raise HTTPException(403, {"error": "upgrade_required", "message": f"ATS check limit ({limit}/month) reached.", "upgradeUrl": "/pricing"})

    doc = await resumes.find_one({"id": payload.resume_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Resume not found")

    result = score_resume(doc.get("data") or {}, payload.jd)

    await ats_score_history.insert_one({
        "id": str(uuid.uuid4()),
        "resume_id": payload.resume_id,
        "score": result["score"],
        "jd_snapshot": payload.jd[:2000],
        "matched_keywords": result["matchedKeywords"],
        "missing_keywords": result["missingKeywords"],
        "suggestions": result["suggestions"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    await users.update_one({"id": user["id"]}, {"$inc": {"ats_checks_this_month": 1}})
    return result


@router.post("/multi-jd")
async def multi_jd(payload: MultiJDIn, user=Depends(get_current_user)):
    features = PLAN_FEATURES.get(user["plan"], PLAN_FEATURES["free"])
    if not features.get("allTemplates"):  # multi-jd is Pro feature
        raise HTTPException(403, {"error": "upgrade_required", "feature": "multiJD"})
    if len(payload.jds) > 3:
        raise HTTPException(400, "Max 3 JDs")
    doc = await resumes.find_one({"id": payload.resume_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Resume not found")
    return [{"jd_index": i, **score_resume(doc.get("data") or {}, jd)} for i, jd in enumerate(payload.jds)]


@router.get("/history/{resume_id}")
async def history(resume_id: str, user=Depends(get_current_user)):
    own = await resumes.find_one({"id": resume_id, "user_id": user["id"]}, {"_id": 0, "id": 1})
    if not own:
        raise HTTPException(404, "Resume not found")
    docs = await ats_score_history.find({"resume_id": resume_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs


class ExtractIn(BaseModel):
    jd: str


@router.post("/extract-keywords")
async def extract(payload: ExtractIn, user=Depends(get_current_user)):
    return {"keywords": extract_keywords(payload.jd, top_n=40)}


class SelfCheckIn(BaseModel):
    resume_id: str


@router.post("/self-check")
async def self_check_resume(payload: SelfCheckIn, user=Depends(get_current_user)):
    """Resume-only rule-based ATS check (no JD required)."""
    from engine.self_check import self_check
    doc = await resumes.find_one({"id": payload.resume_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Resume not found")
    return self_check(doc.get("data") or {})
