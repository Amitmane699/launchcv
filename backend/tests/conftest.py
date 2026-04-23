import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resume-builder-jobs.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@launchcv.in"
ADMIN_PASSWORD = "Admin@LaunchCV2026"


def _unique(prefix):
    return f"TEST_{prefix}_{uuid.uuid4().hex[:8]}@test.com"


@pytest.fixture(scope="session")
def api():
    return API


@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    return r.json()["token"]


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def seeker():
    email = _unique("seeker")
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Test@1234", "name": "Seeker1", "role": "jobseeker"
    })
    assert r.status_code == 200, f"Seeker register failed: {r.text}"
    data = r.json()
    return {"email": email, "password": "Test@1234", "token": data["token"], "user": data["user"],
            "headers": {"Authorization": f"Bearer {data['token']}"}}


@pytest.fixture(scope="session")
def employer():
    email = _unique("employer")
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Test@1234", "name": "Emp1", "role": "employer"
    })
    assert r.status_code == 200, f"Employer register failed: {r.text}"
    data = r.json()
    return {"email": email, "password": "Test@1234", "token": data["token"], "user": data["user"],
            "headers": {"Authorization": f"Bearer {data['token']}"}}


@pytest.fixture(scope="session")
def pro_seeker(admin_headers):
    """A seeker whose plan has been upgraded to jobseeker_pro by admin."""
    email = _unique("proseeker")
    r = requests.post(f"{API}/auth/register", json={
        "email": email, "password": "Test@1234", "name": "ProSeeker", "role": "jobseeker"
    })
    assert r.status_code == 200, r.text
    data = r.json()
    uid = data["user"]["id"]
    gr = requests.post(f"{API}/admin/users/{uid}/grant-plan",
                       headers=admin_headers, json={"plan": "jobseeker_pro", "days": 30})
    assert gr.status_code == 200, gr.text
    # re-login to get refreshed /me
    return {"email": email, "password": "Test@1234", "token": data["token"], "user_id": uid,
            "headers": {"Authorization": f"Bearer {data['token']}"}}
