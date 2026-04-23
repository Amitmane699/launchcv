/**
 * LaunchCV Career Graph
 * Interactive D3 force-directed graph of the user's career knowledge network.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  ArrowClockwise, Share, Info, Lightning, ChartBar,
  Briefcase, Buildings, Wrench, GraduationCap, Certificate, Folder,
  ArrowSquareOut, Spinner
} from "@phosphor-icons/react";

const NODE_COLORS = {
  person:        { fill: "#0D0D12", text: "#fff",    ring: "#FF4400" },
  role:          { fill: "#E1F5EE", text: "#085041",  ring: "#0F6E56" },
  company:       { fill: "#EEEDFE", text: "#3C3489",  ring: "#534AB7" },
  skill:         { fill: "#FAECE7", text: "#712B13",  ring: "#993C1D" },
  institution:   { fill: "#FFF8E1", text: "#633806",  ring: "#854F0B" },
  certification: { fill: "#EAF3DE", text: "#27500A",  ring: "#3B6D11" },
  project:       { fill: "#F1EFE8", text: "#444441",  ring: "#888780" },
};

const NODE_SIZES = {
  person: 28, role: 20, company: 18, skill: 14,
  institution: 18, certification: 14, project: 14,
};

const NODE_ICONS = {
  person: "👤", role: "💼", company: "🏢", skill: "⚙️",
  institution: "🎓", certification: "🏅", project: "📁",
};

const LEGEND = [
  { type: "role",          label: "Role" },
  { type: "company",       label: "Company" },
  { type: "skill",         label: "Skill" },
  { type: "institution",   label: "Education" },
  { type: "certification", label: "Certification" },
  { type: "project",       label: "Project" },
];

export default function CareerGraph() {
  const { user } = useAuthStore();
  const svgRef    = useRef(null);
  const simRef    = useRef(null);

  const [graph,    setGraph]    = useState(null);
  const [insights, setInsights] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [building, setBuilding] = useState(false);
  const [tab,      setTab]      = useState("graph"); // graph | insights

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [g, ins] = await Promise.all([
        api.get("/career-graph/me"),
        api.get("/career-graph/insights"),
      ]);
      setGraph(g.data);
      setInsights(ins.data);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (typeof detail === "string" && detail.includes("No resume")) {
        toast.error("Build a resume first to generate your career graph.");
      } else {
        toast.error("Could not load career graph.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function rebuild() {
    setBuilding(true);
    try {
      const r = await api.post("/career-graph/build");
      setGraph(r.data);
      const ins = await api.get("/career-graph/insights");
      setInsights(ins.data);
      toast.success("Graph rebuilt from your latest resume.");
    } catch {
      toast.error("Could not rebuild graph.");
    } finally {
      setBuilding(false); }
  }

  function copyPublicLink() {
    if (user?.plan === "free") {
      toast.error("Public graph sharing requires a paid plan.");
      return;
    }
    const url = `${window.location.origin}/graph/${user?.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Public graph link copied!");
  }

  // D3 force simulation
  useEffect(() => {
    if (!graph || !svgRef.current || tab !== "graph") return;
    renderD3(graph, svgRef, simRef, setSelected);
  }, [graph, tab]);

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#4A4D57]">
      <Spinner size={32} className="animate-spin text-[#FF4400]" />
      <p className="text-sm">Building your career graph…</p>
    </div>
  );

  if (!graph) return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🕸️</div>
      <h2 className="font-display font-bold text-2xl mb-2">No graph yet</h2>
      <p className="text-[#4A4D57] mb-6 text-sm">
        Create and fill in a resume first — your career graph is built automatically from your resume data.
      </p>
      <Link to="/dashboard" className="rp-btn-orange">Go to Dashboard</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="rp-overline">Career Intelligence</span>
          <h1 className="font-display font-extrabold text-4xl mt-1 tracking-tight">Career Graph</h1>
          <p className="text-[#4A4D57] mt-1 text-sm">
            {graph.node_count} nodes · {graph.edge_count} connections · built from your resume
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={rebuild}
            disabled={building}
            className="rp-btn-outline text-sm"
          >
            {building
              ? <Spinner size={14} className="animate-spin" />
              : <ArrowClockwise size={14} weight="bold" />
            }
            {building ? "Rebuilding…" : "Rebuild"}
          </button>
          <button onClick={copyPublicLink} className="rp-btn-outline text-sm">
            <Share size={14} weight="bold" /> Share Graph
          </button>
        </div>
      </div>

      {/* Tab pills */}
      <div className="flex gap-2 mb-5">
        {[["graph", "Graph"], ["insights", "Insights"]].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={`px-4 py-1.5 text-sm font-medium border transition-all ${tab === v
              ? "bg-[#0D0D12] text-white border-[#0D0D12]"
              : "border-[#E5E7EB] hover:border-[#0D0D12]"}`}
            style={{ borderRadius: 2 }}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "graph" && (
        <div className="grid lg:grid-cols-[1fr_280px] gap-5">
          {/* Graph canvas */}
          <div
            className="border border-[#E5E7EB] bg-[#FAFAFA] relative overflow-hidden"
            style={{ borderRadius: 2, minHeight: 520 }}
          >
            <svg
              ref={svgRef}
              style={{ width: "100%", height: 520, display: "block" }}
            />
            {/* Legend */}
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
              {LEGEND.map(({ type, label }) => (
                <div key={type} className="flex items-center gap-1 text-[10px]" style={{ color: "#4A4D57" }}>
                  <div
                    className="w-2.5 h-2.5 rounded-full border"
                    style={{ background: NODE_COLORS[type].fill, borderColor: NODE_COLORS[type].ring }}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Roles", val: graph.nodes.filter(n => n.type === "role").length, icon: Briefcase },
                { label: "Companies", val: graph.nodes.filter(n => n.type === "company").length, icon: Buildings },
                { label: "Skills", val: graph.nodes.filter(n => n.type === "skill").length, icon: Wrench },
                { label: "Education", val: graph.nodes.filter(n => n.type === "institution").length, icon: GraduationCap },
              ].map(({ label, val, icon: Icon }) => (
                <div key={label} className="border border-[#E5E7EB] p-3" style={{ borderRadius: 2 }}>
                  <Icon size={16} className="text-[#FF4400] mb-1" />
                  <div className="text-2xl font-bold">{val}</div>
                  <div className="text-xs text-[#4A4D57]">{label}</div>
                </div>
              ))}
            </div>

            {/* Selected node info */}
            {selected ? (
              <div className="border border-[#0D0D12] p-4" style={{ borderRadius: 2 }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{NODE_ICONS[selected.type] || "🔷"}</span>
                  <div>
                    <div className="font-bold text-sm">{selected.label}</div>
                    <div className="text-xs text-[#4A4D57] capitalize">{selected.type}</div>
                  </div>
                </div>
                {Object.entries(selected.properties || {}).map(([k, v]) =>
                  v ? (
                    <div key={k} className="text-xs flex justify-between py-0.5 border-b border-[#F4F5F7] last:border-0">
                      <span className="text-[#4A4D57] capitalize">{k.replace(/_/g, " ")}</span>
                      <span className="font-medium text-right max-w-[140px] truncate">{String(v)}</span>
                    </div>
                  ) : null
                )}
              </div>
            ) : (
              <div className="border border-dashed border-[#E5E7EB] p-4 text-center text-xs text-[#9CA3AF]" style={{ borderRadius: 2 }}>
                Click any node to see details
              </div>
            )}

            {/* Quick insight */}
            {insights?.missing_skills?.length > 0 && (
              <div className="border-l-2 border-[#FF4400] pl-3 py-1">
                <div className="text-xs font-bold uppercase tracking-wide text-[#FF4400] mb-1">Gap detected</div>
                <div className="text-xs text-[#4A4D57]">
                  Consider adding: <strong>{insights.missing_skills.slice(0, 3).join(", ")}</strong>
                </div>
                <Link to="/builder/new" className="text-xs text-[#FF4400] hover:underline mt-1 block">
                  Open resume builder →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "insights" && insights && (
        <div className="grid md:grid-cols-2 gap-5">
          {/* Insights cards */}
          <div className="space-y-4">
            <h2 className="font-display font-bold text-xl">Personalised insights</h2>
            {insights.insights?.length === 0 && (
              <p className="text-[#4A4D57] text-sm">Add more detail to your resume to unlock insights.</p>
            )}
            {insights.insights?.map((ins, i) => (
              <div key={i} className="border border-[#E5E7EB] p-4" style={{ borderRadius: 2 }}>
                <div className="flex items-start gap-3">
                  <Lightning size={18} weight="fill" className="text-[#FF4400] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{ins.message}</p>
                    {ins.data?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ins.data.map(d => (
                          <span key={d} className="px-2 py-0.5 bg-[#F4F5F7] text-xs border border-[#E5E7EB]" style={{ borderRadius: 2 }}>
                            {d}
                          </span>
                        ))}
                      </div>
                    )}
                    <Link to={ins.action === "Add to skills" ? "/dashboard" : "/dashboard"} className="text-xs text-[#FF4400] hover:underline mt-2 block">
                      {ins.action} →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Skill benchmarks */}
          <div>
            <h2 className="font-display font-bold text-xl mb-4">
              Platform skill benchmarks
              {insights.top_role && (
                <span className="text-sm font-normal text-[#4A4D57] ml-2">for {insights.top_role}</span>
              )}
            </h2>
            <div className="space-y-2">
              {insights.skill_benchmarks?.slice(0, 12).map((item) => (
                <div key={item.skill} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: item.user_has ? "#00A859" : "#E5E7EB" }}
                  />
                  <span className={`text-sm flex-1 ${item.user_has ? "font-medium text-[#0D0D12]" : "text-[#4A4D57]"}`}>
                    {item.skill}
                  </span>
                  <div className="w-20 h-1.5 bg-[#F4F5F7] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, item.platform_count * 8)}%`,
                        background: item.user_has ? "#00A859" : "#E5E7EB",
                      }}
                    />
                  </div>
                  {item.user_has
                    ? <span className="text-[10px] text-[#00A859] font-bold w-12 text-right">✓ have</span>
                    : <span className="text-[10px] text-[#9CA3AF] w-12 text-right">missing</span>
                  }
                </div>
              ))}
            </div>

            <div className="mt-5 p-3 bg-[#F4F5F7] text-xs text-[#4A4D57]" style={{ borderRadius: 2 }}>
              <Info size={12} className="inline mr-1" />
              Benchmarks are aggregated anonymously from all LaunchCV users. Your individual data is never shared.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── D3 force simulation renderer ──────────────────────────────────────────────
function renderD3(graph, svgRef, simRef, setSelected) {
  const svgEl = svgRef.current;
  if (!svgEl) return;

  // Dynamically import d3 from CDN if not already loaded
  if (!window.d3) {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js";
    script.onload = () => drawGraph(graph, svgEl, simRef, setSelected);
    document.head.appendChild(script);
  } else {
    drawGraph(graph, svgEl, simRef, setSelected);
  }
}

function drawGraph(graph, svgEl, simRef, setSelected) {
  const d3 = window.d3;
  if (!d3) return;

  const W = svgEl.clientWidth || 680;
  const H = 520;

  // Clear previous
  d3.select(svgEl).selectAll("*").remove();

  const svg = d3.select(svgEl)
    .attr("viewBox", `0 0 ${W} ${H}`)
    .style("cursor", "grab");

  // Zoom
  const g = svg.append("g");
  svg.call(
    d3.zoom().scaleExtent([0.3, 3]).on("zoom", (e) => {
      g.attr("transform", e.transform);
    })
  );

  const nodes = graph.nodes.map(n => ({ ...n }));
  const edges = graph.edges.map(e => ({ ...e }));

  // Build adjacency for quick lookup
  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  // Links
  const link = g.append("g")
    .selectAll("line")
    .data(edges)
    .join("line")
    .attr("stroke", "#E5E7EB")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0.8);

  // Node groups
  const nodeG = g.append("g")
    .selectAll("g")
    .data(nodes)
    .join("g")
    .attr("cursor", "pointer")
    .on("click", (event, d) => {
      event.stopPropagation();
      setSelected(d);
    })
    .call(
      d3.drag()
        .on("start", (e, d) => {
          if (!e.active) simRef.current?.alphaTarget(0.3).restart();
          d.fx = d.x; d.fy = d.y;
        })
        .on("drag", (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on("end",  (e, d) => {
          if (!e.active) simRef.current?.alphaTarget(0);
          d.fx = null; d.fy = null;
        })
    );

  // Draw circles
  nodeG.append("circle")
    .attr("r", d => NODE_SIZES[d.type] || 14)
    .attr("fill", d => NODE_COLORS[d.type]?.fill || "#F1EFE8")
    .attr("stroke", d => NODE_COLORS[d.type]?.ring || "#888780")
    .attr("stroke-width", d => d.type === "person" ? 2.5 : 1.5);

  // Labels
  nodeG.append("text")
    .text(d => {
      const max = d.type === "person" ? 12 : 10;
      return d.label.length > max ? d.label.slice(0, max) + "…" : d.label;
    })
    .attr("text-anchor", "middle")
    .attr("dy", d => (NODE_SIZES[d.type] || 14) + 11)
    .attr("font-size", "10px")
    .attr("fill", "#4A4D57")
    .attr("font-family", "sans-serif");

  // Person node special label
  nodeG.filter(d => d.type === "person")
    .append("text")
    .text("YOU")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("font-size", "9px")
    .attr("font-weight", "bold")
    .attr("fill", "#fff")
    .attr("font-family", "sans-serif");

  // Hover ring
  nodeG
    .on("mouseenter", function() {
      d3.select(this).select("circle").attr("stroke-width", 3);
    })
    .on("mouseleave", function(event, d) {
      d3.select(this).select("circle").attr("stroke-width", d.type === "person" ? 2.5 : 1.5);
    });

  // Force simulation
  const sim = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges).id(d => d.id).distance(d => {
      const tgt = nodeById[d.target?.id || d.target];
      if (!tgt) return 80;
      return tgt.type === "skill" ? 60 : tgt.type === "company" ? 100 : 90;
    }).strength(0.8))
    .force("charge", d3.forceManyBody().strength(-200))
    .force("center", d3.forceCenter(W / 2, H / 2))
    .force("collision", d3.forceCollide().radius(d => (NODE_SIZES[d.type] || 14) + 8))
    .on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);
      nodeG.attr("transform", d => `translate(${d.x},${d.y})`);
    });

  simRef.current = sim;

  // Click outside deselect
  svg.on("click", () => setSelected(null));
}
