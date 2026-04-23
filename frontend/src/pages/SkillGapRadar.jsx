/**
 * Skill Gap Radar
 * Compare your resume skills vs the top job listings for any target role.
 * Shows a radar chart, colour-coded skill grid, and a prioritised learning path.
 */
import { useEffect, useState, useRef } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  Crosshair, ArrowRight, CheckCircle, XCircle,
  Lightning, BookOpen, ChartBar, MagnifyingGlass, Spinner
} from "@phosphor-icons/react";

const IMPACT_COLORS = {
  10: "#EF4444", 9: "#F97316", 8: "#F59E0B",
  7: "#84CC16",  6: "#22C55E", 5: "#14B8A6",
  4: "#3B82F6",  3: "#8B5CF6", 2: "#EC4899", 1: "#9CA3AF",
};

const GAP_LABEL = (pct) =>
  pct >= 80 ? "Strong" : pct >= 60 ? "Good" : pct >= 40 ? "Fair" : "Needs work";

const GAP_COLOR = (pct) =>
  pct >= 80 ? "#00A859" : pct >= 60 ? "#84CC16" : pct >= 40 ? "#F59E0B" : "#EF4444";

export default function SkillGapRadar() {
  const [resumes,     setResumes]     = useState([]);
  const [roles,       setRoles]       = useState([]);
  const [resumeId,    setResumeId]    = useState("");
  const [targetRole,  setTargetRole]  = useState("");
  const [location,    setLocation]    = useState("");
  const [result,      setResult]      = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [activeTab,   setActiveTab]   = useState("radar"); // radar | skills | learn
  const canvasRef = useRef(null);
  const chartRef  = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get("/resumes"),
      api.get("/skill-gap/roles"),
    ]).then(([r, ro]) => {
      setResumes(r.data || []);
      setRoles(ro.data || []);
      if (r.data?.[0]) setResumeId(r.data[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (result?.radar && canvasRef.current && activeTab === "radar") {
      drawRadar(result.radar, canvasRef, chartRef);
    }
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
  }, [result, activeTab]);

  async function analyse() {
    if (!resumeId)    { toast.error("Select a resume first");   return; }
    if (!targetRole.trim()) { toast.error("Enter your target role"); return; }
    setLoading(true);
    setResult(null);
    try {
      const r = await api.post("/skill-gap/analyse", {
        resume_id:   resumeId,
        target_role: targetRole.trim(),
        location:    location.trim() || undefined,
      });
      setResult(r.data);
      setActiveTab("radar");
    } catch (err) {
      const d = err?.response?.data?.detail || err?.response?.data;
      if (d?.error === "unknown_role") {
        toast.error(`Role not recognised. Try: ${(d.supported || []).slice(0, 5).join(", ")}…`);
      } else {
        toast.error("Could not analyse. Check your inputs and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

      {/* Header */}
      <div className="mb-8">
        <span className="rp-overline">Career Intelligence</span>
        <h1 className="font-display font-extrabold text-4xl mt-1 tracking-tight flex items-center gap-3">
          <Crosshair size={36} weight="duotone" className="text-[#FF4400]" />
          Skill Gap Radar
        </h1>
        <p className="text-[#4A4D57] mt-2">
          Compare your skills against the top job listings in your target role.
          See exactly what to learn next — ranked by market demand.
        </p>
      </div>

      {/* Input form */}
      <div className="border border-[#0D0D12] p-5 mb-8 bg-[#F4F5F7]" style={{ borderRadius: 2 }}>
        <div className="grid md:grid-cols-[1fr_1fr_200px_auto] gap-4 items-end">
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">Your Resume</label>
            <select
              className="rp-input w-full"
              value={resumeId}
              onChange={(e) => setResumeId(e.target.value)}
            >
              <option value="">— select resume —</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">Target Role</label>
            <input
              className="rp-input w-full"
              placeholder="e.g. Frontend Developer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              list="role-suggestions"
              onKeyDown={(e) => e.key === "Enter" && analyse()}
            />
            <datalist id="role-suggestions">
              {roles.map((r) => <option key={r} value={r.replace(/_/g, " ")} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">
              Location <span className="text-[#9CA3AF] normal-case font-normal">(optional)</span>
            </label>
            <input
              className="rp-input w-full"
              placeholder="e.g. Bengaluru"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && analyse()}
            />
          </div>
          <button
            onClick={analyse}
            disabled={loading}
            className="rp-btn-orange h-[38px] whitespace-nowrap"
          >
            {loading
              ? <><Spinner size={15} className="animate-spin" /> Analysing…</>
              : <><MagnifyingGlass size={15} weight="bold" /> Analyse</>
            }
          </button>
        </div>
        {resumes.length === 0 && (
          <p className="text-xs text-[#4A4D57] mt-3">
            No resumes yet.{" "}
            <Link to="/dashboard" className="text-[#FF4400] hover:underline">Create one first →</Link>
          </p>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Score strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Match score",     val: `${result.match_pct}%`,       color: GAP_COLOR(result.match_pct) },
              { label: "Skills matched",  val: result.skills_matched,          color: "#00A859" },
              { label: "Gaps to close",   val: result.skills_missing,          color: "#EF4444" },
              { label: "JDs analysed",    val: result.jds_analysed > 0 ? result.jds_analysed : "Built-in data", color: "#4A4D57" },
            ].map(({ label, val, color }) => (
              <div key={label} className="border border-[#E5E7EB] p-4" style={{ borderRadius: 2 }}>
                <div className="text-xs text-[#4A4D57] uppercase tracking-wide mb-1">{label}</div>
                <div className="text-2xl font-bold" style={{ color }}>{val}</div>
              </div>
            ))}
          </div>

          {/* Match bar */}
          <div className="mb-6">
            <div className="flex justify-between text-xs text-[#4A4D57] mb-1">
              <span>Overall match for <strong>{result.target_role}</strong></span>
              <span style={{ color: GAP_COLOR(result.match_pct) }}>
                {GAP_LABEL(result.match_pct)} — {result.match_pct}%
              </span>
            </div>
            <div className="h-3 bg-[#F4F5F7] rounded-full overflow-hidden border border-[#E5E7EB]">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${result.match_pct}%`, background: GAP_COLOR(result.match_pct) }}
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            {[["radar","Radar Chart"],["skills","All Skills"],["learn","Learning Path"]].map(([v,l]) => (
              <button
                key={v}
                onClick={() => setActiveTab(v)}
                className={`px-4 py-1.5 text-sm font-medium border transition-all ${activeTab === v
                  ? "bg-[#0D0D12] text-white border-[#0D0D12]"
                  : "border-[#E5E7EB] hover:border-[#0D0D12]"}`}
                style={{ borderRadius: 2 }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* ── Radar Chart ── */}
          {activeTab === "radar" && (
            <div className="grid lg:grid-cols-[400px_1fr] gap-6">
              <div className="border border-[#E5E7EB] p-4 flex items-center justify-center" style={{ borderRadius: 2 }}>
                <canvas ref={canvasRef} style={{ maxWidth: 360, maxHeight: 360 }} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg mb-3">Category breakdown</h3>
                <div className="space-y-2">
                  {result.radar.labels.map((label, i) => {
                    const val = result.radar.values[i];
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-0.5">
                          <span className="font-medium">{label}</span>
                          <span style={{ color: GAP_COLOR(val) }}>{val}%</span>
                        </div>
                        <div className="h-2 bg-[#F4F5F7] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${val}%`, background: GAP_COLOR(val) }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4 p-3 bg-orange-50 border border-orange-100 text-xs text-[#92400E]" style={{ borderRadius: 2 }}>
                  <Lightning size={12} className="inline mr-1" weight="fill" />
                  Focus on your lowest-scoring categories first — they have the highest impact on recruiter shortlisting.
                </div>
              </div>
            </div>
          )}

          {/* ── All Skills grid ── */}
          {activeTab === "skills" && (
            <div>
              <div className="grid md:grid-cols-2 gap-5">
                {/* Gaps */}
                <div>
                  <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                    <XCircle size={18} weight="fill" className="text-[#EF4444]" />
                    Gaps to close ({result.gaps.length})
                  </h3>
                  <div className="space-y-2">
                    {result.gaps.map((sk) => (
                      <div
                        key={sk.skill}
                        className="flex items-center justify-between p-3 border border-[#E5E7EB] bg-white"
                        style={{ borderRadius: 2 }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: IMPACT_COLORS[sk.weight] || "#9CA3AF" }}
                          />
                          <div>
                            <div className="text-sm font-medium">{sk.skill}</div>
                            <div className="text-xs text-[#4A4D57]">{sk.cat}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {sk.jd_pct > 0 && (
                            <span className="text-xs text-[#4A4D57]">{sk.jd_pct}% of JDs</span>
                          )}
                          <span
                            className="text-xs px-2 py-0.5 font-bold rounded-full"
                            style={{
                              background: `${IMPACT_COLORS[sk.weight]}20`,
                              color: IMPACT_COLORS[sk.weight] || "#9CA3AF",
                            }}
                          >
                            P{sk.weight}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths */}
                <div>
                  <h3 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                    <CheckCircle size={18} weight="fill" className="text-[#00A859]" />
                    Your strengths ({result.strengths.length})
                  </h3>
                  <div className="space-y-2">
                    {result.strengths.map((sk) => (
                      <div
                        key={sk.skill}
                        className="flex items-center justify-between p-3 border border-[#E5E7EB] bg-[#F4F5F7]"
                        style={{ borderRadius: 2 }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#00A859]" />
                          <div>
                            <div className="text-sm font-medium">{sk.skill}</div>
                            <div className="text-xs text-[#4A4D57]">{sk.cat}</div>
                          </div>
                        </div>
                        {sk.jd_pct > 0 && (
                          <span className="text-xs text-[#00A859] font-medium">{sk.jd_pct}% of JDs ✓</span>
                        )}
                      </div>
                    ))}
                    {result.strengths.length === 0 && (
                      <p className="text-sm text-[#4A4D57]">
                        No matching skills found. Make sure your resume has a Skills section filled in.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Learning Path ── */}
          {activeTab === "learn" && (
            <div>
              <h3 className="font-display font-bold text-lg mb-1">Your personalised learning path</h3>
              <p className="text-sm text-[#4A4D57] mb-5">
                Top {result.learning_path.length} skills to learn next — ranked by market demand and career impact.
              </p>

              <div className="space-y-4">
                {result.learning_path.map((item, i) => (
                  <div
                    key={item.skill}
                    className="border border-[#E5E7EB] p-5"
                    style={{ borderRadius: 2 }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
                          style={{ background: IMPACT_COLORS[item.impact] || "#9CA3AF" }}
                        >
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-bold text-base">{item.skill}</div>
                          <div className="text-xs text-[#4A4D57] mt-0.5">
                            Category: {item.cat}
                            {item.jd_pct > 0 && ` · Appears in ${item.jd_pct}% of ${result.target_role} job listings`}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className="text-xs px-2 py-0.5 font-bold"
                              style={{
                                background: `${IMPACT_COLORS[item.impact]}15`,
                                color: IMPACT_COLORS[item.impact] || "#9CA3AF",
                                borderRadius: 2,
                              }}
                            >
                              Impact: {item.impact}/10
                            </span>
                            {i === 0 && (
                              <span className="text-xs px-2 py-0.5 bg-[#FF4400] text-white font-bold" style={{ borderRadius: 2 }}>
                                Start here
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {item.learn && (
                        <a
                          href={`https://${item.learn}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[#FF4400] hover:underline whitespace-nowrap flex-shrink-0 mt-1"
                        >
                          <BookOpen size={13} /> Free resource
                          <ArrowRight size={11} />
                        </a>
                      )}
                    </div>

                    {/* Demand bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-[#4A4D57] mb-1">
                        <span>Market demand</span>
                        <span>{Math.round(item.impact * 10)}%</span>
                      </div>
                      <div className="h-1.5 bg-[#F4F5F7] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${item.impact * 10}%`,
                            background: IMPACT_COLORS[item.impact] || "#9CA3AF",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {result.learning_path.length === 0 && (
                <div className="border border-[#E5E7EB] p-8 text-center" style={{ borderRadius: 2 }}>
                  <CheckCircle size={40} weight="fill" className="text-[#00A859] mx-auto mb-3" />
                  <div className="font-bold text-lg">No critical gaps found!</div>
                  <p className="text-sm text-[#4A4D57] mt-1">
                    Your resume already covers the top skills for {result.target_role}.
                    Consider adding certifications or projects to stand out further.
                  </p>
                </div>
              )}

              {/* Add to resume CTA */}
              <div className="mt-6 p-4 border-l-2 border-[#FF4400] bg-orange-50" style={{ borderRadius: "0 2px 2px 0" }}>
                <div className="text-sm font-bold mb-1">Ready to add these skills?</div>
                <p className="text-xs text-[#4A4D57] mb-2">
                  Once you've started learning, add each skill to your resume's Skills section and
                  re-run the radar to watch your match score climb.
                </p>
                <Link to={`/builder/${resumeId}`} className="rp-btn-orange text-xs !py-2">
                  Open Resume Builder <ArrowRight size={12} weight="bold" />
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!result && !loading && (
        <div className="border border-dashed border-[#E5E7EB] py-20 text-center" style={{ borderRadius: 2 }}>
          <Crosshair size={48} weight="duotone" className="mx-auto text-[#FF4400] opacity-30 mb-4" />
          <div className="font-semibold text-lg text-[#4A4D57]">Choose your resume and target role above</div>
          <p className="text-sm text-[#9CA3AF] mt-1">
            We'll compare your skills against up to 100 real job listings and show you exactly what to learn next.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Chart.js radar renderer ───────────────────────────────────────────────────
function drawRadar(radarData, canvasRef, chartRef) {
  if (!canvasRef.current) return;

  function tryDraw() {
    const CJS = window.Chart;
    if (!CJS) return;
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    const gridColor  = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
    const labelColor = isDark ? "#9CA3AF" : "#4A4D57";

    chartRef.current = new CJS(canvasRef.current, {
      type: "radar",
      data: {
        labels: radarData.labels,
        datasets: [
          {
            label: "Your skills",
            data: radarData.values,
            backgroundColor: "rgba(255,68,0,0.15)",
            borderColor: "#FF4400",
            borderWidth: 2,
            pointBackgroundColor: "#FF4400",
            pointRadius: 4,
          },
          {
            label: "Target (100%)",
            data: radarData.labels.map(() => 100),
            backgroundColor: "rgba(0,0,0,0)",
            borderColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
            borderWidth: 1,
            borderDash: [4, 4],
            pointRadius: 0,
          },
        ],
      },
      options: {
        responsive: true,
        animation: { duration: 600 },
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { stepSize: 25, display: false },
            grid:        { color: gridColor },
            angleLines:  { color: gridColor },
            pointLabels: { color: labelColor, font: { size: 11 } },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`,
            },
          },
        },
      },
    });
  }

  if (window.Chart) {
    tryDraw();
  } else {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js";
    s.onload = tryDraw;
    document.head.appendChild(s);
  }
}
