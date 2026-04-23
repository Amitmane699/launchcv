/**
 * Multi-JD Comparator — compare your resume against up to 3 job descriptions at once.
 */
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Plus, Trash, ChartBar, Target, Trophy, ArrowRight } from "@phosphor-icons/react";
import { useNavigate } from "react-router-dom";

export default function Comparator() {
  const nav = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [resumeId, setResumeId] = useState("");
  const [jds, setJds] = useState(["", "", ""]);
  const [titles, setTitles] = useState(["Job 1", "Job 2", "Job 3"]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get("/resumes").then((r) => {
      setResumes(r.data || []);
      if (r.data?.[0]) setResumeId(r.data[0].id);
    }).catch(() => { });
  }, []);

  async function compare() {
    const activeJds = jds.filter((j) => j.trim());
    if (!resumeId) { toast.error("Select a resume"); return; }
    if (activeJds.length < 1) { toast.error("Paste at least one JD"); return; }
    setLoading(true);
    try {
      const activeTitles = titles.slice(0, activeJds.length);
      const r = await api.post("/ats/compare", {
        resume_id: resumeId,
        jds: activeJds,
        titles: activeTitles,
      });
      setResult(r.data);
    } catch (err) {
      const d = err?.response?.data?.detail || err?.response?.data;
      if (d?.error === "upgrade_required") {
        toast.error("Multi-JD compare requires Resume Pro plan.");
        nav("/pricing");
      } else {
        toast.error("Could not compare");
      }
    } finally { setLoading(false); }
  }

  function scoreColor(score) {
    if (score >= 75) return "#00A859";
    if (score >= 50) return "#FFB300";
    return "#EF4444";
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
      <div className="mb-8">
        <span className="rp-overline">ATS Tools</span>
        <h1 className="font-display font-extrabold text-4xl mt-2 tracking-tight">
          Multi-JD Comparator
        </h1>
        <p className="text-[#4A4D57] mt-1">
          Paste up to 3 job descriptions to see which role your resume is best suited for — instantly.
        </p>
      </div>

      {/* Resume select */}
      <div className="mb-6">
        <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">Compare Resume</label>
        <select
          className="rp-input"
          value={resumeId}
          onChange={(e) => setResumeId(e.target.value)}
          style={{ maxWidth: 320 }}
        >
          <option value="">— select resume —</option>
          {resumes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {/* JD inputs */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border border-[#E5E7EB] p-4" style={{ borderRadius: 2 }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-[#0D0D12] text-white flex items-center justify-center text-xs font-bold">
                {i + 1}
              </div>
              <input
                className="flex-1 bg-transparent border-none outline-none text-sm font-semibold"
                value={titles[i]}
                onChange={(e) => {
                  const t = [...titles];
                  t[i] = e.target.value;
                  setTitles(t);
                }}
                placeholder={`Job ${i + 1} title`}
              />
              {i > 0 && jds[i] && (
                <button
                  onClick={() => {
                    const newJds = [...jds];
                    newJds[i] = "";
                    setJds(newJds);
                  }}
                  className="text-[#EF4444]"
                >
                  <Trash size={14} />
                </button>
              )}
            </div>
            <textarea
              className="w-full text-xs leading-relaxed border border-[#E5E7EB] p-2 resize-none"
              style={{ borderRadius: 2, minHeight: 160 }}
              placeholder={`Paste job description ${i + 1} here…${i > 0 ? "\n\n(Optional)" : ""}`}
              value={jds[i]}
              onChange={(e) => {
                const newJds = [...jds];
                newJds[i] = e.target.value;
                setJds(newJds);
              }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={compare}
        disabled={loading}
        className="rp-btn-orange"
      >
        {loading ? "Comparing…" : <><ChartBar size={16} /> Compare Now</>}
      </button>

      {/* Results */}
      {result && (
        <div className="mt-10">
          <div className="flex items-center gap-3 mb-6">
            <Trophy size={24} className="text-[#FF4400]" weight="fill" />
            <div>
              <div className="font-display font-bold text-2xl">Results</div>
              <div className="text-sm text-[#4A4D57]">{result.summary}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {result.results.map((r, idx) => (
              <div
                key={idx}
                className={`border p-5 ${idx === 0 ? "border-[#FF4400] bg-orange-50" : "border-[#E5E7EB]"}`}
                style={{ borderRadius: 2 }}
              >
                {idx === 0 && (
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FF4400] text-white text-xs font-bold uppercase tracking-wide mb-3">
                    <Trophy size={10} weight="fill" /> Best Match
                  </div>
                )}
                <div className="font-display font-bold text-lg">{r.title}</div>

                {/* Score gauge */}
                <div className="mt-4 flex items-end gap-2">
                  <div className="text-4xl font-extrabold" style={{ color: scoreColor(r.score) }}>
                    {r.score}
                  </div>
                  <div className="text-sm text-[#4A4D57] mb-1">/ 100</div>
                </div>

                {/* Score bar */}
                <div className="mt-2 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${r.score}%`, background: scoreColor(r.score) }}
                  />
                </div>

                {/* Breakdown */}
                <div className="mt-4 space-y-1">
                  {Object.entries(r.breakdown).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs text-[#4A4D57]">
                      <span className="capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                      <span className="font-mono font-semibold">{v}</span>
                    </div>
                  ))}
                </div>

                {/* Keywords */}
                {r.matchedKeywords?.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-bold text-[#00A859] uppercase tracking-wide mb-1">Matched</div>
                    <div className="flex flex-wrap gap-1">
                      {r.matchedKeywords.slice(0, 8).map((k) => (
                        <span key={k} className="px-1.5 py-0.5 bg-green-50 text-green-700 text-xs rounded">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
                {r.missingKeywords?.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs font-bold text-[#EF4444] uppercase tracking-wide mb-1">Missing</div>
                    <div className="flex flex-wrap gap-1">
                      {r.missingKeywords.slice(0, 8).map((k) => (
                        <span key={k} className="px-1.5 py-0.5 bg-red-50 text-red-700 text-xs rounded">{k}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Recommendation */}
          <div className="border border-[#0D0D12] p-5 bg-[#F4F5F7]" style={{ borderRadius: 2 }}>
            <div className="flex items-center gap-2 mb-2">
              <Target size={18} className="text-[#FF4400]" weight="fill" />
              <span className="font-bold">Recommendation</span>
            </div>
            <p className="text-sm text-[#4A4D57]">
              Your resume is best aligned with <strong>{result.bestMatch}</strong>.
              {result.results[0]?.score >= 75
                ? " Great match! Apply with confidence."
                : result.results[0]?.score >= 50
                  ? " Good match — consider adding the missing keywords before applying."
                  : " Moderate match — tailor your resume specifically for this role to boost your score."}
            </p>
            {result.results[0]?.missingKeywords?.length > 0 && (
              <p className="text-sm mt-2">
                Key gaps to fill: <strong>{result.results[0].missingKeywords.slice(0, 5).join(", ")}</strong>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
