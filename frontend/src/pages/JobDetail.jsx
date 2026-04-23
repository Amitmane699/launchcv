import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { MapPin, Briefcase, CurrencyInr, Buildings, ArrowLeft, Star } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function JobDetail() {
    const { id } = useParams();
    const [job, setJob] = useState(null);
    const [applying, setApplying] = useState(false);
    const [myResumes, setMyResumes] = useState([]);
    const [resumeId, setResumeId] = useState("");
    const [coverLetter, setCoverLetter] = useState("");
    const [similar, setSimilar] = useState([]);
    const [applied, setApplied] = useState(false);
    const { user } = useAuthStore();
    const nav = useNavigate();

    useEffect(() => { load(); }, [id]);

    async function load() {
        try {
            const [j, s] = await Promise.all([api.get(`/jobs/${id}`), api.get(`/jobs/${id}/similar`).catch(() => ({ data: [] }))]);
            setJob(j.data); setSimilar(s.data || []);
            api.post(`/jobs/${id}/view`).catch(() => {});
            if (user) {
                const r = await api.get("/resumes").catch(() => ({ data: [] }));
                setMyResumes(r.data || []);
                if (r.data?.[0]) setResumeId(r.data[0].id);
                const apps = await api.get("/job-applications").catch(() => ({ data: [] }));
                if ((apps.data || []).some((a) => a.job_id === id)) setApplied(true);
            }
        } catch { toast.error("Job not found"); }
    }

    async function apply() {
        if (!user) { nav(`/login?redirect=/jobs/${id}`); return; }
        if (!resumeId) { toast.error("Create a resume first"); nav("/dashboard"); return; }
        setApplying(true);
        try {
            await api.post("/job-applications", { job_id: id, resume_id: resumeId, cover_letter: coverLetter });
            toast.success("Application submitted!");
            setApplied(true);
        } catch (err) {
            const d = err?.response?.data?.detail || err?.response?.data;
            if (d?.error === "upgrade_required") {
                toast.error("Applying to jobs requires Job Seeker Pro");
                nav("/pricing");
            } else { toast.error(d?.message || "Could not apply"); }
        } finally { setApplying(false); }
    }

    if (!job) return <div className="p-10 text-center text-[#4A4D57]">Loading…</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
            <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-[#4A4D57] hover:text-[#FF4400] mb-6" data-testid="back-to-jobs">
                <ArrowLeft size={14} weight="bold" /> Back to jobs
            </Link>
            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 rp-rise">
                    <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-[#0D0D12] text-white grid place-items-center font-display font-extrabold text-2xl" style={{ borderRadius: 2 }}>{(job.company || "?").charAt(0)}</div>
                        <div className="flex-1">
                            <h1 className="font-display font-extrabold text-3xl tracking-tight">{job.title}</h1>
                            <div className="text-[#4A4D57] mt-1 flex items-center gap-1"><Buildings size={14} weight="bold" />{job.company}</div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {job.is_featured && <span className="rp-chip rp-chip-orange"><Star weight="fill" size={10} /> Featured</span>}
                                {job.is_verified && <span className="rp-chip rp-chip-success">✓ Verified</span>}
                                <span className="rp-chip">{job.employment_type}</span>
                                <span className="rp-chip">{job.location_type}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-0 mt-6 border border-[#0D0D12]" style={{ borderRadius: 2 }}>
                        <InfoTile label="Location" value={job.location} icon={MapPin} />
                        <InfoTile label="Experience" value={`${job.experience_min}-${job.experience_max || "+"} yrs`} icon={Briefcase} />
                        <InfoTile label="Salary" value={job.salary_min ? `₹${(job.salary_min / 100000).toFixed(1)}L - ₹${(job.salary_max / 100000).toFixed(1)}L` : "—"} icon={CurrencyInr} />
                        <InfoTile label="Applications" value={job.applications_count || 0} last />
                    </div>

                    <div className="mt-8">
                        <div className="rp-overline">Description</div>
                        <div className="mt-3 whitespace-pre-line leading-relaxed text-[#0D0D12]">{job.description}</div>
                    </div>
                    {job.requirements && (
                        <div className="mt-6">
                            <div className="rp-overline">Requirements</div>
                            <div className="mt-3 whitespace-pre-line leading-relaxed text-[#4A4D57]">{job.requirements}</div>
                        </div>
                    )}
                    {(job.skills_required || []).length > 0 && (
                        <div className="mt-6">
                            <div className="rp-overline">Skills</div>
                            <div className="flex flex-wrap gap-1.5 mt-3">
                                {job.skills_required.map((s) => <span key={s} className="rp-chip rp-chip-ink">{s}</span>)}
                            </div>
                        </div>
                    )}
                </div>

                <aside className="lg:col-span-1">
                    <div className="sticky top-24 space-y-4">
                        <div className="border border-[#0D0D12] p-5" style={{ borderRadius: 2 }}>
                            <div className="rp-overline">Apply</div>
                            {applied ? (
                                <div className="mt-4 p-3 bg-[#F4F5F7] text-center text-sm" style={{ borderRadius: 2 }} data-testid="already-applied-msg">
                                    ✓ You've applied. Track progress in <Link to="/dashboard" className="text-[#FF4400] font-bold">Dashboard</Link>.
                                </div>
                            ) : user ? (
                                <>
                                    <label className="block mt-3"><div className="text-[10px] uppercase tracking-wider text-[#4A4D57] font-semibold mb-1">Resume</div>
                                        <select className="rp-input" value={resumeId} onChange={(e) => setResumeId(e.target.value)} data-testid="apply-resume-select">
                                            <option value="">Select a resume…</option>
                                            {myResumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                        </select>
                                    </label>
                                    <label className="block mt-3"><div className="text-[10px] uppercase tracking-wider text-[#4A4D57] font-semibold mb-1">Cover letter (optional)</div>
                                        <textarea className="rp-input min-h-[80px] text-xs" value={coverLetter} onChange={(e) => setCoverLetter(e.target.value)} data-testid="apply-cover-letter" />
                                    </label>
                                    <button onClick={apply} disabled={applying || !resumeId} className="rp-btn-orange w-full mt-4 disabled:opacity-50" data-testid="apply-submit-btn">
                                        {applying ? "Applying…" : "Apply Now"}
                                    </button>
                                </>
                            ) : (
                                <Link to={`/login?redirect=/jobs/${id}`} className="rp-btn-orange w-full mt-4" data-testid="apply-login-cta">Log in to apply</Link>
                            )}
                        </div>

                        {similar.length > 0 && (
                            <div>
                                <div className="rp-overline mb-3">Similar jobs</div>
                                <div className="space-y-2">
                                    {similar.slice(0, 3).map((s) => (
                                        <Link key={s.id} to={`/jobs/${s.id}`} className="block p-3 border border-[#E5E7EB] hover:border-[#0D0D12]" style={{ borderRadius: 2 }}>
                                            <div className="font-bold text-sm truncate">{s.title}</div>
                                            <div className="text-xs text-[#4A4D57]">{s.company} · {s.location}</div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
}

function InfoTile({ label, value, icon: Icon, last }) {
    return (
        <div className={`p-3 ${!last ? "border-r border-b md:border-b-0 border-[#0D0D12]" : "border-b md:border-b-0 border-[#0D0D12]"}`}>
            <div className="flex items-center gap-1 text-[#4A4D57]">{Icon && <Icon size={12} weight="bold" />}<span className="text-[9px] uppercase tracking-widest font-semibold">{label}</span></div>
            <div className="font-display font-bold text-sm mt-1 truncate">{value}</div>
        </div>
    );
}
