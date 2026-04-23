import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useT } from "../lib/i18n";
import { MagnifyingGlass, MapPin, Briefcase, Star, CurrencyInr } from "@phosphor-icons/react";
import { toast } from "sonner";

const CATEGORIES = ["engineering", "design", "data", "marketing", "sales", "operations", "finance", "hr"];
const EMP_TYPES = ["fulltime", "parttime", "contract", "internship", "freelance"];
const LOC_TYPES = ["onsite", "remote", "hybrid"];

export default function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ search: "", location: "", category: "", employment_type: "", location_type: "" });
    const [saved, setSaved] = useState(new Set());
    const { user } = useAuthStore();
    const t = useT();

    useEffect(() => { load(); }, [filters]);
    useEffect(() => { if (user) loadSaved(); }, [user]);

    async function load() {
        setLoading(true);
        const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
        try {
            const r = await api.get("/jobs", { params });
            setJobs(r.data.items || []);
            setTotal(r.data.total || 0);
        } finally { setLoading(false); }
    }

    async function loadSaved() {
        try {
            const r = await api.get("/saved-jobs");
            setSaved(new Set(r.data.map((j) => j.id)));
        } catch {}
    }

    async function toggleSave(id) {
        if (!user) { toast.error("Log in to save jobs"); return; }
        if (saved.has(id)) {
            await api.delete(`/saved-jobs/${id}`);
            saved.delete(id); setSaved(new Set(saved));
        } else {
            await api.post(`/saved-jobs/${id}`);
            saved.add(id); setSaved(new Set(saved));
            toast.success("Saved");
        }
    }

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
            <div className="mb-6">
                <span className="rp-overline">Job Board</span>
                <h1 className="font-display font-extrabold text-4xl mt-2 tracking-tight">Find your next role</h1>
                <p className="text-[#4A4D57] mt-1">{total} opportunities — verified by LaunchCV ATS.</p>
            </div>

            {/* Search bar */}
            <div className="flex flex-col md:flex-row gap-2 mb-6 rp-rise">
                <div className="relative flex-1">
                    <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-[#4A4D57]" size={16} />
                    <input className="rp-input pl-10" placeholder={t.searchJobs} value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} data-testid="jobs-search-input" />
                </div>
                <input className="rp-input md:w-56" placeholder="Location (Bengaluru, Remote...)" value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} data-testid="jobs-location-input" />
            </div>

            <div className="grid lg:grid-cols-12 gap-6">
                {/* Sidebar filters */}
                <aside className="lg:col-span-3 space-y-6" data-testid="jobs-sidebar">
                    <FilterGroup label="Category">
                        {CATEGORIES.map((c) => (
                            <Chip key={c} active={filters.category === c} onClick={() => setFilters({ ...filters, category: filters.category === c ? "" : c })} testid={`filter-cat-${c}`}>{c}</Chip>
                        ))}
                    </FilterGroup>
                    <FilterGroup label="Type">
                        {EMP_TYPES.map((c) => (
                            <Chip key={c} active={filters.employment_type === c} onClick={() => setFilters({ ...filters, employment_type: filters.employment_type === c ? "" : c })} testid={`filter-type-${c}`}>{c}</Chip>
                        ))}
                    </FilterGroup>
                    <FilterGroup label="Work style">
                        {LOC_TYPES.map((c) => (
                            <Chip key={c} active={filters.location_type === c} onClick={() => setFilters({ ...filters, location_type: filters.location_type === c ? "" : c })} testid={`filter-loc-${c}`}>{c}</Chip>
                        ))}
                    </FilterGroup>
                </aside>

                {/* Jobs list */}
                <div className="lg:col-span-9">
                    {loading ? <div className="text-[#4A4D57]">Loading jobs…</div> :
                     jobs.length === 0 ? <div className="border border-dashed border-[#0D0D12] p-10 text-center" style={{ borderRadius: 2 }}>No jobs match. Try clearing filters.</div> :
                     <div className="space-y-3">
                         {jobs.map((j, i) => (
                             <JobCard key={j.id} job={j} saved={saved.has(j.id)} onToggleSave={() => toggleSave(j.id)} index={i} />
                         ))}
                     </div>
                    }
                </div>
            </div>
        </div>
    );
}

export function JobCard({ job, saved, onToggleSave, index = 0 }) {
    return (
        <div className={`rp-card p-5 flex flex-col md:flex-row gap-4 rp-rise rp-rise-${Math.min(index + 1, 4)}`} data-testid={`job-card-${job.id}`}>
            <div className="w-12 h-12 shrink-0 bg-[#0D0D12] text-white grid place-items-center font-display font-extrabold text-lg" style={{ borderRadius: 2 }}>
                {(job.company || "?").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <Link to={`/jobs/${job.id}`} className="font-display font-bold text-lg hover:text-[#FF4400] transition-colors block truncate" data-testid={`job-title-${job.id}`}>
                            {job.title}
                        </Link>
                        <div className="text-sm text-[#4A4D57] mt-0.5">{job.company}</div>
                    </div>
                    <div className="flex gap-1 flex-wrap items-center">
                        {job.is_featured && <span className="rp-chip rp-chip-orange flex items-center gap-1"><Star weight="fill" size={10} /> Featured</span>}
                        {job.is_verified && <span className="rp-chip rp-chip-success">✓ Verified</span>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-[#4A4D57]">
                    <span className="flex items-center gap-1"><MapPin size={12} weight="bold" /> {job.location} · {job.location_type}</span>
                    <span className="flex items-center gap-1"><Briefcase size={12} weight="bold" /> {job.employment_type}</span>
                    {job.salary_min && <span className="flex items-center gap-1"><CurrencyInr size={12} weight="bold" /> {formatLpa(job.salary_min)}–{formatLpa(job.salary_max)} LPA</span>}
                    {typeof job.experience_min === "number" && <span>Exp: {job.experience_min}–{job.experience_max || "+"} yrs</span>}
                </div>
                <p className="text-sm text-[#4A4D57] mt-3 line-clamp-2">{job.description}</p>
                <div className="flex gap-2 mt-4">
                    <Link to={`/jobs/${job.id}`} className="rp-btn-primary !py-2 !px-4 !text-xs" data-testid={`job-view-${job.id}`}>View & Apply</Link>
                    {onToggleSave && (
                        <button onClick={onToggleSave} className={`px-3 py-2 text-xs font-semibold border transition-colors ${saved ? "bg-[#FF4400] text-white border-[#FF4400]" : "border-[#E5E7EB] hover:border-[#0D0D12]"}`} style={{ borderRadius: 2 }} data-testid={`job-save-${job.id}`}>
                            {saved ? "★ Saved" : "☆ Save"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatLpa(paise) { return (paise / 100000).toFixed(paise >= 1000000 ? 0 : 1); }

function FilterGroup({ label, children }) {
    return (
        <div>
            <div className="rp-overline mb-2">{label}</div>
            <div className="flex flex-wrap gap-1">{children}</div>
        </div>
    );
}
function Chip({ active, onClick, children, testid }) {
    return (
        <button onClick={onClick} data-testid={testid} className={`text-xs px-2.5 py-1 font-medium capitalize border transition-colors ${active ? "bg-[#0D0D12] text-white border-[#0D0D12]" : "bg-white text-[#0D0D12] border-[#E5E7EB] hover:border-[#0D0D12]"}`} style={{ borderRadius: 2 }}>
            {children}
        </button>
    );
}
