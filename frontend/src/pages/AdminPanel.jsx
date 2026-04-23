/**
 * Admin Panel — single consolidated file covering all admin sub-pages.
 * Uses tabs for navigation to keep implementation compact.
 */
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { toast } from "sonner";
import {
    Users, FileText, Briefcase, CurrencyInr, Gear, Receipt, ClockCounterClockwise,
    ChartBar, Megaphone, Trash, Flag, CheckCircle, Star, Warning, Crown,
} from "@phosphor-icons/react";
import { Line, Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, ArcElement } from "chart.js";
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, ArcElement);

const TABS = [
    { id: "overview", label: "Overview", icon: ChartBar },
    { id: "users", label: "Users", icon: Users },
    { id: "resumes", label: "Resumes", icon: FileText },
    { id: "jobs", label: "Jobs", icon: Briefcase },
    { id: "payments", label: "Payments", icon: CurrencyInr },
    { id: "subscriptions", label: "Subscriptions", icon: Crown },
    { id: "logs", label: "Activity Log", icon: ClockCounterClockwise },
    { id: "settings", label: "Settings", icon: Gear },
];

export default function AdminPanel() {
    const { user } = useAuthStore();
    const nav = useNavigate();
    const [tab, setTab] = useState("overview");

    useEffect(() => {
        if (!user || (user.role !== "admin" && user.role !== "superadmin")) nav("/");
    }, [user, nav]);

    if (!user || (user.role !== "admin" && user.role !== "superadmin")) return null;

    return (
        <div className="flex min-h-[calc(100vh-65px)]">
            <aside className="w-60 shrink-0 border-r border-[#0D0D12] bg-[#0D0D12] text-white p-4 sticky top-[65px] self-start" style={{ maxHeight: "calc(100vh - 65px)", overflowY: "auto" }}>
                <div className="rp-overline text-[#FF4400]">Admin · {user.role}</div>
                <div className="font-display font-bold text-lg mt-1 truncate">{user.name || user.email}</div>
                <nav className="mt-6 space-y-1">
                    {TABS.map((t) => (
                        <button key={t.id} onClick={() => setTab(t.id)} data-testid={`admin-tab-${t.id}`}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${tab === t.id ? "bg-[#FF4400] text-white" : "hover:bg-white/10"}`} style={{ borderRadius: 2 }}>
                            <t.icon size={14} weight="bold" /> {t.label}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 p-6 md:p-10 overflow-x-auto">
                {tab === "overview" && <Overview />}
                {tab === "users" && <UsersTab />}
                {tab === "resumes" && <ResumesTab />}
                {tab === "jobs" && <JobsTab />}
                {tab === "payments" && <PaymentsTab />}
                {tab === "subscriptions" && <SubscriptionsTab />}
                {tab === "logs" && <LogsTab />}
                {tab === "settings" && <SettingsTab />}
            </main>
        </div>
    );
}

function Overview() {
    const [stats, setStats] = useState(null);
    const [revenue, setRevenue] = useState(null);
    const [signups, setSignups] = useState(null);

    useEffect(() => {
        api.get("/admin/stats").then((r) => setStats(r.data));
        api.get("/admin/revenue/summary").then((r) => setRevenue(r.data));
        api.get("/admin/signups/daily").then((r) => setSignups(r.data));
    }, []);

    if (!stats) return <div className="text-[#4A4D57]">Loading metrics…</div>;

    return (
        <div>
            <h1 className="font-display font-extrabold text-4xl tracking-tight">Admin Dashboard</h1>
            <p className="text-[#4A4D57] mt-1">Real-time platform metrics.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-6 border border-[#0D0D12]" style={{ borderRadius: 2 }} data-testid="admin-stats-grid">
                <Stat label="Total Users" value={stats.total_users.toLocaleString("en-IN")} />
                <Stat label="Active Subs" value={stats.active_subscriptions} />
                <Stat label="Total Revenue" value={`₹${stats.total_revenue_inr.toLocaleString("en-IN")}`} />
                <Stat label="Active Jobs" value={stats.active_jobs} last />
                <Stat label="Total Jobs" value={stats.total_jobs} borderT />
                <Stat label="Applications" value={stats.total_applications} borderT />
                <Stat label="Resumes" value={stats.total_resumes} borderT />
                <Stat label="Pending Payments" value={stats.pending_payments} borderT last />
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-8">
                {revenue && revenue.byMonth.length > 0 && (
                    <div className="rp-card p-6">
                        <div className="rp-overline">Revenue trend</div>
                        <div className="h-64 mt-4">
                            <Line data={{
                                labels: revenue.byMonth.map((m) => m.month),
                                datasets: [{ label: "Revenue (₹)", data: revenue.byMonth.map((m) => m.revenue_inr), borderColor: "#FF4400", backgroundColor: "#FF4400", tension: 0.3 }],
                            }} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </div>
                )}
                {signups && signups.by_plan.length > 0 && (
                    <div className="rp-card p-6">
                        <div className="rp-overline">Plan distribution</div>
                        <div className="h-64 mt-4 flex justify-center">
                            <Doughnut data={{
                                labels: signups.by_plan.map((p) => p.plan),
                                datasets: [{
                                    data: signups.by_plan.map((p) => p.count),
                                    backgroundColor: ["#0D0D12", "#FF4400", "#00A859", "#FFB300", "#4A4D57", "#EF4444"],
                                }],
                            }} options={{ responsive: true, maintainAspectRatio: false }} />
                        </div>
                    </div>
                )}
            </div>

            {(stats.flagged_jobs > 0 || stats.flagged_resumes > 0) && (
                <div className="mt-8 p-4 border-2 border-[#EF4444] flex items-center gap-3" style={{ borderRadius: 2 }}>
                    <Warning size={20} weight="fill" className="text-[#EF4444]" />
                    <span>Review needed: <b>{stats.flagged_jobs}</b> flagged jobs, <b>{stats.flagged_resumes}</b> flagged resumes.</span>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, last, borderT }) {
    return (
        <div className={`p-5 ${borderT ? "border-t " : ""}${!last ? "border-r border-b md:border-b-0 border-[#0D0D12]" : "border-b md:border-b-0 border-[#0D0D12]"}`}>
            <div className="font-display font-extrabold text-3xl tracking-tight">{value}</div>
            <div className="text-xs text-[#4A4D57] uppercase tracking-wider mt-1">{label}</div>
        </div>
    );
}

function UsersTab() {
    const [data, setData] = useState({ items: [], total: 0 });
    const [filters, setFilters] = useState({ search: "", role: "", plan: "" });
    const [editing, setEditing] = useState(null);

    useEffect(() => { load(); }, [filters]);
    async function load() {
        const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
        const r = await api.get("/admin/users", { params });
        setData(r.data);
    }

    async function grantPlan(u) {
        const plan = window.prompt("Grant plan (resume_pro / jobseeker_pro / combo_pro):", "jobseeker_pro");
        if (!plan) return;
        const days = Number(window.prompt("Days:", "30"));
        await api.post(`/admin/users/${u.id}/grant-plan`, { plan, days });
        toast.success("Plan granted"); load();
    }
    async function del(u) {
        if (!window.confirm(`Delete ${u.email}? This cascades.`)) return;
        await api.delete(`/admin/users/${u.id}`);
        toast.success("Deleted"); load();
    }
    async function toggleActive(u) {
        await api.put(`/admin/users/${u.id}`, { is_active: !u.is_active });
        load();
    }

    return (
        <div>
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="font-display font-extrabold text-3xl tracking-tight">Users · {data.total}</h1>
                </div>
            </div>
            <div className="flex gap-2 mb-4 flex-wrap">
                <input className="rp-input max-w-xs" placeholder="Search email/name" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} data-testid="admin-users-search" />
                <select className="rp-input max-w-xs" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
                    <option value="">All roles</option><option value="jobseeker">Jobseeker</option><option value="employer">Employer</option>
                    <option value="admin">Admin</option><option value="superadmin">Superadmin</option>
                </select>
                <select className="rp-input max-w-xs" value={filters.plan} onChange={(e) => setFilters({ ...filters, plan: e.target.value })}>
                    <option value="">All plans</option>
                    <option value="free">Free</option><option value="resume_pro">Resume Pro</option>
                    <option value="jobseeker_pro">Jobseeker Pro</option><option value="combo_pro">Combo Pro</option>
                </select>
            </div>
            <DataTable
                data={data.items}
                cols={[
                    { k: "email", l: "Email" }, { k: "name", l: "Name" },
                    { k: "role", l: "Role" }, { k: "plan", l: "Plan" },
                    { k: "created_at", l: "Joined", fmt: (v) => v?.slice(0, 10) },
                    { k: "is_active", l: "Active", fmt: (v) => v ? "✓" : "✗" },
                ]}
                actions={(u) => (
                    <>
                        <button onClick={() => grantPlan(u)} className="text-xs text-[#FF4400] font-bold" data-testid={`admin-grant-${u.id}`}>Grant</button>
                        <button onClick={() => toggleActive(u)} className="text-xs text-[#4A4D57] font-bold">{u.is_active ? "Disable" : "Enable"}</button>
                        <button onClick={() => del(u)} className="text-xs text-[#EF4444] font-bold" data-testid={`admin-del-user-${u.id}`}>Delete</button>
                    </>
                )}
            />
        </div>
    );
}

function ResumesTab() {
    const [data, setData] = useState({ items: [], total: 0 });
    useEffect(() => { load(); }, []);
    async function load() { const r = await api.get("/admin/resumes"); setData(r.data); }
    async function flag(id) {
        const reason = window.prompt("Reason?");
        if (!reason) return;
        await api.post(`/admin/resumes/${id}/flag`, { reason });
        toast.success("Flagged"); load();
    }
    async function unflag(id) { await api.post(`/admin/resumes/${id}/unflag`); load(); }
    async function del(id) {
        if (!window.confirm("Delete resume?")) return;
        await api.delete(`/admin/resumes/${id}`); load();
    }
    return (
        <div>
            <h1 className="font-display font-extrabold text-3xl tracking-tight mb-6">Resumes · {data.total}</h1>
            <DataTable
                data={data.items}
                cols={[
                    { k: "name", l: "Name" }, { k: "user_name", l: "User" }, { k: "user_email", l: "Email" },
                    { k: "template_id", l: "Template" }, { k: "completion_pct", l: "Done %" },
                    { k: "is_flagged", l: "Flag", fmt: (v) => v ? "🚩" : "" },
                ]}
                actions={(r) => (
                    <>
                        {r.is_flagged
                            ? <button onClick={() => unflag(r.id)} className="text-xs text-[#00A859] font-bold">Unflag</button>
                            : <button onClick={() => flag(r.id)} className="text-xs text-[#FF4400] font-bold">Flag</button>}
                        <button onClick={() => del(r.id)} className="text-xs text-[#EF4444] font-bold">Delete</button>
                    </>
                )}
            />
        </div>
    );
}

function JobsTab() {
    const [data, setData] = useState({ items: [], total: 0 });
    const [filters, setFilters] = useState({ status: "", is_verified: "", is_flagged: "" });
    useEffect(() => { load(); }, [filters]);
    async function load() {
        const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""));
        const r = await api.get("/admin/jobs", { params });
        setData(r.data);
    }
    async function verify(id) { await api.post(`/admin/jobs/${id}/verify`); toast.success("Verified"); load(); }
    async function feature(id) { await api.post(`/admin/jobs/${id}/feature`); toast.success("Featured"); load(); }
    async function flag(id) {
        const r = window.prompt("Reason?"); if (!r) return;
        await api.post(`/admin/jobs/${id}/flag`, { reason: r }); load();
    }
    async function toggleActive(j) { await api.put(`/admin/jobs/${j.id}`, { is_active: !j.is_active }); load(); }
    async function del(id) { if (!window.confirm("Delete?")) return; await api.delete(`/admin/jobs/${id}`); load(); }

    return (
        <div>
            <div className="flex justify-between items-end mb-6">
                <h1 className="font-display font-extrabold text-3xl tracking-tight">Jobs · {data.total}</h1>
                <div className="flex gap-2">
                    <select className="rp-input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                        <option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>
            <DataTable
                data={data.items}
                cols={[
                    { k: "title", l: "Title" }, { k: "company", l: "Company" }, { k: "location", l: "Location" },
                    { k: "is_active", l: "Active", fmt: (v) => v ? "✓" : "✗" },
                    { k: "is_verified", l: "Verified", fmt: (v) => v ? "✓" : "" },
                    { k: "is_featured", l: "Featured", fmt: (v) => v ? "★" : "" },
                    { k: "applications_count", l: "Apps" },
                ]}
                actions={(j) => (
                    <>
                        {!j.is_verified && <button onClick={() => verify(j.id)} className="text-xs text-[#00A859] font-bold" data-testid={`admin-verify-${j.id}`}>Verify</button>}
                        {!j.is_featured && <button onClick={() => feature(j.id)} className="text-xs text-[#FF4400] font-bold">Feature</button>}
                        <button onClick={() => toggleActive(j)} className="text-xs text-[#4A4D57] font-bold">{j.is_active ? "Deactivate" : "Activate"}</button>
                        {!j.is_flagged && <button onClick={() => flag(j.id)} className="text-xs text-[#FF4400] font-bold">Flag</button>}
                        <button onClick={() => del(j.id)} className="text-xs text-[#EF4444] font-bold">Delete</button>
                    </>
                )}
            />
        </div>
    );
}

function PaymentsTab() {
    const [data, setData] = useState({ items: [], total: 0 });
    const [filter, setFilter] = useState("");
    useEffect(() => { load(); }, [filter]);
    async function load() {
        const r = await api.get("/admin/payments", { params: filter ? { status: filter } : {} });
        setData(r.data);
    }
    async function refund(p) {
        const r = window.prompt("Refund reason?");
        if (!r) return;
        await api.post(`/admin/payments/${p.id}/refund`, { reason: r });
        toast.success("Refunded"); load();
    }
    async function markPaid(p) { await api.post(`/admin/payments/${p.id}/mark-paid`); load(); }

    return (
        <div>
            <div className="flex justify-between items-end mb-6">
                <h1 className="font-display font-extrabold text-3xl tracking-tight">Payments · {data.total}</h1>
                <select className="rp-input" value={filter} onChange={(e) => setFilter(e.target.value)}>
                    <option value="">All</option><option value="pending">Pending</option>
                    <option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option>
                </select>
            </div>
            <DataTable
                data={data.items}
                cols={[
                    { k: "txn_id", l: "Txn" }, { k: "user_email", l: "User" },
                    { k: "type", l: "Type" }, { k: "amount_paise", l: "Amount", fmt: (v) => `₹${v / 100}` },
                    { k: "status", l: "Status" },
                    { k: "created_at", l: "Date", fmt: (v) => v?.slice(0, 10) },
                ]}
                actions={(p) => (
                    <>
                        {p.status === "pending" && <button onClick={() => markPaid(p)} className="text-xs text-[#00A859] font-bold">Mark paid</button>}
                        {p.status === "paid" && <button onClick={() => refund(p)} className="text-xs text-[#EF4444] font-bold" data-testid={`admin-refund-${p.id}`}>Refund</button>}
                    </>
                )}
            />
        </div>
    );
}

function SubscriptionsTab() {
    const [data, setData] = useState({ items: [], total: 0 });
    useEffect(() => { api.get("/admin/subscriptions").then((r) => setData(r.data)); }, []);
    return (
        <div>
            <h1 className="font-display font-extrabold text-3xl tracking-tight mb-6">Active subscriptions · {data.total}</h1>
            <DataTable
                data={data.items}
                cols={[
                    { k: "email", l: "Email" }, { k: "name", l: "Name" },
                    { k: "plan", l: "Plan" },
                    { k: "plan_expiry", l: "Expiry", fmt: (v) => v?.slice(0, 10) || "Lifetime" },
                ]}
            />
        </div>
    );
}

function LogsTab() {
    const [data, setData] = useState({ items: [], total: 0 });
    useEffect(() => { api.get("/admin/logs").then((r) => setData(r.data)); }, []);
    return (
        <div>
            <h1 className="font-display font-extrabold text-3xl tracking-tight mb-6">Activity log · {data.total} entries</h1>
            <DataTable
                data={data.items}
                cols={[
                    { k: "created_at", l: "When", fmt: (v) => new Date(v).toLocaleString("en-IN") },
                    { k: "admin_email", l: "Admin" },
                    { k: "action", l: "Action" },
                    { k: "entity_type", l: "Entity" },
                    { k: "entity_id", l: "ID", fmt: (v) => v?.slice(0, 8) },
                    { k: "ip_address", l: "IP" },
                ]}
            />
        </div>
    );
}

function SettingsTab() {
    const { user } = useAuthStore();
    const [settings, setSettings] = useState([]);
    const [ann, setAnn] = useState({ text: "", active: false });

    useEffect(() => {
        api.get("/admin/settings").then((r) => {
            setSettings(r.data);
            const a = r.data.find((s) => s.key === "announcement_banner");
            if (a) setAnn(a.value);
        });
    }, []);

    async function saveSetting(key, value) {
        try {
            await api.put(`/admin/settings/${key}`, { value });
            toast.success(`Updated ${key}`);
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Only superadmin can edit settings");
        }
    }
    async function saveAnnouncement() {
        await api.post("/admin/announcements", ann);
        toast.success("Announcement updated");
    }

    return (
        <div>
            <h1 className="font-display font-extrabold text-3xl tracking-tight mb-6">Platform settings</h1>

            <div className="border border-[#0D0D12] p-5 mb-6" style={{ borderRadius: 2 }}>
                <div className="flex items-center gap-2 mb-3"><Megaphone size={16} weight="bold" className="text-[#FF4400]" /><div className="rp-overline">Announcement banner</div></div>
                <input className="rp-input" placeholder="Banner text" value={ann.text} onChange={(e) => setAnn({ ...ann, text: e.target.value })} data-testid="admin-announcement-text" />
                <label className="flex items-center gap-2 mt-3 text-sm">
                    <input type="checkbox" checked={ann.active} onChange={(e) => setAnn({ ...ann, active: e.target.checked })} data-testid="admin-announcement-active" />
                    Active
                </label>
                <button onClick={saveAnnouncement} className="rp-btn-orange mt-4" data-testid="admin-announcement-save">Save announcement</button>
            </div>

            <div className="border border-[#E5E7EB] p-5" style={{ borderRadius: 2 }}>
                <div className="rp-overline mb-3">All settings</div>
                <div className="space-y-2">
                    {settings.filter((s) => s.key !== "announcement_banner").map((s) => (
                        <div key={s.key} className="flex items-center gap-3 p-2 border border-[#E5E7EB]" style={{ borderRadius: 2 }}>
                            <div className="flex-1">
                                <div className="font-mono text-xs font-bold">{s.key}</div>
                                <div className="text-xs text-[#4A4D57]">{s.description}</div>
                            </div>
                            <input
                                defaultValue={typeof s.value === "object" ? JSON.stringify(s.value) : s.value}
                                onBlur={(e) => {
                                    let val = e.target.value;
                                    try { val = JSON.parse(val); } catch {}
                                    if (val !== s.value) saveSetting(s.key, val);
                                }}
                                className="rp-input max-w-xs"
                                disabled={user.role !== "superadmin"}
                                data-testid={`setting-${s.key}`}
                            />
                        </div>
                    ))}
                </div>
                {user.role !== "superadmin" && <p className="text-xs text-[#4A4D57] mt-3">Only superadmin can edit values.</p>}
            </div>
        </div>
    );
}

function DataTable({ data, cols, actions }) {
    if (!data || data.length === 0) {
        return <div className="border border-dashed border-[#E5E7EB] p-10 text-center text-[#4A4D57]" style={{ borderRadius: 2 }}>No records.</div>;
    }
    return (
        <div className="border border-[#0D0D12] overflow-x-auto" style={{ borderRadius: 2 }} data-testid="admin-data-table">
            <table className="w-full text-sm">
                <thead className="bg-[#F4F5F7] border-b border-[#0D0D12]">
                    <tr>
                        {cols.map((c) => <th key={c.k} className="px-3 py-2 text-left text-[10px] uppercase tracking-wider font-bold">{c.l}</th>)}
                        {actions && <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider font-bold">Actions</th>}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row) => (
                        <tr key={row.id || row.key} className="border-b border-[#E5E7EB] hover:bg-[#F4F5F7]">
                            {cols.map((c) => (
                                <td key={c.k} className="px-3 py-2 text-xs truncate max-w-xs">
                                    {c.fmt ? c.fmt(row[c.k]) : (row[c.k] === null || row[c.k] === undefined ? "—" : String(row[c.k]))}
                                </td>
                            ))}
                            {actions && <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">{actions(row)}</td>}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
