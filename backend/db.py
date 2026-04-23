"""MongoDB connection and collection accessors."""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# Collection accessors
users = db.users
resumes = db.resumes
resume_drafts = db.resume_drafts
ats_score_history = db.ats_score_history
job_listings = db.job_listings
job_applications = db.job_applications
job_alerts = db.job_alerts
saved_jobs = db.saved_jobs
applications = db.applications  # Manual tracker
cover_letters = db.cover_letters
institutions = db.institutions
institution_students = db.institution_students
referrals = db.referrals
payments = db.payments
reviews = db.reviews
push_subscriptions = db.push_subscriptions
admin_logs = db.admin_logs
career_graphs = db.career_graphs
platform_settings = db.platform_settings


async def ensure_indexes():
    """Create indexes for performance."""
    await users.create_index("email", unique=True)
    await users.create_index("role")
    await users.create_index("plan")
    await users.create_index("referral_code", unique=True, sparse=True)

    await resumes.create_index("user_id")
    # Use partialFilterExpression because share_token is stored as None on creation
    # and MongoDB's `sparse` only skips missing fields, not null values.
    try:
        await resumes.create_index(
            "share_token",
            unique=True,
            partialFilterExpression={"share_token": {"$type": "string"}},
            name="share_token_partial_unique",
        )
    except Exception:
        pass
    # Drop legacy sparse-unique index if it exists (causes DuplicateKeyError on null)
    try:
        await resumes.drop_index("share_token_1")
    except Exception:
        pass
    await resumes.create_index("is_flagged")

    await ats_score_history.create_index("resume_id")
    await ats_score_history.create_index("created_at")

    await job_listings.create_index("employer_id")
    await job_listings.create_index("category")
    await job_listings.create_index("location")
    await job_listings.create_index("is_active")
    await job_listings.create_index("is_featured")
    await job_listings.create_index("expires_at")
    await job_listings.create_index([("title", "text"), ("company", "text"), ("description", "text")])

    await job_applications.create_index([("job_id", 1), ("applicant_id", 1)], unique=True)
    await job_applications.create_index("applicant_id")
    await job_applications.create_index("status")

    await applications.create_index("user_id")
    await applications.create_index("status")

    await payments.create_index("txn_id", unique=True)
    await payments.create_index("user_id")
    await payments.create_index("status")

    await admin_logs.create_index("admin_id")
    await admin_logs.create_index("entity_type")
    await admin_logs.create_index("created_at")

    await platform_settings.create_index("key", unique=True)
    await career_graphs.create_index("user_id", unique=True)
