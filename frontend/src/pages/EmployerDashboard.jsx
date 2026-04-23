import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Plus, Eye, Users, PencilSimple, Trash, Star } from "@phosphor-icons/react";
import { toast } from "sonner";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, BarElement, LinearScale, CategoryScale, Tooltip } from "chart.js";
ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip);

export default function EmployerDashboard() {
    const [jobs, setJobs] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const nav = useNavigate();

    useEffect(() => {
        api.get("/employer/jobs").then((r) => setJobs(r.data || []));
        api.get("/employer/analytics").then((r) => setAnalytics(r.data)).catch(() => {});
    }, []);

    async function del(id) {
        if (!window.confirm("Delete this listing?")) return;
        await api.delete(`/employer/jobs/${id}`);
        setJobs(jobs.filter((j) => j.id !== id));
    }

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
                <div>
                    <span className="rp-overline">Employer</span>
                    <h1 className="font-display font-extrabold text-4xl mt-2 tracking-tight">Your job listings</h1>
                </div>
                <Link to="/post-job" className="rp-btn-orange" data-testid="employer-post-btn"><Plus weight="bold" size={14} /> Post New Job</Link>
            </div>

            {analytics && (
                <div className="grid md:grid-cols-4 gap-0 border border-[#0D0D12] mb-8" style={{ borderRadius: 2 }}>
                    <EStat label="Total jobs" value={analytics.total_jobs} />
                    <EStat label="Active" value={analytics.active_jobs} />
                    <EStat label="Total views" value={analytics.total_views} />
                    <EStat label="Applications" value={analytics.total_applications} last />
                </div>
            )}

            {analytics?.by_job?.length > 0 && (
                <div className="rp-card p-6 mb-8">
                    <div className="rp-overline">Views vs Applications (top 10)</div>
                    <div className="h-64 mt-4">
                        <Bar data={{
                            labels: analytics.by_job.map((b) => b.title.slice(0, 20)),
                            datasets: [
                                { label: "Views", data: analytics.by_job.map((b) => b.views), backgroundColor: "#0D0D12" },
                                { label: "Applications", data: analytics.by_job.map((b) => b.apps), backgroundColor: "#FF4400" },
                            ],
                        }} options={{ responsive: true, maintainAspectRatio: false }} />
                    </div>
                </div>
            )}

            <div className="space-y-2" data-testid="employer-jobs-list">
                {jobs.length === 0 ? (
                    <div className="border border-dashed border-[#0D0D12] p-10 text-center" style={{ borderRadius: 2 }}>
                        <p className="text-[#4A4D57]">No listings yet.</p>
                        <Link to="/post-job" className="rp-btn-orange mt-4 inline-flex">Post your first job</Link>
                    </div>
                ) : jobs.map((j) => (
                    <div key={j.id} className="rp-card p-5 flex flex-col md:flex-row md:items-center gap-4" data-testid={`emp-job-${j.id}`}>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-display font-bold text-lg truncate">{j.title}</span>
                                {j.is_featured && <span className="rp-chip rp-chip-orange"><Star weight="fill" size={10} /> Featured</span>}
                                {j.is_active ? <span className="rp-chip rp-chip-success">Active</span> : <span className="rp-chip">Inactive</span>}
                            </div>
                            <div className="text-xs text-[#4A4D57] mt-1">{j.location} · {j.employment_type}</div>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1"><Eye size={14} weight="bold" /> {j.views_count}</span>
                            <span className="flex items-center gap-1"><Users size={14} weight="bold" /> {j.applications_count}</span>
                            <Link to={`/employer/jobs/${j.id}`} className="rp-btn-outline !py-1.5 !px-3 !text-xs" data-testid={`emp-view-${j.id}`}>Manage</Link>
                            <button onClick={() => del(j.id)} className="p-1.5 border border-[#E5E7EB] hover:border-[#FF4400] hover:text-[#FF4400]" style={{ borderRadius: 2 }}><Trash size={14} weight="bold" /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EStat({ label, value, last }) {
    return (
        <div className={`p-5 ${!last ? "border-r border-b md:border-b-0 border-[#0D0D12]" : "border-b md:border-b-0 border-[#0D0D12]"}`}>
            <div className="font-display font-extrabold text-3xl">{value}</div>
            <div className="text-xs text-[#4A4D57] uppercase tracking-wider mt-1">{label}</div>
        </div>
    );
}
