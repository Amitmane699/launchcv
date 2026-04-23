"""Auth routes: register, login, me, forgot password (stub)."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from db import users, referrals
from auth_utils import hash_password, verify_password, create_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: Optional[str] = None
    role: str = "jobseeker"  # jobseeker | employer
    referral_code: Optional[str] = None
    phone: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


@router.post("/register")
async def register(payload: RegisterIn):
    if payload.role not in ("jobseeker", "employer"):
        raise HTTPException(400, "Invalid role")
    existing = await users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")

    user_id = str(uuid.uuid4())
    ref_code = uuid.uuid4().hex[:8]
    referred_by = None
    if payload.referral_code:
        ref_user = await users.find_one({"referral_code": payload.referral_code}, {"_id": 0, "id": 1})
        if ref_user:
            referred_by = ref_user["id"]

    doc = {
        "id": user_id,
        "email": payload.email.lower(),
        "name": payload.name or payload.email.split("@")[0],
        "phone": payload.phone,
        "avatar_url": None,
        "password_hash": hash_password(payload.password),
        "auth_provider": "email",
        "role": payload.role,
        "plan": "free",
        "plan_expiry": None,
        "ats_checks_this_month": 0,
        "download_credits": 0,
        "downloads_used": 0,
        "referral_code": ref_code,
        "referred_by": referred_by,
        "ui_language": "en",
        "is_active": True,
        "is_email_verified": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await users.insert_one(doc)

    if referred_by:
        await referrals.insert_one({
            "id": str(uuid.uuid4()),
            "referrer_id": referred_by,
            "referred_id": user_id,
            "rewarded": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    token = create_token(user_id, payload.role)
    doc.pop("password_hash", None)
    doc.pop("_id", None)
    return {"token": token, "user": doc}


@router.post("/login")
async def login(payload: LoginIn):
    user = await users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account disabled")

    await users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login_at": datetime.now(timezone.utc).isoformat()}},
    )
    token = create_token(user["id"], user["role"])
    user.pop("password_hash", None)
    user.pop("_id", None)
    return {"token": token, "user": user}


@router.get("/me")
async def me(user=Depends(get_current_user)):
    return user


@router.post("/logout")
async def logout():
    return {"success": True}


@router.post("/forgot-password")
async def forgot_password(email: EmailStr):
    # Stub: would send reset email
    return {"success": True, "message": "If the email exists, a reset link has been sent."}
