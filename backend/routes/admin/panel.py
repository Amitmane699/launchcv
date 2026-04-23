"""Admin routes: users, resumes, jobs, payments, subscriptions, settings, logs."""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query, Request
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from db import (
    users, resumes, job_listings, job_applications, payments,
    admin_logs, platform_settings, applications, ats_score_history,
)
from auth_utils import require_roles, log_admin_action, hash_password

router = APIRouter(prefix="/admin", tags=["admin"])


def admin_dep():
    return require_roles("admin", "superadmin")


def superadmin_dep():
    return require_roles("superadmin")


# ───── DASHBOARD ─────
@router.get("/stats")
async def stats(user=Depends(admin_dep())):
    total_users = await users.count_documents({})
    active_subs = await users.count_documents({"plan": {"$nin": ["free"]}})
    total_jobs = await job_listings.count_documents({})
    active_jobs = await job_listings.count_documents({"is_active": True})
    total_apps = await job_applications.count_documents({})
    total_resumes = await resumes.count_documents({})
    paid = await payments.find({"status": "paid"}, {"_id": 0, "amount_paise": 1}).to_list(10000)
    total_revenue = sum(p["amount_paise"] for p in paid) / 100
    pending_payments = await payments.count_documents({"status": "pending"})
    flagged_jobs = await job_listings.count_documents({"is_flagged": True})
    flagged_resumes = await resumes.count_documents({"is_flagged": True})
    return {
        "total_users": total_users,
        "active_subscriptions": active_subs,
        "total_revenue_inr": total_revenue,
        "active_jobs": active_jobs,
        "total_jobs": total_jobs,
        "total_applications": total_apps,
        "total_resumes": total_resumes,
        "pending_payments": pending_payments,
        "flagged_jobs": flagged_jobs,
        "flagged_resumes": flagged_resumes,
    }


@router.get("/revenue/summary")
async def revenue_summary(user=Depends(admin_dep())):
    paid = await payments.find({"status": "paid"}, {"_id": 0}).to_list(10000)
    by_type: Dict[str, Dict[str, float]] = {}
    by_month: Dict[str, float] = {}
    for p in paid:
        t = p.get("type", "unknown")
        amt = p.get("amount_paise", 0) / 100
        by_type.setdefault(t, {"count": 0, "total_inr": 0})
        by_type[t]["count"] += 1
        by_type[t]["total_inr"] += amt
        month = (p.get("created_at") or "")[:7]
        by_month[month] = by_month.get(month, 0) + amt
    return {
        "byType": [{"type": k, **v} for k, v in sorted(by_type.items(), key=lambda x: -x[1]["total_inr"])],
        "byMonth": [{"month": k, "revenue_inr": v} for k, v in sorted(by_month.items())],
    }


@router.get("/signups/daily")
async def signups_daily(days: int = 30, user=Depends(admin_dep())):
    since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    all_users = await users.find({"created_at": {"$gte": since}}, {"_id": 0, "created_at": 1, "plan": 1}).to_list(5000)
    by_day: Dict[str, int] = {}
    by_plan: Dict[str, int] = {}
    for u in all_users:
        d = (u.get("created_at") or "")[:10]
        by_day[d] = by_day.get(d, 0) + 1
        p = u.get("plan", "free")
        by_plan[p] = by_plan.get(p, 0) + 1
    return {
        "daily": [{"date": k, "count": v} for k, v in sorted(by_day.items())],
        "by_plan": [{"plan": k, "count": v} for k, v in by_plan.items()],
    }


