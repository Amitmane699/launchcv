"""Seed admin user and default platform settings on startup."""
import os
import uuid
from datetime import datetime, timezone
from db import users, platform_settings
from auth_utils import hash_password


async def seed():
    """Idempotent seeding — runs on server startup."""
    admin_email = os.environ.get("ADMIN_SEED_EMAIL", "admin@launchcv.in")
    admin_password = os.environ.get("ADMIN_SEED_PASSWORD", "Admin@LaunchCV2026")

    existing = await users.find_one({"email": admin_email})
    if not existing:
        await users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Platform Admin",
            "password_hash": hash_password(admin_password),
            "auth_provider": "email",
            "role": "superadmin",
            "plan": "combo_pro",
            "plan_expiry": None,
            "ats_checks_this_month": 0,
            "download_credits": 9999,
            "downloads_used": 0,
            "referral_code": "ADMIN001",
            "ui_language": "en",
            "is_active": True,
            "is_email_verified": True,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })

    # Default platform settings
    defaults = [
        ("maintenance_mode", False, "Put site in maintenance mode"),
        ("free_ats_limit", 3, "ATS checks per month for free users"),
        ("featured_job_price", 2499, "Price in rupees for featured job"),
        ("standard_job_price", 999, "Price in rupees for standard job"),
        ("resume_pro_monthly", 149, "Resume Pro monthly price"),
        ("resume_pro_annual", 999, "Resume Pro annual price"),
        ("jobseeker_pro_monthly", 249, "Job Seeker Pro monthly price"),
        ("jobseeker_pro_annual", 1499, "Job Seeker Pro annual price"),
        ("combo_pro_monthly", 299, "Combo Pro monthly price"),
        ("combo_pro_annual", 1999, "Combo Pro annual price"),
        ("employer_scale_monthly", 7999, "Employer Scale monthly price"),
        ("institution_annual", 4999, "Institution annual price"),
        ("announcement_banner", {"text": "", "active": False}, "Global announcement banner"),
    ]
    for key, value, desc in defaults:
        await platform_settings.update_one(
            {"key": key},
            {"$setOnInsert": {"key": key, "value": value, "description": desc,
                              "updated_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True,
        )

    # Seed sample jobs if empty
    from db import job_listings
    count = await job_listings.count_documents({})
    if count == 0:
        from datetime import timedelta
        admin = await users.find_one({"email": admin_email})
        samples = [
            {"title": "Software Engineer — Backend", "company": "Flipkart", "location": "Bengaluru, KA",
             "location_type": "hybrid", "employment_type": "fulltime", "category": "engineering",
             "experience_min": 2, "experience_max": 5, "salary_min": 1200000, "salary_max": 2500000,
             "description": "Design and build scalable backend services using Python, FastAPI, and PostgreSQL. You'll work with product teams to ship features to 200M+ users.",
             "requirements": "Python, FastAPI, PostgreSQL, MongoDB, REST APIs, System Design",
             "skills_required": ["python", "fastapi", "postgresql", "mongodb", "rest", "api"],
             "is_featured": True, "is_verified": True},
            {"title": "Frontend Developer — React", "company": "Razorpay", "location": "Bengaluru, KA",
             "location_type": "remote", "employment_type": "fulltime", "category": "engineering",
             "experience_min": 1, "experience_max": 4, "salary_min": 900000, "salary_max": 1800000,
             "description": "Build beautiful, performant dashboards for payment products. React, TypeScript, modern CSS.",
             "requirements": "React, JavaScript, CSS, Tailwind, REST APIs",
             "skills_required": ["react", "javascript", "css", "tailwind", "redux"],
             "is_featured": False, "is_verified": True},
            {"title": "Product Designer", "company": "CRED", "location": "Bengaluru, KA",
             "location_type": "onsite", "employment_type": "fulltime", "category": "design",
             "experience_min": 3, "experience_max": 7, "salary_min": 1500000, "salary_max": 3000000,
             "description": "Shape the next generation of India's most loved finance product. Strong portfolio required.",
             "requirements": "Figma, design systems, interaction, prototyping, user research",
             "skills_required": ["figma", "design", "prototyping", "research"],
             "is_featured": True, "is_verified": True},
            {"title": "Data Analyst", "company": "Swiggy", "location": "Gurgaon, HR",
             "location_type": "hybrid", "employment_type": "fulltime", "category": "data",
             "experience_min": 1, "experience_max": 3, "salary_min": 700000, "salary_max": 1400000,
             "description": "Analyze order patterns, pricing, and marketing. SQL + Python + dashboards.",
             "requirements": "SQL, Python, Tableau/PowerBI, statistics",
             "skills_required": ["sql", "python", "tableau", "powerbi", "statistics"],
             "is_featured": False, "is_verified": True},
            {"title": "Content Marketing Intern", "company": "Zomato", "location": "Remote, India",
             "location_type": "remote", "employment_type": "internship", "category": "marketing",
             "experience_min": 0, "experience_max": 1, "salary_min": 20000, "salary_max": 35000,
             "description": "Craft engaging social and long-form content. Great for Tier-2/3 talent.",
             "requirements": "Strong writing, SEO basics, social media fluency",
             "skills_required": ["writing", "seo", "social media", "content"],
             "is_featured": False, "is_verified": True},
            {"title": "DevOps Engineer", "company": "PhonePe", "location": "Pune, MH",
             "location_type": "onsite", "employment_type": "fulltime", "category": "engineering",
             "experience_min": 3, "experience_max": 6, "salary_min": 1800000, "salary_max": 3500000,
             "description": "Manage AWS infra powering India's largest UPI platform. Kubernetes, Terraform, CI/CD.",
             "requirements": "AWS, Kubernetes, Docker, Terraform, Linux",
             "skills_required": ["aws", "kubernetes", "docker", "terraform", "linux", "cicd"],
             "is_featured": True, "is_verified": True},
        ]
        now = datetime.now(timezone.utc)
        for s in samples:
            await job_listings.insert_one({
                "id": str(uuid.uuid4()),
                "employer_id": admin["id"],
                "company_logo_url": None,
                "salary_currency": "INR",
                "subcategory": None,
                "is_active": True,
                "is_flagged": False,
                "flagged_reason": None,
                "admin_note": None,
                "featured_until": (now + timedelta(days=30)).isoformat() if s.get("is_featured") else None,
                "expires_at": (now + timedelta(days=30)).isoformat(),
                "application_url": None,
                "application_email": None,
                "apply_on_platform": True,
                "views_count": 0,
                "applications_count": 0,
                "payment_txn_id": None,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
                **s,
            })
