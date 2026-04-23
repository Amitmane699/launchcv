"""PayUmoney real payment integration — hash-verified."""
import uuid
import hashlib
import hmac
import os
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from typing import Optional
from db import payments, users, job_listings
from auth_utils import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

# ── Credentials (override via .env) ─────────────────────────────────────────
PAYU_KEY  = os.environ.get("PAYU_KEY",  "lEBfMv")
PAYU_SALT = os.environ.get("PAYU_SALT", "As3n6SG1SS4e7h5hfgW1xsVfFYGKnhZS")
PAYU_BASE = os.environ.get("PAYU_BASE_URL", "https://test.payu.in/_payment")

PLAN_CATALOG = {
    "resume_pro_monthly":    ("resume_pro_monthly",    14900,  30,  "resume_pro"),
    "resume_pro_annual":     ("resume_pro_annual",     99900,  365, "resume_pro"),
    "jobseeker_pro_monthly": ("jobseeker_pro_monthly", 24900,  30,  "jobseeker_pro"),
    "jobseeker_pro_annual":  ("jobseeker_pro_annual",  149900, 365, "jobseeker_pro"),
    "combo_pro_monthly":     ("combo_pro_monthly",     29900,  30,  "combo_pro"),
    "combo_pro_annual":      ("combo_pro_annual",      199900, 365, "combo_pro"),
    "employer_starter":      ("employer_starter",      99900,  30,  "employer_starter"),
    "employer_growth":       ("employer_growth",       249900, 30,  "employer_growth"),
    "employer_scale":        ("employer_scale",        799900, 30,  "employer_scale"),
    "download":              ("download",              4900,   0,   None),
    "bulk_downloads":        ("bulk_downloads",        99900,  0,   None),
    "job_post":              ("job_post",              99900,  30,  None),
    "job_featured":          ("job_featured",          249900, 30,  None),
    "job_renewal":           ("job_renewal",           99900,  30,  None),
    "institution":           ("institution",           499900, 365, "institution"),
    "review":                ("review",                19900,  0,   None),
}


def _compute_hash(key, txnid, amount, productinfo, firstname, email, salt):
    """SHA-512 hash: key|txnid|amount|productinfo|firstname|email|udf1..5||||||salt"""
    s = f"{key}|{txnid}|{amount}|{productinfo}|{firstname}|{email}|||||||||||{salt}"
    return hashlib.sha512(s.encode()).hexdigest()


def _verify_response_hash(params: dict) -> bool:
    """Reverse SHA-512 hash verification from PayU callback."""
    reverse = (
        f"{PAYU_SALT}|{params.get('status','')}|||||||"
        f"{params.get('udf5','')}|{params.get('udf4','')}|"
        f"{params.get('udf3','')}|{params.get('udf2','')}|"
        f"{params.get('udf1','')}|{params.get('email','')}|"
        f"{params.get('firstname','')}|{params.get('productinfo','')}|"
        f"{params.get('amount','')}|{params.get('txnid','')}|{PAYU_KEY}"
    )
    expected = hashlib.sha512(reverse.encode()).hexdigest()
    return hmac.compare_digest(expected.lower(), params.get("hash", "").lower())


async def _apply_effects(user_id: str, txn_id: str, ptype: str, meta: dict):
    if ptype in PLAN_CATALOG:
        _, _, days, plan_key = PLAN_CATALOG[ptype]
        if plan_key and days > 0:
            cur = await users.find_one({"id": user_id}, {"plan_expiry": 1, "plan": 1, "_id": 0})
            base = datetime.now(timezone.utc)
            if cur and cur.get("plan_expiry") and cur.get("plan") == plan_key:
                try:
                    e = datetime.fromisoformat(cur["plan_expiry"].replace("Z", "+00:00"))
                    if e > base:
                        base = e
                except Exception:
                    pass
            await users.update_one({"id": user_id}, {"$set": {
                "plan": plan_key,
                "plan_expiry": (base + timedelta(days=days)).isoformat(),
            }})
    if ptype == "download":
        await users.update_one({"id": user_id}, {"$inc": {"download_credits": 1}})
    elif ptype == "bulk_downloads":
        await users.update_one({"id": user_id}, {"$inc": {"download_credits": 50}})
    elif ptype in ("job_post", "job_featured", "job_renewal"):
        jid = meta.get("job_id")
        if jid:
            exp = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
            upd = {"is_active": True, "expires_at": exp, "payment_txn_id": txn_id}
            if ptype == "job_featured":
                upd["is_featured"] = True
                upd["featured_until"] = exp
            await job_listings.update_one({"id": jid, "employer_id": user_id}, {"$set": upd})


# ── Create order ─────────────────────────────────────────────────────────────

class CreateOrderIn(BaseModel):
    product_type: str
    job_id: Optional[str] = None


