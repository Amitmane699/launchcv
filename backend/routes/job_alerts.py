"""Job alerts — users subscribe, get digest emails on matching new jobs."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from db import job_alerts, job_listings
from auth_utils import get_current_user

router = APIRouter(prefix="/job-alerts", tags=["job-alerts"])


class AlertIn(BaseModel):
    keywords: Optional[str] = None
    location: Optional[str] = None
    category: Optional[str] = None
    employment_type: Optional[str] = None
    frequency: str = "daily"  # instant | daily | weekly


@router.get("")
async def list_alerts(user=Depends(get_current_user)):
    docs = await job_alerts.find({"user_id": user["id"]}, {"_id": 0}).to_list(20)
    return docs


@router.post("")
async def create_alert(payload: AlertIn, user=Depends(get_current_user)):
    existing = await job_alerts.count_documents({"user_id": user["id"]})
    if existing >= 5:
        raise HTTPException(400, "Maximum 5 alerts allowed.")
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "keywords": payload.keywords,
        "location": payload.location,
        "category": payload.category,
        "employment_type": payload.employment_type,
        "frequency": payload.frequency,
        "active": True,
        "last_sent_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await job_alerts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/{alert_id}")
async def delete_alert(alert_id: str, user=Depends(get_current_user)):
    await job_alerts.delete_one({"id": alert_id, "user_id": user["id"]})
    return {"success": True}


@router.put("/{alert_id}/toggle")
async def toggle_alert(alert_id: str, user=Depends(get_current_user)):
    doc = await job_alerts.find_one({"id": alert_id, "user_id": user["id"]})
    if not doc:
        raise HTTPException(404, "Alert not found.")
    new_state = not doc.get("active", True)
    await job_alerts.update_one({"id": alert_id}, {"$set": {"active": new_state}})
    return {"active": new_state}


@router.get("/preview/{alert_id}")
async def preview_alert(alert_id: str, user=Depends(get_current_user)):
    """Preview what jobs would match this alert right now."""
    alert = await job_alerts.find_one({"id": alert_id, "user_id": user["id"]})
    if not alert:
        raise HTTPException(404, "Alert not found.")
    q = {"is_active": True, "is_flagged": False}
    if alert.get("keywords"):
        q["$or"] = [
            {"title": {"$regex": alert["keywords"], "$options": "i"}},
            {"description": {"$regex": alert["keywords"], "$options": "i"}},
        ]
    if alert.get("location"):
        q["location"] = {"$regex": alert["location"], "$options": "i"}
    if alert.get("category"):
        q["category"] = alert["category"]
    if alert.get("employment_type"):
        q["employment_type"] = alert["employment_type"]
    docs = await job_listings.find(q, {"_id": 0, "title": 1, "company": 1, "location": 1, "id": 1}).sort("created_at", -1).limit(10).to_list(10)
    return {"matches": len(docs), "sample": docs}
