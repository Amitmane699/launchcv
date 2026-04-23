"""Multi-JD comparator — compare a resume against up to 3 job descriptions simultaneously."""
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List
from db import resumes
from auth_utils import get_current_user
from engine.ats_score import score_resume

router = APIRouter(prefix="/ats", tags=["ats-compare"])


class CompareIn(BaseModel):
    resume_id: str
    jds: List[str] = Field(..., min_items=1, max_items=3)
    titles: List[str] = Field(default=[], max_items=3)


@router.post("/compare")
async def compare_jds(payload: CompareIn, user=Depends(get_current_user)):
    """Compare resume against up to 3 JDs in one shot."""
    resume = await resumes.find_one({"id": payload.resume_id, "user_id": user["id"]}, {"_id": 0})
    if not resume:
        raise HTTPException(404, "Resume not found.")

    resume_data = resume.get("data") or {}
    results = []
    for i, jd in enumerate(payload.jds):
        title = payload.titles[i] if i < len(payload.titles) else f"Job {i + 1}"
        result = score_resume(resume_data, jd)
        results.append({
            "title": title,
            "score": result["score"],
            "breakdown": result["breakdown"],
            "matchedKeywords": result["matchedKeywords"],
            "missingKeywords": result["missingKeywords"][:10],
            "suggestions": result["suggestions"][:3],
        })

    # Rank by score
    results.sort(key=lambda x: x["score"], reverse=True)
    best = results[0]["title"] if results else None

    return {
        "results": results,
        "bestMatch": best,
        "summary": f"Best match: {best} ({results[0]['score']}/100)" if best else "No results",
    }