@router.post("/create-order")
async def create_order(payload: CreateOrderIn, user=Depends(get_current_user)):
    if payload.product_type not in PLAN_CATALOG:
        raise HTTPException(400, "Invalid product_type")
    ptype, amount_paise, _, _ = PLAN_CATALOG[payload.product_type]
    amount_str = f"{amount_paise / 100:.2f}"
    txn_id = f"TXN{uuid.uuid4().hex[:14].upper()}"

    await payments.insert_one({
        "id": str(uuid.uuid4()), "user_id": user["id"], "txn_id": txn_id,
        "payu_payment_id": None, "amount_paise": amount_paise, "type": ptype,
        "status": "pending", "refund_reason": None,
        "meta": {"product_type": payload.product_type, "job_id": payload.job_id},
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    productinfo = ptype.replace("_", " ").title()
    firstname   = (user.get("name") or "User").split()[0]
    email       = user.get("email") or "noreply@launchcv.in"
    site_url    = os.environ.get("SITE_URL", "http://localhost:3000")

    return {
        "txn_id": txn_id,
        "amount_inr": float(amount_str),
        "amount_paise": amount_paise,
        "product_type": payload.product_type,
        "payu_params": {
            "key":         PAYU_KEY,
            "txnid":       txn_id,
            "amount":      amount_str,
            "productinfo": productinfo,
            "firstname":   firstname,
            "email":       email,
            "phone":       user.get("phone") or "9999999999",
            "surl":        f"{site_url}/payment-success",
            "furl":        f"{site_url}/payment-failure",
            "hash":        _compute_hash(PAYU_KEY, txn_id, amount_str, productinfo, firstname, email, PAYU_SALT),
            "service_provider": "payu_paisa",
        },
        "payu_url": PAYU_BASE,
    }


# ── Webhook (PayU server-to-server POST) ─────────────────────────────────────

@router.post("/payu-webhook")
async def payu_webhook(request: Request):
    form = dict(await request.form())
    txn_id = form.get("txnid", "")
    logger.info("PayU webhook txnid=%s status=%s", txn_id, form.get("status"))

    if not _verify_response_hash(form):
        logger.warning("Hash mismatch for txnid=%s", txn_id)
        raise HTTPException(400, "Hash verification failed")

    order = await payments.find_one({"txn_id": txn_id})
    if not order or order["status"] != "pending":
        return {"status": "already_processed"}

    if form.get("status") == "success":
        await payments.update_one({"txn_id": txn_id}, {"$set": {
            "status": "paid",
            "payu_payment_id": form.get("mihpayid"),
            "payu_raw": {k: v for k, v in form.items() if k != "hash"},
        }})
        await _apply_effects(order["user_id"], txn_id, order["type"], order.get("meta") or {})
        logger.info("Payment applied: txnid=%s", txn_id)
    else:
        await payments.update_one({"txn_id": txn_id}, {"$set": {
            "status": "failed",
            "payu_raw": {k: v for k, v in form.items() if k != "hash"},
        }})
    return {"status": "ok"}


# ── Frontend callbacks (after PayU redirect) ──────────────────────────────────

class CallbackIn(BaseModel):
    txn_id: str
    payu_payment_id: Optional[str] = None
    payu_params: Optional[dict] = None   # full form params for hash re-verification


@router.post("/payu-success")
async def frontend_success(payload: CallbackIn, user=Depends(get_current_user)):
    order = await payments.find_one({"txn_id": payload.txn_id, "user_id": user["id"]})
    if not order:
        raise HTTPException(404, "Transaction not found")
    if order["status"] == "paid":
        return {"success": True, "already_processed": True}

    # Hash re-verify if frontend passed the PayU params
    if payload.payu_params and not _verify_response_hash(payload.payu_params):
        raise HTTPException(400, "Hash verification failed")

    await payments.update_one({"txn_id": payload.txn_id}, {"$set": {
        "status": "paid",
        "payu_payment_id": payload.payu_payment_id or f"PAYU{uuid.uuid4().hex[:12].upper()}",
    }})
    await _apply_effects(user["id"], payload.txn_id, order["type"], order.get("meta") or {})
    return {"success": True, "txn_id": payload.txn_id}


@router.post("/payu-failure")
async def frontend_failure(payload: CallbackIn, user=Depends(get_current_user)):
    await payments.update_one(
        {"txn_id": payload.txn_id, "user_id": user["id"]},
        {"$set": {"status": "failed"}},
    )
    return {"success": True}


@router.get("/history")
async def my_payments(user=Depends(get_current_user)):
    docs = await payments.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    for d in docs:
        d.pop("payu_raw", None)
    return docs


@router.get("/verify/{txn_id}")
async def verify_payment(txn_id: str, user=Depends(get_current_user)):
    order = await payments.find_one({"txn_id": txn_id, "user_id": user["id"]}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Not found")
    order.pop("payu_raw", None)
    return order