# ───── USERS ─────
@router.get("/users")
async def admin_list_users(
    search: Optional[str] = None, role: Optional[str] = None,
    plan: Optional[str] = None, is_active: Optional[bool] = None,
    page: int = 1, limit: int = 50, user=Depends(admin_dep()),
):
    q: Dict[str, Any] = {}
    if search:
        q["$or"] = [{"email": {"$regex": search, "$options": "i"}}, {"name": {"$regex": search, "$options": "i"}}]
    if role:
        q["role"] = role
    if plan:
        q["plan"] = plan
    if is_active is not None:
        q["is_active"] = is_active
    total = await users.count_documents(q)
    skip = max(0, (page - 1) * limit)
    docs = await users.find(q, {"_id": 0, "password_hash": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"total": total, "page": page, "limit": limit, "items": docs}


@router.get("/users/{user_id}")
async def admin_user_detail(user_id: str, user=Depends(admin_dep())):
    u = await users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(404, "Not found")
    r_count = await resumes.count_documents({"user_id": user_id})
    a_count = await applications.count_documents({"user_id": user_id})
    p_count = await job_applications.count_documents({"applicant_id": user_id})
    pay_total = await payments.find({"user_id": user_id, "status": "paid"}, {"_id": 0, "amount_paise": 1}).to_list(500)
    return {
        **u,
        "resume_count": r_count,
        "manual_applications": a_count,
        "platform_applications": p_count,
        "lifetime_value_inr": sum(p.get("amount_paise", 0) for p in pay_total) / 100,
    }


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    plan: Optional[str] = None
    plan_expiry: Optional[str] = None
    is_active: Optional[bool] = None


@router.put("/users/{user_id}")
async def admin_update_user(user_id: str, payload: UserUpdate, request: Request, user=Depends(admin_dep())):
    old = await users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not old:
        raise HTTPException(404, "Not found")
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    await users.update_one({"id": user_id}, {"$set": updates})
    await log_admin_action(user["id"], "update_user", "user", user_id, old, updates, request.client.host if request.client else None)
    return {"success": True}


@router.delete("/users/{user_id}")
async def admin_delete_user(user_id: str, request: Request, user=Depends(admin_dep())):
    if user_id == user["id"]:
        raise HTTPException(400, "Cannot delete yourself")
    old = await users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    await users.delete_one({"id": user_id})
    await resumes.delete_many({"user_id": user_id})
    await applications.delete_many({"user_id": user_id})
    await log_admin_action(user["id"], "delete_user", "user", user_id, old, None, request.client.host if request.client else None)
    return {"success": True}


class GrantPlan(BaseModel):
    plan: str
    days: int = 30


@router.post("/users/{user_id}/grant-plan")
async def grant_plan(user_id: str, payload: GrantPlan, request: Request, user=Depends(admin_dep())):
    expiry = datetime.now(timezone.utc) + timedelta(days=payload.days)
    await users.update_one({"id": user_id}, {"$set": {"plan": payload.plan, "plan_expiry": expiry.isoformat()}})
    await log_admin_action(user["id"], "grant_plan", "user", user_id, None, payload.model_dump(), request.client.host if request.client else None)
    return {"success": True, "plan_expiry": expiry.isoformat()}


@router.post("/users/{user_id}/revoke-plan")
async def revoke_plan(user_id: str, request: Request, user=Depends(admin_dep())):
    await users.update_one({"id": user_id}, {"$set": {"plan": "free", "plan_expiry": None}})
    await log_admin_action(user["id"], "revoke_plan", "user", user_id, None, None, request.client.host if request.client else None)
    return {"success": True}


class ResetPw(BaseModel):
    new_password: str


@router.post("/users/{user_id}/reset-password")
async def reset_pw(user_id: str, payload: ResetPw, request: Request, user=Depends(admin_dep())):
    await users.update_one({"id": user_id}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    await log_admin_action(user["id"], "reset_password", "user", user_id, None, None, request.client.host if request.client else None)
    return {"success": True}


# ───── RESUMES ─────
@router.get("/resumes")
async def admin_list_resumes(user_id: Optional[str] = None, is_flagged: Optional[bool] = None,
                              page: int = 1, limit: int = 50, user=Depends(admin_dep())):
    q: Dict[str, Any] = {}
    if user_id:
        q["user_id"] = user_id
    if is_flagged is not None:
        q["is_flagged"] = is_flagged
    total = await resumes.count_documents(q)
    skip = max(0, (page - 1) * limit)
    docs = await resumes.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    uids = list({d["user_id"] for d in docs})
    people = await users.find({"id": {"$in": uids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(len(uids))
    by_id = {p["id"]: p for p in people}
    for d in docs:
        u = by_id.get(d["user_id"]) or {}
        d["user_name"] = u.get("name")
        d["user_email"] = u.get("email")
    return {"total": total, "items": docs}


@router.delete("/resumes/{resume_id}")
async def admin_delete_resume(resume_id: str, request: Request, user=Depends(admin_dep())):
    old = await resumes.find_one({"id": resume_id}, {"_id": 0})
    await resumes.delete_one({"id": resume_id})
    await log_admin_action(user["id"], "delete_resume", "resume", resume_id, old, None, request.client.host if request.client else None)
    return {"success": True}


class FlagIn(BaseModel):
    reason: str


@router.post("/resumes/{resume_id}/flag")
async def flag_resume(resume_id: str, payload: FlagIn, request: Request, user=Depends(admin_dep())):
    await resumes.update_one({"id": resume_id}, {"$set": {
        "is_flagged": True, "flagged_reason": payload.reason,
        "share_token": None, "is_public": False,
    }})
    await log_admin_action(user["id"], "flag_resume", "resume", resume_id, None, payload.model_dump(), request.client.host if request.client else None)
    return {"success": True}


@router.post("/resumes/{resume_id}/unflag")
async def unflag_resume(resume_id: str, request: Request, user=Depends(admin_dep())):
    await resumes.update_one({"id": resume_id}, {"$set": {"is_flagged": False, "flagged_reason": None}})
    await log_admin_action(user["id"], "unflag_resume", "resume", resume_id, None, None, request.client.host if request.client else None)
    return {"success": True}


# ───── JOBS ─────
@router.get("/jobs")
async def admin_list_jobs(status: Optional[str] = None, is_flagged: Optional[bool] = None,
                           is_verified: Optional[bool] = None, page: int = 1, limit: int = 50,
                           user=Depends(admin_dep())):
    q: Dict[str, Any] = {}
    if status == "active":
        q["is_active"] = True
    elif status == "inactive":
        q["is_active"] = False
    if is_flagged is not None:
        q["is_flagged"] = is_flagged
    if is_verified is not None:
        q["is_verified"] = is_verified
    total = await job_listings.count_documents(q)
    skip = max(0, (page - 1) * limit)
    docs = await job_listings.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"total": total, "items": docs}


@router.put("/jobs/{job_id}")
async def admin_update_job(job_id: str, payload: Dict[str, Any], request: Request, user=Depends(admin_dep())):
    allowed = {"title", "company", "description", "requirements", "skills_required",
               "category", "location", "location_type", "employment_type",
               "experience_min", "experience_max", "salary_min", "salary_max",
               "is_active", "is_featured", "is_verified", "is_flagged",
               "flagged_reason", "admin_note", "expires_at"}
    updates = {k: v for k, v in payload.items() if k in allowed}
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()
    old = await job_listings.find_one({"id": job_id}, {"_id": 0})
    await job_listings.update_one({"id": job_id}, {"$set": updates})
    await log_admin_action(user["id"], "update_job", "job", job_id, old, updates, request.client.host if request.client else None)
    return {"success": True}


@router.delete("/jobs/{job_id}")
async def admin_delete_job(job_id: str, request: Request, user=Depends(admin_dep())):
    old = await job_listings.find_one({"id": job_id}, {"_id": 0})
    await job_listings.delete_one({"id": job_id})
    await log_admin_action(user["id"], "delete_job", "job", job_id, old, None, request.client.host if request.client else None)
    return {"success": True}


@router.post("/jobs/{job_id}/verify")
async def admin_verify_job(job_id: str, request: Request, user=Depends(admin_dep())):
    await job_listings.update_one({"id": job_id}, {"$set": {"is_verified": True, "is_active": True}})
    await log_admin_action(user["id"], "verify_job", "job", job_id, None, None, request.client.host if request.client else None)
    return {"success": True}


@router.post("/jobs/{job_id}/feature")
async def admin_feature_job(job_id: str, request: Request, user=Depends(admin_dep())):
    until = datetime.now(timezone.utc) + timedelta(days=30)
    await job_listings.update_one({"id": job_id}, {"$set": {"is_featured": True, "featured_until": until.isoformat()}})
    await log_admin_action(user["id"], "feature_job", "job", job_id, None, None, request.client.host if request.client else None)
    return {"success": True}


@router.post("/jobs/{job_id}/flag")
async def admin_flag_job(job_id: str, payload: FlagIn, request: Request, user=Depends(admin_dep())):
    await job_listings.update_one({"id": job_id}, {"$set": {
        "is_flagged": True, "flagged_reason": payload.reason, "is_active": False,
    }})
    await log_admin_action(user["id"], "flag_job", "job", job_id, None, payload.model_dump(), request.client.host if request.client else None)
    return {"success": True}


# ───── PAYMENTS ─────
@router.get("/payments")
async def admin_list_payments(status: Optional[str] = None, type: Optional[str] = None,
                               page: int = 1, limit: int = 50, user=Depends(admin_dep())):
    q: Dict[str, Any] = {}
    if status:
        q["status"] = status
    if type:
        q["type"] = type
    total = await payments.count_documents(q)
    skip = max(0, (page - 1) * limit)
    docs = await payments.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    uids = list({d["user_id"] for d in docs})
    people = await users.find({"id": {"$in": uids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(len(uids))
    by_id = {p["id"]: p for p in people}
    for d in docs:
        u = by_id.get(d["user_id"]) or {}
        d["user_name"] = u.get("name")
        d["user_email"] = u.get("email")
    return {"total": total, "items": docs}


class RefundIn(BaseModel):
    reason: str


@router.post("/payments/{payment_id}/refund")
async def admin_refund(payment_id: str, payload: RefundIn, request: Request, user=Depends(admin_dep())):
    p = await payments.find_one({"id": payment_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Payment not found")
    await payments.update_one({"id": payment_id}, {"$set": {"status": "refunded", "refund_reason": payload.reason}})
    sub_types = {"resume_pro_monthly", "jobseeker_pro_monthly", "combo_pro_monthly",
                 "resume_pro_annual", "jobseeker_pro_annual", "combo_pro_annual"}
    if p["type"] in sub_types:
        await users.update_one({"id": p["user_id"]}, {"$set": {"plan": "free", "plan_expiry": None}})
    await log_admin_action(user["id"], "refund", "payment", payment_id, p, payload.model_dump(), request.client.host if request.client else None)
    return {"success": True}


@router.post("/payments/{payment_id}/mark-paid")
async def admin_mark_paid(payment_id: str, request: Request, user=Depends(admin_dep())):
    await payments.update_one({"id": payment_id}, {"$set": {"status": "paid"}})
    await log_admin_action(user["id"], "mark_paid", "payment", payment_id, None, None, request.client.host if request.client else None)
    return {"success": True}


# ───── SUBSCRIPTIONS ─────
@router.get("/subscriptions")
async def admin_subscriptions(plan: Optional[str] = None, expiring_in_days: Optional[int] = None,
                               page: int = 1, limit: int = 50, user=Depends(admin_dep())):
    q: Dict[str, Any] = {"plan": {"$ne": "free"}}
    if plan:
        q["plan"] = plan
    if expiring_in_days:
        cutoff = (datetime.now(timezone.utc) + timedelta(days=expiring_in_days)).isoformat()
        now = datetime.now(timezone.utc).isoformat()
        q["plan_expiry"] = {"$lte": cutoff, "$gte": now}
    total = await users.count_documents(q)
    skip = max(0, (page - 1) * limit)
    docs = await users.find(q, {"_id": 0, "password_hash": 0}).sort("plan_expiry", 1).skip(skip).limit(limit).to_list(limit)
    return {"total": total, "items": docs}


# ───── SETTINGS ─────
@router.get("/settings")
async def admin_settings(user=Depends(admin_dep())):
    docs = await platform_settings.find({}, {"_id": 0}).to_list(100)
    return docs


class SettingUpdate(BaseModel):
    value: Any


@router.put("/settings/{key}")
async def admin_update_setting(key: str, payload: SettingUpdate, request: Request, user=Depends(superadmin_dep())):
    old = await platform_settings.find_one({"key": key}, {"_id": 0})
    await platform_settings.update_one(
        {"key": key},
        {"$set": {"value": payload.value, "updated_by": user["id"], "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    await log_admin_action(user["id"], "update_setting", "settings", key, old, {"value": payload.value}, request.client.host if request.client else None)
    return {"success": True}


# ───── ACTIVITY LOG ─────
@router.get("/logs")
async def admin_logs_list(admin_id: Optional[str] = None, entity_type: Optional[str] = None,
                           action: Optional[str] = None, page: int = 1, limit: int = 100,
                           user=Depends(admin_dep())):
    q: Dict[str, Any] = {}
    if admin_id:
        q["admin_id"] = admin_id
    if entity_type:
        q["entity_type"] = entity_type
    if action:
        q["action"] = action
    total = await admin_logs.count_documents(q)
    skip = max(0, (page - 1) * limit)
    docs = await admin_logs.find(q, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    uids = list({d["admin_id"] for d in docs})
    people = await users.find({"id": {"$in": uids}}, {"_id": 0, "id": 1, "name": 1, "email": 1}).to_list(len(uids))
    by_id = {p["id"]: p for p in people}
    for d in docs:
        u = by_id.get(d["admin_id"]) or {}
        d["admin_name"] = u.get("name")
        d["admin_email"] = u.get("email")
    return {"total": total, "items": docs}


# ───── ANNOUNCEMENTS / MAINTENANCE ─────
class AnnouncementIn(BaseModel):
    text: str
    active: bool = True


@router.post("/announcements")
async def admin_announcement(payload: AnnouncementIn, request: Request, user=Depends(admin_dep())):
    await platform_settings.update_one(
        {"key": "announcement_banner"},
        {"$set": {"value": payload.model_dump(), "updated_by": user["id"], "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    await log_admin_action(user["id"], "update_announcement", "settings", "announcement_banner", None, payload.model_dump(), request.client.host if request.client else None)
    return {"success": True}
