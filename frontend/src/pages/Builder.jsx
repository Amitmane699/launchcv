/**
 * Resume Builder — split-screen form + live preview.
 */
import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, API_BASE } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { toast } from "sonner";
import { ArrowLeft, DownloadSimple, FloppyDisk, Plus, Trash, Gauge, CheckCircle, Warning, FileText, Copy, Printer, CaretDown, Sparkle } from "@phosphor-icons/react";
import ResumePreview, { TEMPLATES } from "../components/ResumePreview";
import TipsSidebar from "../components/TipsSidebar";

const EMPTY_EXP = { role: "", company: "", location: "", duration: "", description: "", bullets: [""] };
const EMPTY_EDU = { degree: "", field: "", school: "", duration: "", grade: "" };
const EMPTY_PROJ = { name: "", description: "", bullets: [""] };

export default function Builder() {
    const { id } = useParams();
    const nav = useNavigate();
    const { user } = useAuthStore();
    const [resume, setResume] = useState(null);
    const [saving, setSaving] = useState(false);
    const [jd, setJd] = useState("");
    const [atsResult, setAtsResult] = useState(null);
    const [scoring, setScoring] = useState(false);

    useEffect(() => { if (id) load(); }, [id]);
    useEffect(() => { if (resume && rightTab === "selfcheck") runSelfCheck(); }, [resume?.data, rightTab]);

    async function load() {
        try {
            const r = await api.get(`/resumes/${id}`);
            setResume(r.data);
        } catch {
            toast.error("Resume not found");
            nav("/dashboard");
        }
    }

    const debouncedSave = useCallback(
        debounce(async (patch) => {
            setSaving(true);
            try { await api.put(`/resumes/${id}`, patch); }
            catch { toast.error("Auto-save failed"); }
            finally { setSaving(false); }
        }, 800),
        [id],
    );

    function update(path, value) {
        setResume((prev) => {
            const next = JSON.parse(JSON.stringify(prev));
            setByPath(next.data, path, value);
            debouncedSave({ data: next.data });
            return next;
        });
    }

    function setMeta(key, value) {
        setResume((prev) => ({ ...prev, [key]: value }));
        debouncedSave({ [key]: value });
    }

    async function runAts() {
        if (!jd.trim()) { toast.error("Paste a job description first"); return; }
        setScoring(true);
        try {
            const r = await api.post("/ats/score", { resume_id: id, jd });
            setAtsResult(r.data);
        } catch (err) {
            const d = err?.response?.data?.detail || err?.response?.data;
            if (d?.error === "upgrade_required") { toast.error("ATS check limit reached"); nav("/pricing"); }
            else toast.error("Could not score");
        } finally { setScoring(false); }
    }

    async function runSelfCheck() {
        try {
            const r = await api.post("/ats/self-check", { resume_id: id });
            setSelfCheck(r.data);
        } catch { /* silent */ }
    }

    function addMissingSkill(keyword) {
        const current = (resume.data?.skills || []);
        if (current.some((s) => s.toLowerCase() === keyword.toLowerCase())) {
            toast.info("Already in skills"); return;
        }
        update("skills", [...current, keyword]);
        toast.success(`Added "${keyword}" to skills`);
    }

    async function downloadTxt() {
        try {
            const token = useAuthStore.getState().token;
            const res = await fetch(`${API_BASE}/api/resumes/${id}/export/txt`, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error();
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `${resume.name}.txt`; a.click();
            URL.revokeObjectURL(url);
            toast.success("TXT downloaded");
        } catch { toast.error("Could not download"); }
    }

    async function copyToClipboard() {
        try {
            const token = useAuthStore.getState().token;
            const res = await fetch(`${API_BASE}/api/resumes/${id}/export/txt`, { headers: { Authorization: `Bearer ${token}` } });
            const txt = await res.text();
            await navigator.clipboard.writeText(txt);
            toast.success("Resume text copied!");
        } catch { toast.error("Could not copy"); }
    }

    function printResume() {
        const el = document.querySelector('[data-testid="resume-preview"]');
        if (!el) return;
        const w = window.open("", "_blank", "width=800,height=1000");
        if (!w) { toast.error("Pop-up blocked"); return; }
        w.document.write(`<html><head><title>${resume.name}</title><style>body{margin:0;font-family:Helvetica,Arial,sans-serif;}@media print{body{-webkit-print-color-adjust:exact;}}</style></head><body>${el.outerHTML}</body></html>`);
        w.document.close();
        setTimeout(() => { w.print(); }, 400);
    }

    async function downloadDocx() {
        try {
            const token = useAuthStore.getState().token;
            const res = await fetch(`${API_BASE}/api/resumes/${id}/export/docx`, {
                method: "POST", headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                if (j?.detail?.error === "upgrade_required") {
                    toast.error("DOCX export requires Resume Pro plan or higher.");
                    nav("/pricing"); return;
                }
                throw new Error("Download failed");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `${resume.name}.docx`; a.click();
            URL.revokeObjectURL(url);
            toast.success("DOCX downloaded");
        } catch { toast.error("Could not download DOCX"); }
    }

    async function downloadPdf() {
        try {
            const token = useAuthStore.getState().token;
            const res = await fetch(`${API_BASE}/api/resumes/${id}/export/pdf`, {
                method: "POST", headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                if (j?.detail?.error === "upgrade_required") {
                    toast.error("Download limit reached. Upgrade or buy a single download.");
                    nav("/pricing"); return;
                }
                throw new Error("Download failed");
            }
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `${resume.name}.pdf`; a.click();
            URL.revokeObjectURL(url);
            toast.success("PDF downloaded");
        } catch { toast.error("Could not download"); }
    }

    if (!resume) return <div className="p-10 text-center text-[#4A4D57]">Loading resume…</div>;
    const d = resume.data || {};
    const personal = d.personal || {};
    const completion = resume.completion_pct || 0;

    return (
        <div className="min-h-[calc(100vh-80px)]">
            {/* Top bar */}
            <div className="border-b border-[#E5E7EB] bg-white sticky top-[65px] z-20">
                <div className="max-w-[1600px] mx-auto px-4 md:px-8 py-3 flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                        <Link to="/dashboard" className="p-2 border border-[#E5E7EB] hover:border-[#0D0D12]" style={{ borderRadius: 2 }} data-testid="builder-back">
                            <ArrowLeft size={14} weight="bold" />
                        </Link>
                        <input value={resume.name} onChange={(e) => setMeta("name", e.target.value)} className="font-display font-bold text-xl bg-transparent border-b border-dashed border-transparent hover:border-[#0D0D12] focus:border-[#FF4400] outline-none px-1" data-testid="builder-name-input" />
                        <span className="text-xs text-[#4A4D57]">{saving ? "Saving…" : "Saved"}</span>
                    </div>
                    <div className="flex-1 max-w-xs hidden md:flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-[#4A4D57]">{completion}%</span>
                        <div className="flex-1 h-1.5 bg-[#F4F5F7]" style={{ borderRadius: 1 }}>
                            <div className="h-1.5 transition-all duration-300" style={{ width: `${completion}%`, background: completion >= 70 ? "#00A859" : completion >= 40 ? "#FFB300" : "#EF4444", borderRadius: 1 }} data-testid="completion-bar" />
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button onClick={copyToClipboard} className="p-2 border border-[#E5E7EB] hover:border-[#0D0D12]" title="Copy to clipboard" style={{ borderRadius: 2 }} data-testid="builder-copy-btn"><Copy size={14} weight="bold" /></button>
                        <button onClick={printResume} className="p-2 border border-[#E5E7EB] hover:border-[#0D0D12]" title="Print" style={{ borderRadius: 2 }} data-testid="builder-print-btn"><Printer size={14} weight="bold" /></button>
                        <button onClick={downloadTxt} className="rp-btn-outline !py-2 !px-3 !text-xs" data-testid="builder-txt-btn"><FileText size={12} weight="bold" /> TXT</button>
                        <button onClick={downloadDocx} className="rp-btn-outline !py-2 !px-3 !text-xs" data-testid="builder-docx-btn"><FileText size={12} weight="bold" /> DOCX</button>
                        <button onClick={downloadPdf} className="rp-btn-primary !py-2 !px-3 !text-xs" data-testid="builder-download-btn"><DownloadSimple size={12} weight="bold" /> PDF</button>
                    </div>
                </div>
            </div>

            <div className="grid lg:grid-cols-12 gap-0 max-w-[1600px] mx-auto">
                {/* ── LEFT: form ── */}
                <div className="lg:col-span-5 border-r border-[#E5E7EB] p-4 md:p-6 space-y-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 130px)" }}>
                    {/* Templates */}
                    <Section title="Template">
                        <div className="grid grid-cols-5 gap-2">
                            {TEMPLATES.slice(0, 10).map((t) => (
                                <button
                                    key={t.id}
                                    onClick={() => setMeta("template_id", t.id)}
                                    className={`p-2 text-left border transition-all ${resume.template_id === t.id ? "border-[#FF4400] bg-[#FFF5EF]" : "border-[#E5E7EB] hover:border-[#0D0D12]"}`}
                                    style={{ borderRadius: 2 }}
                                    data-testid={`template-${t.id}`}
                                >
                                    <div className="h-14 bg-white border border-[#E5E7EB] mb-1 relative overflow-hidden" style={{ borderRadius: 2 }}>
                                        <TemplateThumbnail id={t.id} />
                                    </div>
                                    <div className="text-[10px] font-bold truncate">{t.name}</div>
                                </button>
                            ))}
                        </div>
                        <Link to="/templates" className="text-xs text-[#FF4400] font-bold mt-2 inline-block">See all 13 templates →</Link>
                    </Section>

                    {/* Personal */}
                    <Section title="Personal" onClick={() => setActiveSection("personal")}>
                        <Grid>
                            <F label="Full name"><input className="rp-input" value={personal.fullName || ""} onChange={(e) => update("personal.fullName", e.target.value)} data-testid="field-fullName" /></F>
                            <F label="Headline"><input className="rp-input" placeholder="e.g. Senior Backend Engineer" value={personal.headline || ""} onChange={(e) => update("personal.headline", e.target.value)} data-testid="field-headline" /></F>
                            <F label="Email"><input className="rp-input" value={personal.email || ""} onChange={(e) => update("personal.email", e.target.value)} data-testid="field-email" /></F>
                            <F label="Phone"><input className="rp-input" value={personal.phone || ""} onChange={(e) => update("personal.phone", e.target.value)} data-testid="field-phone" /></F>
                            <F label="Location"><input className="rp-input" value={personal.location || ""} onChange={(e) => update("personal.location", e.target.value)} data-testid="field-location" /></F>
                            <F label="LinkedIn"><input className="rp-input" value={personal.linkedin || ""} onChange={(e) => update("personal.linkedin", e.target.value)} data-testid="field-linkedin" /></F>
                        </Grid>
                    </Section>

                    {/* Summary */}
                    <Section title="Summary" onClick={() => setActiveSection("summary")}>
                        <textarea className="rp-input min-h-[100px] resize-y" placeholder="2-3 lines about you and your impact..." value={d.summary || ""} onChange={(e) => update("summary", e.target.value)} data-testid="field-summary" />
                    </Section>

                    {/* Experience */}
                    <Section title="Experience" addLabel="Add role" onAdd={() => update("experience", [...(d.experience || []), { ...EMPTY_EXP, bullets: [""] }])} testid="add-exp" onClick={() => setActiveSection("experience")}>
                        {(d.experience || []).map((exp, i) => (
                            <div key={i} className="border border-[#E5E7EB] p-3 space-y-2" style={{ borderRadius: 2 }} data-testid={`exp-item-${i}`}>
                                <div className="flex justify-between items-center">
                                    <div className="rp-overline text-[10px]">Role #{i + 1}</div>
                                    <button onClick={() => update("experience", (d.experience || []).filter((_, idx) => idx !== i))} className="text-[#FF4400]" data-testid={`del-exp-${i}`}><Trash size={14} /></button>
                                </div>
                                <Grid>
                                    <F label="Role"><input className="rp-input" value={exp.role || ""} onChange={(e) => update(`experience.${i}.role`, e.target.value)} /></F>
                                    <F label="Company"><input className="rp-input" value={exp.company || ""} onChange={(e) => update(`experience.${i}.company`, e.target.value)} /></F>
                                    <F label="Duration"><input className="rp-input" placeholder="Jan 2023 — Present" value={exp.duration || ""} onChange={(e) => update(`experience.${i}.duration`, e.target.value)} /></F>
                                    <F label="Location"><input className="rp-input" value={exp.location || ""} onChange={(e) => update(`experience.${i}.location`, e.target.value)} /></F>
                                </Grid>
                                <F label="Bullets">
                                    {(exp.bullets || []).map((b, j) => (
                                        <div key={j} className="flex gap-1 mb-1">
                                            <input className="rp-input" value={b} placeholder={`• Built X that delivered Y`} onChange={(e) => update(`experience.${i}.bullets.${j}`, e.target.value)} />
                                            <button onClick={() => update(`experience.${i}.bullets`, (exp.bullets || []).filter((_, k) => k !== j))} className="p-2 border border-[#E5E7EB]" style={{ borderRadius: 2 }}><Trash size={12} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => update(`experience.${i}.bullets`, [...(exp.bullets || []), ""])} className="text-xs text-[#FF4400] font-bold">+ Add bullet</button>
                                </F>
                            </div>
                        ))}
                    </Section>

                    {/* Skills */}
                    <Section title="Skills" onClick={() => setActiveSection("skills")}>
                        <F label="Comma-separated skills">
                            <input className="rp-input" placeholder="Python, FastAPI, PostgreSQL, React…" value={(d.skills || []).join(", ")} onChange={(e) => update("skills", e.target.value.split(",").map(s => s.trim()).filter(Boolean))} data-testid="field-skills" />
                        </F>
                    </Section>

                    {/* Education */}
                    <Section title="Education" addLabel="Add degree" onAdd={() => update("education", [...(d.education || []), { ...EMPTY_EDU }])} testid="add-edu" onClick={() => setActiveSection("education")}>
                        {(d.education || []).map((edu, i) => (
                            <div key={i} className="border border-[#E5E7EB] p-3" style={{ borderRadius: 2 }}>
                                <div className="flex justify-between items-center">
                                    <div className="rp-overline text-[10px]">Degree #{i + 1}</div>
                                    <button onClick={() => update("education", (d.education || []).filter((_, idx) => idx !== i))} className="text-[#FF4400]"><Trash size={14} /></button>
                                </div>
                                <Grid>
                                    <F label="Degree"><input className="rp-input" value={edu.degree || ""} onChange={(e) => update(`education.${i}.degree`, e.target.value)} /></F>
                                    <F label="Field"><input className="rp-input" value={edu.field || ""} onChange={(e) => update(`education.${i}.field`, e.target.value)} /></F>
                                    <F label="School"><input className="rp-input" value={edu.school || ""} onChange={(e) => update(`education.${i}.school`, e.target.value)} /></F>
                                    <F label="Duration"><input className="rp-input" value={edu.duration || ""} onChange={(e) => update(`education.${i}.duration`, e.target.value)} /></F>
                                </Grid>
                            </div>
                        ))}
                    </Section>

                    {/* Projects */}
                    <Section title="Projects" addLabel="Add project" onAdd={() => update("projects", [...(d.projects || []), { ...EMPTY_PROJ, bullets: [""] }])} testid="add-proj" onClick={() => setActiveSection("projects")}>
                        {(d.projects || []).map((pr, i) => (
                            <div key={i} className="border border-[#E5E7EB] p-3 space-y-2" style={{ borderRadius: 2 }}>
                                <div className="flex justify-between items-center">
                                    <div className="rp-overline text-[10px]">Project #{i + 1}</div>
                                    <button onClick={() => update("projects", (d.projects || []).filter((_, idx) => idx !== i))} className="text-[#FF4400]"><Trash size={14} /></button>
                                </div>
                                <F label="Name"><input className="rp-input" value={pr.name || ""} onChange={(e) => update(`projects.${i}.name`, e.target.value)} /></F>
                                <F label="Description"><textarea className="rp-input" value={pr.description || ""} onChange={(e) => update(`projects.${i}.description`, e.target.value)} /></F>
                            </div>
                        ))}
                    </Section>
                </div>

                {/* ── CENTER: preview ── */}
                <div className="lg:col-span-4 bg-[#F4F5F7] p-4 md:p-6 overflow-y-auto" style={{ maxHeight: "calc(100vh - 130px)" }}>
                    <div className="rp-overline mb-3">Live preview</div>
                    <div className="bg-white shadow-sm mx-auto" style={{ maxWidth: 600 }}>
                        <ResumePreview resume={resume} />
                    </div>
                </div>

                {/* ── RIGHT: ATS + Tips ── */}
                <div className="lg:col-span-3 p-4 md:p-6 space-y-4 overflow-y-auto" style={{ maxHeight: "calc(100vh - 130px)" }}>
                    {/* Tab switcher */}
                    <div className="flex border border-[#0D0D12]" style={{ borderRadius: 2 }} data-testid="right-tabs">
                        <TabBtn active={rightTab === "selfcheck"} onClick={() => setRightTab("selfcheck")} testid="tab-selfcheck">ATS Check</TabBtn>
                        <TabBtn active={rightTab === "jd"} onClick={() => setRightTab("jd")} testid="tab-jd">Match JD</TabBtn>
                        <TabBtn active={rightTab === "tips"} onClick={() => setRightTab("tips")} testid="tab-tips">Tips</TabBtn>
                    </div>

                    {rightTab === "selfcheck" && (
                        <SelfCheckPanel result={selfCheck} onRefresh={runSelfCheck} />
                    )}

                    {rightTab === "jd" && (
                        <>
                            <div>
                                <div className="flex items-center gap-2"><Gauge size={16} weight="duotone" className="text-[#FF4400]" /><span className="rp-overline">Match to Job</span></div>
                                <textarea
                                    value={jd} onChange={(e) => setJd(e.target.value)}
                                    placeholder="Paste the full job description here…"
                                    className="rp-input min-h-[140px] mt-3 resize-y text-xs" data-testid="jd-input"
                                />
                                <button onClick={runAts} disabled={scoring} className="rp-btn-orange w-full mt-2 disabled:opacity-50" data-testid="run-ats-btn">
                                    {scoring ? "Scoring…" : "Run JD Match"}
                                </button>
                            </div>

                            {atsResult && (
                                <div className="space-y-4 rp-rise">
                                    <ScoreGauge score={atsResult.score} />
                                    <div>
                                        <div className="rp-overline">Breakdown</div>
                                        <div className="space-y-2 mt-2 text-xs">
                                            {Object.entries(atsResult.breakdown).map(([k, v]) => (
                                                <div key={k} className="flex justify-between border-b border-[#E5E7EB] py-1">
                                                    <span className="capitalize text-[#4A4D57]">{k.replace(/([A-Z])/g, " $1").trim()}</span>
                                                    <span className="font-mono font-bold">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {atsResult.matchedKeywords?.length > 0 && (
                                        <div>
                                            <div className="rp-overline text-[#00A859]">✓ Matched ({atsResult.matchedKeywords.length})</div>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {atsResult.matchedKeywords.slice(0, 20).map((k) => (
                                                    <span key={k} className="rp-chip rp-chip-success">{k}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {atsResult.missingKeywords?.length > 0 && (
                                        <div>
                                            <div className="rp-overline text-[#FF4400]">✗ Missing — click to add</div>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {atsResult.missingKeywords.slice(0, 15).map((k) => (
                                                    <button key={k} onClick={() => addMissingSkill(k)} className="rp-chip hover:bg-[#FF4400] hover:text-white transition-colors cursor-pointer" style={{ borderColor: "#FF4400", color: "#FF4400" }} data-testid={`missing-kw-${k}`}>
                                                        + {k}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {rightTab === "tips" && <TipsSidebar activeSection={activeSection} />}
                </div>
            </div>
        </div>
    );
}

function ScoreGauge({ score }) {
    const color = score >= 80 ? "#00A859" : score >= 60 ? "#FFB300" : "#EF4444";
    return (
        <div className="text-center p-4 border border-[#0D0D12]" style={{ borderRadius: 2 }} data-testid="ats-score-gauge">
            <div className="rp-overline">Overall Score</div>
            <div className="font-display font-extrabold text-6xl mt-2" style={{ color }}>{score}</div>
            <div className="text-xs text-[#4A4D57] mt-1">out of 100</div>
            <div className="w-full bg-[#E5E7EB] h-1.5 mt-3" style={{ borderRadius: 1 }}>
                <div className="h-1.5" style={{ width: `${score}%`, background: color, borderRadius: 1 }} />
            </div>
        </div>
    );
}

function TabBtn({ active, onClick, children, testid }) {
    return (
        <button onClick={onClick} className={`flex-1 py-2 text-xs font-semibold transition-colors ${active ? "bg-[#0D0D12] text-white" : "bg-white hover:bg-[#F4F5F7]"}`} data-testid={testid}>
            {children}
        </button>
    );
}

function SelfCheckPanel({ result, onRefresh }) {
    if (!result) return <div className="p-6 text-xs text-[#4A4D57] text-center">Building your score…</div>;
    const barColor = result.level === "green" ? "#00A859" : result.level === "yellow" ? "#FFB300" : "#EF4444";
    return (
        <div className="space-y-4" data-testid="selfcheck-panel">
            <div className="text-center p-4 border border-[#0D0D12]" style={{ borderRadius: 2 }}>
                <div className="rp-overline">ATS Score</div>
                <div className="font-display font-extrabold text-6xl mt-2" style={{ color: barColor }}>{result.score}</div>
                <div className="text-xs text-[#4A4D57] mt-1">out of 100 · {result.word_count} words</div>
                <div className="w-full bg-[#E5E7EB] h-1.5 mt-3" style={{ borderRadius: 1 }}>
                    <div className="h-1.5 transition-all" style={{ width: `${result.score}%`, background: barColor, borderRadius: 1 }} />
                </div>
            </div>
            <div className="space-y-2">
                {result.checks.map((c, i) => (
                    <div key={i} className="flex gap-2 items-start p-2 border border-[#E5E7EB] text-xs" style={{ borderRadius: 2 }} data-testid={`check-${i}`}>
                        {c.status === "pass" ? <CheckCircle weight="fill" size={14} className="text-[#00A859] shrink-0 mt-0.5" /> :
                         c.status === "warn" ? <Warning weight="fill" size={14} className="text-[#FFB300] shrink-0 mt-0.5" /> :
                         <Warning weight="fill" size={14} className="text-[#EF4444] shrink-0 mt-0.5" />}
                        <div className="flex-1">
                            <div className="font-semibold">{c.label}</div>
                            <div className="text-[#4A4D57] text-[11px] mt-0.5">{c.tip}</div>
                        </div>
                        <span className="text-[10px] font-mono font-bold shrink-0">{c.earned}/{c.points}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TemplateThumbnail({ id }) {
    const palette = {
        classic: { bar: "#0D0D12", text: "#4A4D57" },
        modern: { bar: "#FF4400", text: "#4A4D57" },
        minimal: { bar: "#E5E7EB", text: "#4A4D57" },
        technical: { bar: "#0D0D12", text: "#FF4400" },
        creative: { bar: "#FF4400", text: "#0D0D12" },
    }[id] || { bar: "#0D0D12", text: "#4A4D57" };
    return (
        <div className="p-1.5">
            <div className="h-1.5" style={{ background: palette.bar }} />
            <div className="h-0.5 mt-1" style={{ background: palette.text, width: "70%" }} />
            <div className="h-0.5 mt-0.5" style={{ background: palette.text, width: "50%" }} />
            <div className="h-0.5 mt-1.5" style={{ background: palette.bar, width: "30%" }} />
            <div className="h-0.5 mt-0.5" style={{ background: palette.text, width: "80%" }} />
            <div className="h-0.5 mt-0.5" style={{ background: palette.text, width: "60%" }} />
        </div>
    );
}

function Section({ title, children, addLabel, onAdd, testid }) {
    return (
        <div>
            <div className="flex justify-between items-center mb-2">
                <div className="rp-overline">{title}</div>
                {onAdd && <button onClick={onAdd} data-testid={testid} className="text-xs text-[#FF4400] font-bold hover:underline flex items-center gap-1"><Plus size={12} weight="bold" /> {addLabel}</button>}
            </div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}
function Grid({ children }) { return <div className="grid grid-cols-2 gap-2">{children}</div>; }
function F({ label, children }) { return (<label className="block col-span-2 md:col-span-1"><div className="text-[10px] font-semibold uppercase tracking-wider text-[#4A4D57] mb-1">{label}</div>{children}</label>); }

function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }
function setByPath(obj, path, val) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (!(p in cur) || typeof cur[p] !== "object" || cur[p] === null) {
            cur[p] = /^\d+$/.test(parts[i + 1]) ? [] : {};
        }
        cur = cur[p];
    }
    cur[parts[parts.length - 1]] = val;
}
