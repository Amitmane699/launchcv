"""Referral reward system — auto-grant free days on successful referrals."""
import uuid
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db import users, referrals
from auth_utils import get_current_user

router = APIRouter(prefix="/referrals", tags=["referrals"])

REFERRAL_REWARD_DAYS = 6  # days of free plan per successful referral


class ReferralUse(BaseModel):
    referral_code: str


@router.get("/my-code")
async def my_referral_code(user=Depends(get_current_user)):
    """Get or create referral code for current user."""
    if not user.get("referral_code"):
        code = user["id"][:8].upper()
        await users.update_one({"id": user["id"]}, {"$set": {"referral_code": code}})
        return {"code": code, "referrals_made": 0, "rewards_earned_days": 0}
    return {
        "code": user["referral_code"],
        "referrals_made": user.get("referrals_made", 0),
        "rewards_earned_days": user.get("referrals_made", 0) * REFERRAL_REWARD_DAYS,
    }


@router.post("/use")
async def use_referral(payload: ReferralUse, user=Depends(get_current_user)):
    """Apply a referral code when signing up or at any time (once per user)."""
    if user.get("referral_used"):
        raise HTTPException(400, "You have already used a referral code.")

    code = payload.referral_code.strip().upper()
    referrer = await users.find_one({"referral_code": code})
    if not referrer:
        raise HTTPException(404, "Invalid referral code.")
    if referrer["id"] == user["id"]:
        raise HTTPException(400, "Cannot use your own referral code.")

    # Reward the referrer: extend their plan expiry by REFERRAL_REWARD_DAYS
    expiry_field = "plan_expires_at"
    current_expiry = referrer.get(expiry_field)
    if current_expiry:
        try:
            base = datetime.fromisoformat(current_expiry)
        except Exception:
            base = datetime.now(timezone.utc)
    else:
        base = datetime.now(timezone.utc)

    new_expiry = (base + timedelta(days=REFERRAL_REWARD_DAYS)).isoformat()

    # If referrer is on free plan, temporarily bump to resume_pro
    referrer_plan = referrer.get("plan", "free")
    plan_upgrade = {}
    if referrer_plan == "free":
        plan_upgrade = {"plan": "resume_pro", expiry_field: new_expiry}
    else:
        plan_upgrade = {expiry_field: new_expiry}

    await users.update_one(
        {"id": referrer["id"]},
        {"$set": plan_upgrade, "$inc": {"referrals_made": 1}},
    )

    # Mark new user as having used a referral
    await users.update_one(
        {"id": user["id"]},
        {"$set": {"referral_used": code, "referral_used_at": datetime.now(timezone.utc).isoformat()}},
    )

    # Log referral
    await referrals.insert_one({
        "id": str(uuid.uuid4()),
        "referrer_id": referrer["id"],
        "referee_id": user["id"],
        "code": code,
        "reward_days": REFERRAL_REWARD_DAYS,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "success": True,
        "message": f"Referral applied! {referrer.get('name', 'Your friend')} earned {REFERRAL_REWARD_DAYS} free days.",
        "reward_days_given": REFERRAL_REWARD_DAYS,
    }


@router.get("/leaderboard")
async def referral_leaderboard():
    """Top 10 referrers."""
    docs = await users.find(
        {"referrals_made": {"$gt": 0}},
        {"name": 1, "referrals_made": 1, "_id": 0},
    ).sort("referrals_made", -1).limit(10).to_list(10)
    return docs
