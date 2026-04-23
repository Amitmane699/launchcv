/**
 * Employer: manage applicants for a single job.
 */
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { ArrowLeft } from "@phosphor-icons/react";
import { toast } from "sonner";

const STATUSES = ["applied", "shortlisted", "interview", "offer", "rejected"];

export default function EmployerJobManage() {
    const { id } = useParams();
    const [job, setJob] = useState(null);
    const [apps, setApps] = useState([]);

    useEffect(() => { load(); }, [id]);

    async function load() {
        const [j, a] = await Promise.all([
            api.get(`/jobs/${id}`),
            api.get(`/employer/jobs/${id}/applicants`).catch(() => ({ data: [] })),
        ]);
        setJob(j.data); setApps(a.data || []);
    }

    async function updateStatus(appId, status) {
        await api.put(`/employer/applicants/${appId}`, { status });
        toast.success("Updated");
        load();
    }

    if (!job) return <div className="p-10 text-[#4A4D57]">Loading…</div>;

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
            <Link to="/employer" className="inline-flex items-center gap-1 text-sm text-[#4A4D57] hover:text-[#FF4400] mb-6">
                <ArrowLeft size={14} weight="bold" /> Back
            </Link>
            <span className="rp-overline">Manage</span>
            <h1 className="font-display font-extrabold text-3xl mt-1 tracking-tight">{job.title}</h1>
            <p className="text-[#4A4D57]">{job.company} · {apps.length} applicants</p>

            <div className="mt-6 border border-[#0D0D12] overflow-x-auto" style={{ borderRadius: 2 }}>
                <table className="w-full text-sm" data-testid="applicants-table">
                    <thead className="bg-[#F4F5F7] border-b border-[#0D0D12]">
                        <tr>
                            <th className="text-left p-3 text-[10px] uppercase tracking-wider">Name</th>
                            <th className="text-left p-3 text-[10px] uppercase tracking-wider">Email</th>
                            <th className="text-left p-3 text-[10px] uppercase tracking-wider">Phone</th>
                            <th className="text-left p-3 text-[10px] uppercase tracking-wider">ATS</th>
                            <th className="text-left p-3 text-[10px] uppercase tracking-wider">Applied</th>
                            <th className="text-left p-3 text-[10px] uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {apps.length === 0 && <tr><td colSpan="6" className="p-10 text-center text-[#4A4D57]">No applicants yet.</td></tr>}
                        {apps.map((a) => (
                            <tr key={a.id} className="border-b border-[#E5E7EB]">
                                <td className="p-3">{a.applicant_name || "—"}</td>
                                <td className="p-3 text-xs">{a.applicant_email}</td>
                                <td className="p-3 text-xs">{a.applicant_phone || "—"}</td>
                                <td className="p-3">
                                    {a.ats_score ? (
                                        <span className={`font-display font-bold text-lg ${a.ats_score >= 80 ? "text-[#00A859]" : a.ats_score >= 60 ? "text-[#FFB300]" : "text-[#EF4444]"}`}>{a.ats_score}</span>
                                    ) : "—"}
                                </td>
                                <td className="p-3 text-xs">{a.applied_at?.slice(0, 10)}</td>
                                <td className="p-3">
                                    <select value={a.status} onChange={(e) => updateStatus(a.id, e.target.value)} className="rp-input !py-1 !px-2 !text-xs" data-testid={`applicant-status-${a.id}`}>
                                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
