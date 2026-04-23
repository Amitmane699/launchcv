import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { toast } from "sonner";

const CATEGORIES = ["engineering", "design", "data", "marketing", "sales", "operations", "finance", "hr"];

export default function PostJob() {
    const nav = useNavigate();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: "", company: "", location: "", location_type: "onsite",
        employment_type: "fulltime", experience_min: 0, experience_max: 3,
        salary_min: "", salary_max: "", description: "", requirements: "",
        skills_required: "", category: "engineering", apply_on_platform: true,
    });

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...form,
                experience_min: Number(form.experience_min),
                experience_max: form.experience_max ? Number(form.experience_max) : null,
                salary_min: form.salary_min ? Number(form.salary_min) : null,
                salary_max: form.salary_max ? Number(form.salary_max) : null,
                skills_required: form.skills_required.split(",").map((s) => s.trim()).filter(Boolean),
            };
            const j = await api.post("/employer/jobs", payload);
            toast.success("Job created. Complete payment to publish.");
            // Route to payment
            nav(`/checkout?type=job_post&job_id=${j.data.id}`);
        } catch (err) {
            toast.error(err?.response?.data?.detail || "Could not post job");
        } finally { setLoading(false); }
    }

    function upd(k, v) { setForm({ ...form, [k]: v }); }

    return (
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-10">
            <span className="rp-overline">Employer</span>
            <h1 className="font-display font-extrabold text-4xl mt-2 tracking-tight">Post a new job</h1>
            <p className="text-[#4A4D57] mt-1">Your listing becomes live after ₹999 standard listing payment.</p>

            <form onSubmit={submit} className="mt-8 space-y-6" data-testid="post-job-form">
                <Card title="Basics">
                    <Grid>
                        <F label="Job title"><input required className="rp-input" value={form.title} onChange={(e) => upd("title", e.target.value)} data-testid="job-title-input" /></F>
                        <F label="Company"><input required className="rp-input" value={form.company} onChange={(e) => upd("company", e.target.value)} data-testid="job-company-input" /></F>
                        <F label="Location"><input required className="rp-input" placeholder="Bengaluru, KA" value={form.location} onChange={(e) => upd("location", e.target.value)} /></F>
                        <F label="Work style">
                            <select className="rp-input" value={form.location_type} onChange={(e) => upd("location_type", e.target.value)}>
                                <option value="onsite">On-site</option><option value="remote">Remote</option><option value="hybrid">Hybrid</option>
                            </select>
                        </F>
                        <F label="Type">
                            <select className="rp-input" value={form.employment_type} onChange={(e) => upd("employment_type", e.target.value)}>
                                <option value="fulltime">Full time</option><option value="parttime">Part time</option><option value="contract">Contract</option><option value="internship">Internship</option>
                            </select>
                        </F>
                        <F label="Category">
                            <select className="rp-input" value={form.category} onChange={(e) => upd("category", e.target.value)}>
                                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </F>
                    </Grid>
                </Card>

                <Card title="Compensation & Experience">
                    <Grid>
                        <F label="Min experience (yrs)"><input type="number" className="rp-input" value={form.experience_min} onChange={(e) => upd("experience_min", e.target.value)} /></F>
                        <F label="Max experience (yrs)"><input type="number" className="rp-input" value={form.experience_max} onChange={(e) => upd("experience_max", e.target.value)} /></F>
                        <F label="Min salary (₹)"><input type="number" className="rp-input" value={form.salary_min} onChange={(e) => upd("salary_min", e.target.value)} /></F>
                        <F label="Max salary (₹)"><input type="number" className="rp-input" value={form.salary_max} onChange={(e) => upd("salary_max", e.target.value)} /></F>
                    </Grid>
                </Card>

                <Card title="Description">
                    <F label="Full job description"><textarea required className="rp-input min-h-[160px]" value={form.description} onChange={(e) => upd("description", e.target.value)} data-testid="job-desc-input" /></F>
                    <F label="Requirements"><textarea className="rp-input min-h-[80px]" value={form.requirements} onChange={(e) => upd("requirements", e.target.value)} /></F>
                    <F label="Skills (comma-separated)"><input className="rp-input" placeholder="React, TypeScript, CSS" value={form.skills_required} onChange={(e) => upd("skills_required", e.target.value)} /></F>
                </Card>

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => nav("/employer")} className="rp-btn-outline">Cancel</button>
                    <button type="submit" disabled={loading} className="rp-btn-orange disabled:opacity-50" data-testid="post-job-submit">{loading ? "…" : "Continue to Payment (₹999)"}</button>
                </div>
            </form>
        </div>
    );
}

function Card({ title, children }) { return <div className="border border-[#0D0D12] p-5 space-y-3" style={{ borderRadius: 2 }}><div className="rp-overline">{title}</div>{children}</div>; }
function Grid({ children }) { return <div className="grid md:grid-cols-2 gap-3">{children}</div>; }
function F({ label, children }) { return <label className="block"><div className="text-[10px] uppercase tracking-wider text-[#4A4D57] font-semibold mb-1">{label}</div>{children}</label>; }
