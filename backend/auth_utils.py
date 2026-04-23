"""JWT auth helpers and role-based dependencies."""
import os
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from db import users

JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-prod-min-32-chars-xxxxxxx")
JWT_ALGO = "HS256"
JWT_EXPIRES_DAYS = 7

bearer = HTTPBearer(auto_error=False)


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRES_DAYS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token")


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_token(creds.credentials)
    user = await users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user or not user.get("is_active", True):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or inactive")
    return user


async def get_current_user_optional(creds: HTTPAuthorizationCredentials = Depends(bearer)):
    if not creds:
        return None
    try:
        payload = decode_token(creds.credentials)
        user = await users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
        return user
    except Exception:
        return None


def require_roles(*roles):
    async def _dep(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status.HTTP_403_FORBIDDEN, f"Requires role: {roles}")
        return user
    return _dep


# Plan feature map
PLAN_FEATURES = {
    "free": {
        "maxResumes": 1, "atsChecksPerMonth": 3, "maxDownloads": 1,
        "canApplyJobs": False, "jobAlerts": False, "cloudDraft": False,
        "shareLink": False, "allTemplates": False, "applicationTracker": True,
        "docxExport": False, "coverLetter": False, "multiJdCompare": False,
    },
    "resume_pro": {
        "maxResumes": 9999, "atsChecksPerMonth": 9999, "maxDownloads": 9999,
        "canApplyJobs": False, "jobAlerts": False, "cloudDraft": True,
        "shareLink": True, "allTemplates": True, "applicationTracker": True,
        "docxExport": True, "coverLetter": True, "multiJdCompare": True,
    },
    "jobseeker_pro": {
        "maxResumes": 9999, "atsChecksPerMonth": 9999, "maxDownloads": 9999,
        "canApplyJobs": True, "jobAlerts": True, "cloudDraft": True,
        "shareLink": True, "allTemplates": True, "applicationTracker": True,
        "docxExport": True, "coverLetter": True, "multiJdCompare": True,
    },
    "combo_pro": {
        "maxResumes": 9999, "atsChecksPerMonth": 9999, "maxDownloads": 9999,
        "canApplyJobs": True, "jobAlerts": True, "cloudDraft": True,
        "shareLink": True, "allTemplates": True, "applicationTracker": True,
        "doubleReferral": True, "tpoAccess": True,
        "docxExport": True, "coverLetter": True, "multiJdCompare": True,
    },
    "employer_starter": {"canPostJobs": True, "maxJobs": 1, "featuredJobs": 0, "csvExport": False},
    "employer_growth": {"canPostJobs": True, "maxJobs": 1, "featuredJobs": 1, "csvExport": True},
    "employer_scale": {"canPostJobs": True, "maxJobs": 10, "featuredJobs": 5, "csvExport": True},
    "institution": {"tpoAccess": True, "maxStudents": 500},
}


def require_feature(feature: str):
    async def _dep(user=Depends(get_current_user)):
        plan = user.get("plan", "free")
        features = PLAN_FEATURES.get(plan, PLAN_FEATURES["free"])
        if not features.get(feature):
            raise HTTPException(
                status.HTTP_403_FORBIDDEN,
                {"error": "upgrade_required", "feature": feature, "upgradeUrl": "/pricing"},
            )
        return user
    return _dep


async def log_admin_action(admin_id, action, entity_type, entity_id=None, old_value=None, new_value=None, ip=None):
    from db import admin_logs
    import uuid
    await admin_logs.insert_one({
        "id": str(uuid.uuid4()),
        "admin_id": admin_id,
        "action": action,
        "entity_type": entity_type,
        "entity_id": str(entity_id) if entity_id else None,
        "old_value": old_value,
        "new_value": new_value,
        "ip_address": ip,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
