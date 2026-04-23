"""LaunchCV - FastAPI backend."""
import os
import logging
from pathlib import Path
from fastapi import FastAPI, APIRouter, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from db import ensure_indexes, platform_settings
from seed import seed
from routes.auth import router as auth_router
from routes.resumes import router as resumes_router
from routes.ats import router as ats_router
from routes.jobs import router as jobs_router
from routes.employer import router as employer_router
from routes.applications import router as applications_router
from routes.payments import router as payments_router
from routes.admin.panel import router as admin_router
from routes.cover_letters import router as cover_letters_router
from routes.referrals import router as referrals_router
from routes.job_alerts import router as job_alerts_router
from routes.compare import router as compare_router
from routes.career_graph import router as career_graph_router
from routes.skill_gap import router as skill_gap_router

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await ensure_indexes()
        await seed()
        logger.info("Startup seeding complete.")
    except Exception as e:
        logger.error(f"Startup error: {e}")
    yield


app = FastAPI(title="LaunchCV", lifespan=lifespan)

api = APIRouter(prefix="/api")


@api.get("/")
async def root():
    return {"service": "LaunchCV", "status": "ok"}


@api.get("/settings/public")
async def public_settings():
    """Public settings: announcement banner, prices."""
    docs = await platform_settings.find({}, {"_id": 0}).to_list(100)
    return {d["key"]: d["value"] for d in docs}


api.include_router(auth_router)
api.include_router(resumes_router)
api.include_router(ats_router)
api.include_router(jobs_router)
api.include_router(employer_router)
api.include_router(applications_router)
api.include_router(payments_router)
api.include_router(admin_router)
api.include_router(cover_letters_router)
api.include_router(referrals_router)
api.include_router(job_alerts_router)
api.include_router(compare_router)
api.include_router(career_graph_router)
api.include_router(skill_gap_router)

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
