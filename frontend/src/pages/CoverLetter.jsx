/**
 * Cover Letter Generator — template-based, no AI, instant.
 */
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { FileText, Copy, FloppyDisk, Download, Trash, ArrowRight, Sparkle } from "@phosphor-icons/react";

const TONES = [
  { id: "professional", label: "Professional", emoji: "🏢" },
  { id: "enthusiastic", label: "Enthusiastic", emoji: "🚀" },
  { id: "concise", label: "Concise", emoji: "✂️" },
  { id: "fresher", label: "Fresher/Campus", emoji: "🎓" },
];

export default function CoverLetterPage() {
  const [resumes, setResumes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [saved, setSaved] = useState([]);
  const [form, setForm] = useState({
    resume_id: "",
    job_title: "",
    company_name: "",
    template_id: "professional",
    custom_note: "",
  });
  const [generated, setGenerated] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [saveTitle, setSaveTitle] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [r, t, s] = await Promise.all([
        api.get("/resumes"),
        api.get("/cover-letters/templates"),
        api.get("/cover-letters"),
      ]);
      setResumes(r.data || []);
      setTemplates(t.data || []);
      setSaved(s.data || []);
      if (r.data?.[0]) setForm((f) => ({ ...f, resume_id: r.data[0].id }));
    } catch { /* silent */ }
  }

  async function generate() {
    if (!form.resume_id) { toast.error("Select a resume first"); return; }
    if (!form.job_title.trim()) { toast.error("Enter job title"); return; }
    if (!form.company_name.trim()) { toast.error("Enter company name"); return; }
    setGenerating(true);
    try {
      const r = await api.post("/cover-letters/generate", form);
      setGenerated(r.data.content);
      setEditContent(r.data.content);
      setEditMode(false);
      setSaveTitle(`Cover Letter – ${form.company_name}`);
      toast.success("Cover letter generated!");
    } catch (err) {
      const d = err?.response?.data?.detail || err?.response?.data;
      if (d?.error === "upgrade_required") {
        toast.error("Cover letter generator requires Resume Pro plan or higher.");
      } else {
        toast.error("Could not generate. Check your inputs.");
      }
    } finally { setGenerating(false); }
  }

  async function saveLetter() {
    if (!generated) return;
    setSaving(true);
    try {
      await api.post("/cover-letters", {
        title: saveTitle || "Cover Letter",
        content: editMode ? editContent : generated,
        resume_id: form.resume_id,
        job_title: form.job_title,
        company_name: form.company_name,
      });
      toast.success("Saved!");
      load();
    } catch { toast.error("Could not save"); }
    finally { setSaving(false); }
  }

  async function deleteSaved(id) {
    if (!window.confirm("Delete this cover letter?")) return;
    await api.delete(`/cover-letters/${id}`);
    load();
    toast.success("Deleted");
  }

  function copyText() {
    const txt = editMode ? editContent : generated;
    navigator.clipboard.writeText(txt);
    toast.success("Copied to clipboard!");
  }

  function downloadTxt() {
    const txt = editMode ? editContent : generated;
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${saveTitle || "cover-letter"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
      <div className="mb-8">
        <span className="rp-overline">Cover Letters</span>
        <h1 className="font-display font-extrabold text-4xl mt-2 tracking-tight">
          Cover Letter Generator
        </h1>
        <p className="text-[#4A4D57] mt-1">
          Rule-based templates — choose your tone, fill in details, and get a polished letter in seconds.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* LEFT — inputs */}
        <div className="space-y-5">
          {/* Tone selector */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-2">Tone / Template</label>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setForm((f) => ({ ...f, template_id: t.id }))}
                  className={`p-3 border text-left transition-all ${form.template_id === t.id
                    ? "border-[#FF4400] bg-orange-50"
                    : "border-[#E5E7EB] hover:border-[#0D0D12]"
                    }`}
                  style={{ borderRadius: 2 }}
                >
                  <div className="text-lg">{t.emoji}</div>
                  <div className="font-semibold text-sm mt-1">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Resume select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">Your Resume</label>
            <select
              value={form.resume_id}
              onChange={(e) => setForm((f) => ({ ...f, resume_id: e.target.value }))}
              className="rp-input w-full"
            >
              <option value="">— select resume —</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">Job Title</label>
              <input
                className="rp-input w-full"
                placeholder="e.g. Software Engineer"
                value={form.job_title}
                onChange={(e) => setForm((f) => ({ ...f, job_title: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">Company Name</label>
              <input
                className="rp-input w-full"
                placeholder="e.g. Infosys"
                value={form.company_name}
                onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">
              Custom Note <span className="text-[#4A4D57] normal-case font-normal">(optional — added at end)</span>
            </label>
            <textarea
              className="rp-input w-full"
              rows={3}
              placeholder="E.g. I am available to start immediately…"
              value={form.custom_note}
              onChange={(e) => setForm((f) => ({ ...f, custom_note: e.target.value }))}
            />
          </div>

          <button
            onClick={generate}
            disabled={generating}
            className="rp-btn-orange w-full justify-center"
          >
            {generating ? "Generating…" : (
              <><Sparkle size={16} weight="fill" /> Generate Cover Letter</>
            )}
          </button>
        </div>

        {/* RIGHT — output */}
        <div>
          {generated ? (
            <div className="border border-[#0D0D12] h-full flex flex-col" style={{ borderRadius: 2 }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E5E7EB] bg-[#F4F5F7]">
                <div className="flex items-center gap-2">
                  <FileText size={16} />
                  <input
                    className="bg-transparent border-none outline-none text-sm font-semibold w-48"
                    value={saveTitle}
                    onChange={(e) => setSaveTitle(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditMode((e) => !e)}
                    className="rp-btn-outline text-xs px-2 py-1"
                  >
                    {editMode ? "Preview" : "Edit"}
                  </button>
                  <button onClick={copyText} className="rp-btn-outline text-xs px-2 py-1">
                    <Copy size={13} /> Copy
                  </button>
                  <button onClick={downloadTxt} className="rp-btn-outline text-xs px-2 py-1">
                    <Download size={13} /> TXT
                  </button>
                  <button
                    onClick={saveLetter}
                    disabled={saving}
                    className="rp-btn-orange text-xs px-3 py-1"
                  >
                    <FloppyDisk size={13} /> {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-auto p-4">
                {editMode ? (
                  <textarea
                    className="w-full h-full min-h-[400px] border border-[#E5E7EB] p-3 text-sm font-mono leading-relaxed"
                    style={{ borderRadius: 2, resize: "vertical" }}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                ) : (
                  <pre className="text-sm leading-relaxed whitespace-pre-wrap font-sans">
                    {generated}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-[#E5E7EB] h-full min-h-[400px] flex flex-col items-center justify-center text-[#4A4D57] gap-3" style={{ borderRadius: 2 }}>
              <FileText size={40} className="opacity-30" />
              <p className="text-sm">Your cover letter will appear here.</p>
              <p className="text-xs opacity-60">Fill in the form and click Generate.</p>
            </div>
          )}
        </div>
      </div>

      {/* Saved letters */}
      {saved.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display font-bold text-2xl mb-4">Saved Letters</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {saved.map((cl) => (
              <div key={cl.id} className="border border-[#E5E7EB] p-4" style={{ borderRadius: 2 }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-sm">{cl.title}</div>
                    {cl.company_name && (
                      <div className="text-xs text-[#4A4D57] mt-0.5">{cl.job_title} @ {cl.company_name}</div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteSaved(cl.id)}
                    className="text-[#EF4444] hover:opacity-80 ml-2"
                  >
                    <Trash size={15} />
                  </button>
                </div>
                <p className="text-xs text-[#6B7280] mt-2 line-clamp-3 whitespace-pre-wrap">
                  {cl.content?.slice(0, 200)}…
                </p>
                <button
                  onClick={() => {
                    setGenerated(cl.content);
                    setEditContent(cl.content);
                    setSaveTitle(cl.title);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="mt-3 text-xs flex items-center gap-1 text-[#FF4400] hover:underline"
                >
                  View / Edit <ArrowRight size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
