import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { Plus, FileText, Briefcase, ChartLine, Trash, CopySimple, Share, ArrowRight, UploadSimple, Sparkle } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend } from "chart.js";
import UploadResumeModal from "../components/UploadResumeModal";
import { SAMPLE_RESUME } from "../data/sampleResume";
ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

export default function Dashboard() {
    const { user } = useAuthStore();
    const nav = useNavigate();
    const [resumes, setResumes] = useState([]);
    const [apps, setApps] = useState([]);
    const [scoreHistory, setScoreHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploadOpen, setUploadOpen] = useState(false);

    useEffect(() => { load(); }, []);

    async function load() {
        try {
            const [r, a] = await Promise.all([api.get("/resumes"), api.get("/job-applications").catch(() => ({ data: [] }))]);
            setResumes(r.data || []);
            setApps(a.data || []);
            if (r.data?.[0]) {
                const h = await api.get(`/ats/history/${r.data[0].id}`).catch(() => ({ data: [] }));
                setScoreHistory(h.data || []);
            }
        } finally { setLoading(false); }
    }

    async function createResume() {
        try {
            const r = await api.post("/resumes", { name: "My Resume", template_id: "classic" });
            nav(`/builder/${r.data.id}`);
        } catch (err) {
            const d = err?.response?.data?.detail || err?.response?.data || {};
            if (d.error === "upgrade_required") {
                toast.error("Free plan allows 1 resume. Upgrade to add more.");
                nav("/pricing");
            } else {
                toast.error("Could not create resume");
            }
        }
    }

    async function loadSampleResume() {
        try {
            const r = await api.post("/resumes", { name: "Sample Resume", template_id: "modern", data: SAMPLE_RESUME });
            toast.success("Sample resume loaded — edit any field!");
            nav(`/builder/${r.data.id}`);
        } catch {
            toast.error("Upgrade to create more resumes"); nav("/pricing");
        }
    }

    async function duplicate(id) {
        try {
            await api.post(`/resumes/${id}/duplicate`);
            load();
        } catch { toast.error("Upgrade to duplicate"); }
    }

    async function remove(id) {
        if (!window.confirm("Delete this resume?")) return;
        await api.delete(`/resumes/${id}`);
        load();
    }

    async function share(id) {
        try {
            const r = await api.post(`/resumes/${id}/share`);
            const url = `${window.location.origin}/r/${r.data.share_token}`;
            navigator.clipboard.writeText(url);
            toast.success("Share link copied!");
        } catch {
            toast.error("Sharing is a Pro feature");
        }
    }

    const chartData = {
        labels: scoreHistory.slice(0, 10).reverse().map((_, i) => `#${i + 1}`),
        datasets: [{
            label: "ATS Score",
            data: scoreHistory.slice(0, 10).reverse().map((h) => h.score),
            borderColor: "#FF4400", backgroundColor: "#FF4400", tension: 0.3, fill: false,
        }],
    };

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
                <div>
                    <span className="rp-overline">Dashboard</span>
                    <h1 className="font-display font-extrabold text-4xl mt-2 tracking-tight">Hi {user?.name?.split(" ")[0] || "there"} 👋</h1>
                    <p className="text-[#4A4D57] mt-1">Plan: <b className="uppercase">{user?.plan?.replace("_", " ")}</b></p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setUploadOpen(true)} className="rp-btn-outline" data-testid="dashboard-upload-btn">
                        <UploadSimple weight="bold" size={14} /> Upload Resume
                    </button>
                    <button onClick={loadSampleResume} className="rp-btn-outline" data-testid="dashboard-sample-btn">
                        <Sparkle weight="bold" size={14} /> Load Sample
                    </button>
                    <button onClick={createResume} className="rp-btn-orange" data-testid="dashboard-new-resume-btn">
                        <Plus weight="bold" size={16} /> Start Fresh
                    </button>
                    <Link to="/jobs" className="rp-btn-outline" data-testid="dashboard-browse-jobs-btn">Browse Jobs</Link>
                    <Link to="/career-graph" className="rp-btn-outline" data-testid="dashboard-career-graph-btn">Career Graph</Link>
                    <Link to="/skill-gap" className="rp-btn-outline" data-testid="dashboard-skill-gap-btn">Skill Radar</Link>
                </div>
            </div>
            {uploadOpen && <UploadResumeModal onClose={() => setUploadOpen(false)} />}

            {/* Stat tiles */}
            <div className="grid md:grid-cols-4 gap-0 border border-[#0D0D12]" style={{ borderRadius: 2 }}>
                <Stat icon={FileText} label="Resumes" value={resumes.length} data-testid="stat-resumes" />
                <Stat icon={Briefcase} label="Applications" value={apps.length} data-testid="stat-apps" />
                <Stat icon={ChartLine} label="Avg ATS" value={scoreHistory.length ? Math.round(scoreHistory.reduce((a, b) => a + b.score, 0) / scoreHistory.length) : "—"} data-testid="stat-ats" />
                <Stat icon={ChartLine} label="ATS Checks (month)" value={`${user?.ats_checks_this_month || 0}`} last />
            </div>

            {/* Resumes */}
            <div className="mt-10">
                <div className="flex justify-between items-end mb-4">
                    <h2 className="font-display font-extrabold text-2xl">Your resumes</h2>
                    <Link to="/pricing" className="text-xs text-[#4A4D57] hover:text-[#FF4400]" data-testid="dashboard-upgrade-link">Upgrade to unlock all templates →</Link>
                </div>
                {loading ? <div className="text-[#4A4D57]">Loading…</div> :
                    resumes.length === 0 ? (
                        <EmptyCard label="No resumes yet. Create your first one." cta="Build Resume" onClick={createResume} />
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {resumes.map((r) => (
                                <div key={r.id} className="rp-card p-5" data-testid={`resume-card-${r.id}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="font-display font-bold text-lg truncate">{r.name}</div>
                                            <div className="text-xs text-[#4A4D57] uppercase tracking-wider mt-1">{r.template_id} · {r.completion_pct}% complete</div>
                                        </div>
                                        <span className={`rp-chip ${r.completion_pct >= 70 ? "rp-chip-success" : ""}`}>{r.completion_pct >= 70 ? "Ready" : "Draft"}</span>
                                    </div>
                                    <div className="w-full bg-[#F4F5F7] h-1 mt-4" style={{ borderRadius: 1 }}>
                                        <div className="bg-[#FF4400] h-1" style={{ width: `${r.completion_pct}%`, borderRadius: 1 }} />
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Link to={`/builder/${r.id}`} className="rp-btn-primary !py-2 !px-3 !text-xs flex-1" data-testid={`resume-edit-${r.id}`}>Edit <ArrowRight size={12} weight="bold" /></Link>
                                        <button onClick={() => share(r.id)} className="p-2 border border-[#E5E7EB] hover:border-[#0D0D12]" style={{ borderRadius: 2 }} data-testid={`resume-share-${r.id}`}><Share size={14} weight="bold" /></button>
                                        <button onClick={() => duplicate(r.id)} className="p-2 border border-[#E5E7EB] hover:border-[#0D0D12]" style={{ borderRadius: 2 }} data-testid={`resume-dup-${r.id}`}><CopySimple size={14} weight="bold" /></button>
                                        <button onClick={() => remove(r.id)} className="p-2 border border-[#E5E7EB] hover:border-[#FF4400] hover:text-[#FF4400]" style={{ borderRadius: 2 }} data-testid={`resume-del-${r.id}`}><Trash size={14} weight="bold" /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
            </div>

            {/* Trend */}
            {scoreHistory.length > 1 && (
                <div className="mt-10 rp-card p-6">
                    <div className="rp-overline">ATS Score trend</div>
                    <div className="h-48 mt-3">
                        <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 100 } } }} />
                    </div>
                </div>
            )}
        </div>
    );
}

function Stat({ icon: Icon, label, value, last }) {
    return (
        <div className={`p-6 ${!last ? "border-r border-b md:border-b-0 border-[#0D0D12]" : "border-b md:border-b-0 border-[#0D0D12]"}`}>
            <Icon size={20} weight="duotone" className="text-[#FF4400]" />
            <div className="font-display font-extrabold text-3xl mt-3">{value}</div>
            <div className="text-xs text-[#4A4D57] uppercase tracking-wider mt-1">{label}</div>
        </div>
    );
}

function EmptyCard({ label, cta, onClick }) {
    return (
        <div className="border-2 border-dashed border-[#0D0D12] p-10 text-center" style={{ borderRadius: 2 }}>
            <div className="text-[#4A4D57]">{label}</div>
            <button onClick={onClick} className="rp-btn-orange mt-4" data-testid="empty-cta">{cta}</button>
        </div>
    );
}
