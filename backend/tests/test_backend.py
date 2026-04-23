"""LaunchCV ATS full backend integration tests."""
import uuid
import requests
import pytest

# Track created resources for cleanup at the end
created_user_ids: list = []
created_resume_ids: list = []
created_job_ids: list = []
created_app_ids: list = []


# ═══════════ AUTH ═══════════
class TestAuth:
    def test_register_jobseeker(self, api):
        email = f"TEST_reg_seeker_{uuid.uuid4().hex[:6]}@test.com"
        r = requests.post(f"{api}/auth/register", json={
            "email": email, "password": "Test@1234", "name": "Seeker", "role": "jobseeker"
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert "token" in body and isinstance(body["token"], str) and len(body["token"]) > 20
        assert body["user"]["email"] == email.lower()
        assert body["user"]["role"] == "jobseeker"
        assert body["user"]["plan"] == "free"
        assert "password_hash" not in body["user"]
        created_user_ids.append(body["user"]["id"])

    def test_register_employer(self, api):
        email = f"TEST_reg_emp_{uuid.uuid4().hex[:6]}@test.com"
        r = requests.post(f"{api}/auth/register", json={
            "email": email, "password": "Test@1234", "name": "Emp", "role": "employer"
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["role"] == "employer"
        created_user_ids.append(body["user"]["id"])

    def test_register_duplicate_fails(self, api, seeker):
        r = requests.post(f"{api}/auth/register", json={
            "email": seeker["email"], "password": "Test@1234", "role": "jobseeker"
        })
        assert r.status_code == 400

    def test_register_invalid_role(self, api):
        r = requests.post(f"{api}/auth/register", json={
            "email": f"TEST_bad_{uuid.uuid4().hex[:4]}@test.com", "password": "Test@1234", "role": "hacker"
        })
        assert r.status_code == 400

    def test_login_admin(self, api, admin_token):
        # admin_token fixture already tested login; verify /me
        r = requests.get(f"{api}/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        me = r.json()
        assert me["email"] == "admin@launchcv.in"
        assert me["role"] in ("admin", "superadmin")

    def test_login_bad_password(self, api):
        r = requests.post(f"{api}/auth/login", json={
            "email": "admin@launchcv.in", "password": "wrongpass"
        })
        assert r.status_code == 401

    def test_me_requires_auth(self, api):
        r = requests.get(f"{api}/auth/me")
        assert r.status_code == 401


# ═══════════ RESUMES ═══════════
class TestResumes:
    def test_create_resume(self, api, seeker):
        r = requests.post(f"{api}/resumes", headers=seeker["headers"],
                          json={"name": "TEST_R1", "template_id": "classic",
                                "data": {"personal": {"fullName": "John Doe", "email": "j@x.com"},
                                         "summary": "Experienced python developer",
                                         "skills": ["python", "fastapi", "mongodb"],
                                         "experience": [{"title": "Dev", "company": "X",
                                                         "description": "Built APIs in python"}],
                                         "education": [{"degree": "BE", "school": "IIT"}]}})
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["name"] == "TEST_R1"
        assert doc["user_id"] == seeker["user"]["id"]
        assert "id" in doc
        seeker["resume_id"] = doc["id"]
        created_resume_ids.append(doc["id"])

    def test_list_resumes(self, api, seeker):
        r = requests.get(f"{api}/resumes", headers=seeker["headers"])
        assert r.status_code == 200
        lst = r.json()
        assert isinstance(lst, list)
        assert any(d["id"] == seeker.get("resume_id") for d in lst)

    def test_get_resume(self, api, seeker):
        rid = seeker["resume_id"]
        r = requests.get(f"{api}/resumes/{rid}", headers=seeker["headers"])
        assert r.status_code == 200
        assert r.json()["id"] == rid

    def test_update_resume_persists(self, api, seeker):
        rid = seeker["resume_id"]
        r = requests.put(f"{api}/resumes/{rid}", headers=seeker["headers"],
                         json={"name": "TEST_R1_Updated"})
        assert r.status_code == 200
        # verify via GET
        g = requests.get(f"{api}/resumes/{rid}", headers=seeker["headers"])
        assert g.json()["name"] == "TEST_R1_Updated"

    def test_free_plan_second_resume_blocked(self, api, seeker):
        r = requests.post(f"{api}/resumes", headers=seeker["headers"],
                          json={"name": "TEST_R2"})
        assert r.status_code == 403
        body = r.json()
        assert "upgrade_required" in str(body)

    def test_free_plan_share_blocked(self, api, seeker):
        rid = seeker["resume_id"]
        r = requests.post(f"{api}/resumes/{rid}/share", headers=seeker["headers"])
        assert r.status_code == 403

    def test_pro_plan_share_allowed(self, api, pro_seeker):
        # first create a resume
        rr = requests.post(f"{api}/resumes", headers=pro_seeker["headers"],
                           json={"name": "TEST_ProResume",
                                 "data": {"personal": {"fullName": "Pro User"},
                                          "summary": "Python expert"}})
        assert rr.status_code == 200
        rid = rr.json()["id"]
        pro_seeker["resume_id"] = rid
        created_resume_ids.append(rid)
        s = requests.post(f"{api}/resumes/{rid}/share", headers=pro_seeker["headers"])
        assert s.status_code == 200
        assert "share_token" in s.json()

    def test_pdf_export(self, api, seeker):
        rid = seeker["resume_id"]
        r = requests.post(f"{api}/resumes/{rid}/export/pdf", headers=seeker["headers"])
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:4] == b"%PDF"


# ═══════════ ATS ═══════════
class TestATS:
    def test_score(self, api, seeker):
        rid = seeker["resume_id"]
        r = requests.post(f"{api}/ats/score", headers=seeker["headers"],
                          json={"resume_id": rid,
                                "jd": "Looking for a Python developer with FastAPI and MongoDB experience"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert "score" in body and isinstance(body["score"], int)
        assert 0 <= body["score"] <= 100
        assert "breakdown" in body
        for k in ("keywordMatch", "sectionCompleteness", "resumeLength", "formatting"):
            assert k in body["breakdown"]
        assert "matchedKeywords" in body and isinstance(body["matchedKeywords"], list)
        assert "missingKeywords" in body and isinstance(body["missingKeywords"], list)
        assert "suggestions" in body
        assert "wordCount" in body

    def test_free_ats_limit_enforced(self, api, seeker):
        rid = seeker["resume_id"]
        # 1st call happened in test_score. Make 2 more = 3 total allowed, 4th should 403
        for _ in range(2):
            requests.post(f"{api}/ats/score", headers=seeker["headers"],
                          json={"resume_id": rid, "jd": "python"})
        r = requests.post(f"{api}/ats/score", headers=seeker["headers"],
                          json={"resume_id": rid, "jd": "python"})
        assert r.status_code == 403
        assert "upgrade_required" in str(r.json())


# ═══════════ JOBS (public) ═══════════
class TestPublicJobs:
    def test_list_jobs(self, api):
        r = requests.get(f"{api}/jobs")
        assert r.status_code == 200
        body = r.json()
        assert "items" in body and "total" in body
        assert isinstance(body["items"], list)

    def test_list_jobs_filters(self, api):
        r = requests.get(f"{api}/jobs", params={"search": "engineer", "limit": 5})
        assert r.status_code == 200
        assert r.json()["limit"] == 5


# ═══════════ EMPLOYER / JOBS MGMT ═══════════
class TestEmployer:
    def test_post_job(self, api, employer):
        r = requests.post(f"{api}/employer/jobs", headers=employer["headers"], json={
            "title": "TEST_Backend_Engineer",
            "company": "TestCo",
            "location": "Bangalore",
            "description": "Build Python services",
            "requirements": "Python, FastAPI",
            "category": "engineering",
            "skills_required": ["python", "fastapi"],
        })
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["title"] == "TEST_Backend_Engineer"
        assert doc["is_active"] is False  # becomes active after payment
        employer["job_id"] = doc["id"]
        created_job_ids.append(doc["id"])

    def test_jobseeker_cannot_post_job(self, api, seeker):
        r = requests.post(f"{api}/employer/jobs", headers=seeker["headers"], json={
            "title": "X", "company": "Y", "location": "Z",
            "description": "d", "category": "engineering",
        })
        assert r.status_code == 403

    def test_my_jobs(self, api, employer):
        r = requests.get(f"{api}/employer/jobs", headers=employer["headers"])
        assert r.status_code == 200
        assert any(j["id"] == employer["job_id"] for j in r.json())


# ═══════════ JOB APPLICATION PLAN GUARD ═══════════
class TestJobApplication:
    def test_free_user_cannot_apply(self, api, seeker, admin_headers):
        # Need an active job: use admin to activate employer's job OR create via admin
        # Activate employer job via admin verify
        jobs = requests.get(f"{api}/jobs").json()["items"]
        if not jobs:
            pytest.skip("No active jobs seeded")
        job_id = jobs[0]["id"]
        rid = seeker["resume_id"]
        r = requests.post(f"{api}/job-applications", headers=seeker["headers"],
                          json={"job_id": job_id, "resume_id": rid})
        assert r.status_code == 403  # free plan blocked

    def test_pro_user_can_apply(self, api, pro_seeker, admin_headers, employer):
        # Verify employer's job via admin to make it active
        jid = employer["job_id"]
        v = requests.post(f"{api}/admin/jobs/{jid}/verify", headers=admin_headers)
        assert v.status_code == 200
        rid = pro_seeker["resume_id"]
        r = requests.post(f"{api}/job-applications", headers=pro_seeker["headers"],
                          json={"job_id": jid, "resume_id": rid, "cover_letter": "hi"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["job_id"] == jid
        assert body["status"] == "applied"
        assert "ats_score" in body


# ═══════════ MANUAL KANBAN TRACKER ═══════════
class TestApplicationsTracker:
    def test_create_update_delete(self, api, seeker):
        r = requests.post(f"{api}/applications", headers=seeker["headers"], json={
            "company": "TEST_Kanban_Co", "role": "Dev", "status": "wishlist"
        })
        assert r.status_code == 200
        aid = r.json()["id"]
        created_app_ids.append(aid)
        # list
        lst = requests.get(f"{api}/applications", headers=seeker["headers"])
        assert lst.status_code == 200
        assert any(a["id"] == aid for a in lst.json())
        # update
        upd = requests.put(f"{api}/applications/{aid}", headers=seeker["headers"],
                           json={"status": "applied", "notes": "round1"})
        assert upd.status_code == 200
        assert upd.json()["status"] == "applied"
        # delete
        d = requests.delete(f"{api}/applications/{aid}", headers=seeker["headers"])
        assert d.status_code == 200


# ═══════════ PAYMENTS (mock) ═══════════
class TestPayments:
    def test_mock_payment_upgrades_plan(self, api):
        # Create a fresh seeker for deterministic test
        email = f"TEST_payseeker_{uuid.uuid4().hex[:6]}@test.com"
        reg = requests.post(f"{api}/auth/register", json={
            "email": email, "password": "Test@1234", "name": "PaySeeker", "role": "jobseeker"
        })
        assert reg.status_code == 200
        token = reg.json()["token"]
        h = {"Authorization": f"Bearer {token}"}
        # create order
        co = requests.post(f"{api}/payments/create-order", headers=h,
                          json={"product_type": "jobseeker_pro_monthly"})
        assert co.status_code == 200, co.text
        txn = co.json()["txn_id"]
        assert co.json()["amount_inr"] == 249.0
        # confirm success
        ps = requests.post(f"{api}/payments/payu-success", headers=h,
                           json={"txn_id": txn, "success": True})
        assert ps.status_code == 200
        assert ps.json()["success"] is True
        # verify plan upgraded via /me
        me = requests.get(f"{api}/auth/me", headers=h)
        assert me.status_code == 200
        assert me.json()["plan"] == "jobseeker_pro"
        assert me.json()["plan_expiry"] is not None

    def test_invalid_product(self, api, seeker):
        r = requests.post(f"{api}/payments/create-order", headers=seeker["headers"],
                          json={"product_type": "invalid_xxx"})
        assert r.status_code == 400


# ═══════════ ADMIN PANEL ═══════════
class TestAdmin:
    def test_stats_requires_admin(self, api, seeker):
        r = requests.get(f"{api}/admin/stats", headers=seeker["headers"])
        assert r.status_code == 403

    def test_stats_admin_ok(self, api, admin_headers):
        r = requests.get(f"{api}/admin/stats", headers=admin_headers)
        assert r.status_code == 200
        s = r.json()
        for k in ("total_users", "active_subscriptions", "total_revenue_inr", "active_jobs"):
            assert k in s

    def test_users_list(self, api, admin_headers):
        r = requests.get(f"{api}/admin/users?limit=5", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        assert "items" in body
        # ensure password_hash not leaked
        for u in body["items"]:
            assert "password_hash" not in u

    def test_admin_jobs(self, api, admin_headers):
        r = requests.get(f"{api}/admin/jobs", headers=admin_headers)
        assert r.status_code == 200
        assert "items" in r.json()

    def test_admin_payments(self, api, admin_headers):
        r = requests.get(f"{api}/admin/payments", headers=admin_headers)
        assert r.status_code == 200

    def test_admin_settings(self, api, admin_headers):
        r = requests.get(f"{api}/admin/settings", headers=admin_headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_admin_logs(self, api, admin_headers):
        r = requests.get(f"{api}/admin/logs", headers=admin_headers)
        assert r.status_code == 200
        body = r.json()
        assert "items" in body

    def test_grant_plan_and_log(self, api, admin_headers):
        # register a fresh user
        email = f"TEST_grant_{uuid.uuid4().hex[:6]}@test.com"
        reg = requests.post(f"{api}/auth/register", json={
            "email": email, "password": "Test@1234", "role": "jobseeker"
        })
        uid = reg.json()["user"]["id"]
        g = requests.post(f"{api}/admin/users/{uid}/grant-plan",
                          headers=admin_headers, json={"plan": "resume_pro", "days": 30})
        assert g.status_code == 200
        # verify user's plan
        detail = requests.get(f"{api}/admin/users/{uid}", headers=admin_headers)
        assert detail.status_code == 200
        assert detail.json()["plan"] == "resume_pro"
        # verify admin log recorded
        logs = requests.get(f"{api}/admin/logs?action=grant_plan", headers=admin_headers)
        assert logs.status_code == 200
        assert any(lg["entity_id"] == uid for lg in logs.json()["items"])

    def test_admin_verify_and_feature_job(self, api, admin_headers, employer):
        jid = employer["job_id"]
        v = requests.post(f"{api}/admin/jobs/{jid}/verify", headers=admin_headers)
        assert v.status_code == 200
        f = requests.post(f"{api}/admin/jobs/{jid}/feature", headers=admin_headers)
        assert f.status_code == 200


# ═══════════ CLEANUP ═══════════
@pytest.fixture(scope="session", autouse=True)
def cleanup(admin_headers):
    yield
    # delete test resumes/jobs/users via admin endpoints
    for rid in created_resume_ids:
        try:
            requests.delete(f"{API_BASE}/admin/resumes/{rid}", headers=admin_headers)
        except Exception:
            pass
    for jid in created_job_ids:
        try:
            requests.delete(f"{API_BASE}/admin/jobs/{jid}", headers=admin_headers)
        except Exception:
            pass
    for uid in created_user_ids:
        try:
            requests.delete(f"{API_BASE}/admin/users/{uid}", headers=admin_headers)
        except Exception:
            pass


import os
API_BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://resume-builder-jobs.preview.emergentagent.com").rstrip("/") + "/api"
