# ResumePro ATS — v2 Expansion Changelog

## What Was Added (Phase 2 Implementation)

### Backend — New Routes & Services

#### 1. DOCX Export (`backend/services/docx_export.py`)
- Full `.docx` resume generation using `python-docx`
- Respects section order, all resume sections, contact header
- Orange accent headings, proper margins (A4 style)
- Plan-gated: requires `resume_pro` or higher
- Endpoint: `POST /api/resumes/{id}/export/docx`

#### 2. Cover Letter Generator (`backend/services/cover_letter.py`, `backend/routes/cover_letters.py`)
- Rule-based, no AI, four tone templates: Professional, Enthusiastic, Concise, Fresher/Campus
- Auto-fills from resume data: name, skills, latest role, education
- Save/edit/delete cover letters
- Endpoints: `GET /api/cover-letters/templates`, `POST /api/cover-letters/generate`, `GET/POST/PUT/DELETE /api/cover-letters`

#### 3. Referral Reward System (`backend/routes/referrals.py`)
- Each user auto-gets a unique 8-char referral code
- On successful referral use: referrer earns **6 free days** added to plan expiry
- Combo Pro users earn 30 days (double reward)
- One-time use per account; self-referral blocked
- Leaderboard: top 10 referrers
- Endpoints: `GET /api/referrals/my-code`, `POST /api/referrals/use`, `GET /api/referrals/leaderboard`

#### 4. Job Alerts (`backend/routes/job_alerts.py`)
- Up to 5 alerts per user; filter by keywords, location, category, employment type
- Frequency: instant / daily / weekly
- Preview endpoint shows matching jobs in real time
- Toggle active/paused per alert
- Endpoints: `GET/POST /api/job-alerts`, `DELETE/PUT /api/job-alerts/{id}`, `GET /api/job-alerts/preview/{id}`

#### 5. Multi-JD Comparator (`backend/routes/compare.py`)
- Compare same resume against up to 3 JDs simultaneously
- Returns ranked results with score, breakdown, matched/missing keywords
- Identifies best-fit role with recommendation text
- Endpoint: `POST /api/ats/compare`

### Frontend — New Pages

| Page | Route | Description |
|------|-------|-------------|
| Cover Letter | `/cover-letter` | 4-tone generator + save/edit/download |
| Job Alerts | `/job-alerts` | Alert management with live preview |
| Multi-JD Compare | `/compare` | Side-by-side JD scoring with visual results |
| Referrals | `/referrals` | Share code, track rewards, apply friend codes |

### Frontend — Builder Improvements
- **DOCX download button** added to builder toolbar (alongside existing TXT + PDF)

### Plan Feature Flags Updated
New flags added to all plans in `auth_utils.py`:
- `docxExport` — Resume Pro+
- `coverLetter` — Resume Pro+
- `multiJdCompare` — Resume Pro+

---

## Full Project Structure

```
resumepro-expanded/
├── backend/
│   ├── engine/
│   │   ├── ats_score.py         # Rule-based ATS scoring
│   │   └── self_check.py        # Resume self-check
│   ├── routes/
│   │   ├── admin/panel.py       # 8-tab admin panel
│   │   ├── applications.py      # Kanban tracker
│   │   ├── ats.py               # ATS score + history
│   │   ├── auth.py              # JWT auth
│   │   ├── compare.py           # ★ NEW: Multi-JD comparator
│   │   ├── cover_letters.py     # ★ NEW: Cover letter CRUD
│   │   ├── employer.py          # Employer dashboard
│   │   ├── job_alerts.py        # ★ NEW: Job alerts
│   │   ├── jobs.py              # Job board
│   │   ├── payments.py          # PayUmoney mock
│   │   ├── referrals.py         # ★ NEW: Referral system
│   │   └── resumes.py           # Resume CRUD + exports
│   ├── services/
│   │   ├── cover_letter.py      # ★ NEW: CL generation logic
│   │   ├── docx_export.py       # ★ NEW: DOCX generation
│   │   ├── pdf_export.py        # ReportLab PDF
│   │   └── resume_parser.py     # Upload parser
│   ├── auth_utils.py            # JWT + plan features
│   ├── db.py                    # MongoDB collections
│   ├── seed.py                  # Admin + sample jobs
│   └── server.py                # FastAPI app
├── frontend/src/
│   ├── pages/
│   │   ├── AdminPanel.jsx       # 8-tab admin
│   │   ├── AuthPage.jsx         # Login/signup
│   │   ├── Builder.jsx          # Split-screen builder + DOCX
│   │   ├── Comparator.jsx       # ★ NEW: Multi-JD compare
│   │   ├── CoverLetter.jsx      # ★ NEW: CL generator
│   │   ├── Dashboard.jsx        # User dashboard
│   │   ├── EmployerDashboard.jsx
│   │   ├── JobAlerts.jsx        # ★ NEW: Alert management
│   │   ├── Jobs.jsx             # Job board
│   │   ├── Landing.jsx          # Marketing page
│   │   ├── Pricing.jsx          # 4 JS plans + 3 employer
│   │   ├── Referrals.jsx        # ★ NEW: Referral system
│   │   ├── Templates.jsx        # 13 templates gallery
│   │   └── Tracker.jsx          # Kanban board
│   ├── components/
│   │   ├── Layout.jsx           # Nav + footer (updated)
│   │   ├── ResumePreview.jsx    # 13 live templates
│   │   └── TipsSidebar.jsx
│   └── App.js                   # Routes (updated)
```

## Running the Project

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --port 8001

# Frontend
cd frontend
npm install
REACT_APP_BACKEND_URL=http://localhost:8001 npm start
```

## Credentials
- Admin: `admin@resumepro.in` / `Admin@ResumePro2026`
- Register new jobseeker/employer via `/signup`

## Phase 3 Backlog (remaining)
- Web Push Notifications (VAPID)
- APScheduler cron: deadline reminders, plan expiry emails, listing expiry
- Institutions/TPO portal with student bulk CSV
- Manual resume review marketplace (₹199)
- 10 more resume templates (→ 23 total)
- Superadmin impersonation
- Google OAuth
