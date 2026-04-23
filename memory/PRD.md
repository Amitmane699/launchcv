# ResumePro ATS — Product Requirements Document

## Original Problem Statement
Build **ResumePro ATS** — India's fastest ATS resume builder + job board SaaS.
USP: "Build ATS Resume. Find Jobs. Get Hired. All in One Place."
Target: Indian job seekers including Tier-2 & Tier-3 cities. No AI — fully rule-based.

## User Personas
1. **Jobseeker** — default role, builds resumes, applies to jobs, uses Kanban tracker
2. **Employer** — posts job listings, manages applicants, buys featured slots
3. **Admin/Superadmin** — moderates users, resumes, jobs, payments, settings, activity logs

## Stack (platform-adapted)
- **Backend**: FastAPI + Motor (MongoDB) — originally specified Node/Express/PostgreSQL; ported to Emergent stack with identical API contracts for easy future migration
- **Frontend**: React 19 + Tailwind + Zustand + Chart.js + dnd-kit + Phosphor Icons
- **Fonts**: Cabinet Grotesk (headings) + Outfit (body) + JetBrains Mono (code)
- **Design**: Swiss & High-Contrast (white + #0D0D12 obsidian + #FF4400 signal orange)

## ✅ Phase 1 — Shipped (2026-02-19)
- **Auth**: JWT register/login/me, role-based (jobseeker/employer/admin/superadmin)
- **Resume Builder**: 5 templates (classic/modern/minimal/technical/creative), split-screen form + live A4 preview, auto-save, template picker, section data model (personal, summary, experience, skills, education, projects, certs, languages, hobbies)
- **ATS Engine** (rule-based, no AI): keyword match 40 + section completeness 30 + resume length 15 + formatting 15 = 100. Returns matched/missing keywords + actionable suggestions
- **Job Board**: Public listing with filters (search, location, category, employment type, work style), featured/verified badges, similar jobs, view counter
- **Job Applications**: Plan-gated (`jobseeker_pro` required to apply), ATS score auto-computed per application
- **Kanban Tracker**: 5 columns (Wishlist / Applied / Interview / Offer / Rejected), drag-and-drop via @dnd-kit, deadline reminders stored
- **Employer**: Post job → pay ₹999 → listing goes live, manage applicants table with ATS scores, status management, analytics (views/apps per listing via Chart.js bar)
- **Pricing**: Monthly/Annual toggle, 4 jobseeker plans (Free/Resume Pro/Job Seeker Pro/Combo Pro) + 3 employer plans + 4 pay-per-use items
- **PayUmoney Mock Flow**: `create-order` → mock gateway page → `payu-success` applies plan upgrade / download credits / job activation; `payu-failure` for failures
- **Admin Panel**: Single consolidated route `/admin` with 8 tabs
  - Overview (stats + revenue/plan distribution charts)
  - Users (search, filter, grant/revoke plans, delete, toggle active)
  - Resumes (flag/unflag, delete)
  - Jobs (verify, feature, flag, activate/deactivate, delete)
  - Payments (filter, mark paid, refund)
  - Subscriptions (active/expiring)
  - Activity Log (immutable audit trail with admin, action, entity, before/after, IP)
  - Settings (platform prices + announcement banner; superadmin only for edits)
- **Admin Activity Log**: Every admin mutation auto-written to `admin_logs`
- **PDF Export**: ReportLab server-side, watermarked for free plan
- **Hinglish Toggle**: Static string map with language toggle in header
- **Public Resume Share**: Pro-gated, shareable URL at `/r/:token`
- **Announcement Banner**: Admin-managed, displays platform-wide
- **Seeded Data**: Admin (`admin@resumepro.in` / `Admin@ResumePro2026`) + 6 sample jobs from Indian companies
- **Test Coverage**: 36/36 backend tests passing (100%) — testing agent fixed critical MongoDB share_token index bug

## 🔜 Phase 2 — Backlog (P0/P1/P2)
### P0 (important for retention)
- DOCX export (parallel to PDF)
- Cover letter generator (templates + tones)
- Referral reward system (auto-grant 3/6-day free)
- Google OAuth (Emergent-managed)

### P1 (institutional + scale)
- Institutions/TPO portal (white-label subdomain, student management, bulk CSV)
- Manual resume review marketplace (₹199)
- Multi-JD comparator (up to 3 JDs)
- Section reorder drag-and-drop in builder

### P2 (engagement)
- Web Push Notifications (service worker + VAPID)
- Job alert digest emails (instant/daily/weekly)
- APScheduler cron jobs (deadline reminders, listing expiry, plan expiry reminders, ATS counter reset)
- Employer CSV export of applicants
- 10 more resume templates (to reach 15)
- Impersonation (superadmin only)

## Architecture Notes
- All API routes `/api` prefixed
- MongoDB only (no PostgreSQL in this env); schema mirrors the SQL spec with UUIDs
- All timestamps ISO strings stored in UTC
- Frontend uses `REACT_APP_BACKEND_URL` for backend calls
- Plan enforcement via `require_feature(feature_name)` dependency on protected routes
- Admin panel gated by `require_roles("admin", "superadmin")`
- Superadmin-only: settings edits, user impersonation

## Credentials
- **Admin (seeded)**: admin@resumepro.in / Admin@ResumePro2026 (superadmin)
- Test jobseeker/employer: register via `/signup`

## Next Action Items
1. Collect user feedback on Phase 1 UX (builder flow, pricing clarity, admin usability)
2. Capture real PayUmoney merchant key/salt when ready → swap mock for real hash-verified flow
3. Prioritise Phase 2 — DOCX export + cover letter generator highest-leverage for free-to-pro conversion
4. Consider A/B testing the pricing toggle default (monthly vs annual)
