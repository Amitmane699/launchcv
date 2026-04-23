/**
 * 21 ATS-safe resume templates. All use web-safe fonts only, no images/icons.
 * Live preview — renders resume data per template_id.
 */

export const TEMPLATES = [
    // Original 5
    { id: "classic",           name: "Classic",           desc: "Clean serif, timeless.",                        category: "Classic"    },
    { id: "modern",            name: "Modern",             desc: "Bold orange accents.",                          category: "Modern"     },
    { id: "minimal",           name: "Minimal",            desc: "Ink only, max whitespace.",                     category: "Minimal"    },
    { id: "technical",         name: "Technical",          desc: "Mono for engineers.",                           category: "Tech"       },
    { id: "creative",          name: "Creative",           desc: "Split header, vibrant.",                        category: "Creative"   },
    // Phase 1 — 8 new
    { id: "executive_classic", name: "Executive Classic",  desc: "Dark navy header, serif, single column.",       category: "Executive"  },
    { id: "modern_minimal",    name: "Modern Minimal",     desc: "Thin accent lines, two-column.",                category: "Minimal"    },
    { id: "bold_impact",       name: "Bold Impact",        desc: "Large name header with colour bar.",            category: "Bold"       },
    { id: "tech_pro",          name: "Tech Pro",           desc: "Dark sidebar, white main content.",             category: "Tech"       },
    { id: "creative_slate",    name: "Creative Slate",     desc: "Slate tones, stylish but ATS-friendly.",        category: "Creative"   },
    { id: "fresh_graduate",    name: "Fresh Graduate",     desc: "Education-first, clean, great for students.",   category: "Student"    },
    { id: "corporate_blue",    name: "Corporate Blue",     desc: "Traditional professional blue accents.",        category: "Corporate"  },
    { id: "startup_vibes",     name: "Startup Vibes",      desc: "Geometric header, flat design.",                category: "Modern"     },
    // Phase 2 — 8 new ATS-friendly
    { id: "banker",            name: "Banker",             desc: "Ultra-conservative, finance & consulting.",     category: "Corporate"  },
    { id: "clean_two_col",     name: "Clean Two-Col",      desc: "Light left sidebar, structured main column.",   category: "Minimal"    },
    { id: "academic",          name: "Academic",           desc: "Publication-ready, great for research roles.",  category: "Classic"    },
    { id: "terra",             name: "Terra",              desc: "Warm earth tones, hospitality & operations.",   category: "Modern"     },
    { id: "mono_dark",         name: "Mono Dark",          desc: "Dark header strip, mono fonts, dev-focused.",   category: "Tech"       },
    { id: "india_ops",         name: "India Ops",          desc: "Compact density for Tier-2 city job boards.",   category: "Compact"    },
    { id: "timeline",          name: "Timeline",           desc: "Left-rule timeline for experience sections.",   category: "Creative"   },
    { id: "serif_executive",   name: "Serif Executive",    desc: "Double-ruled centred name, boardroom-ready.",   category: "Executive"  },
];

// Config map
const CONFIG = {
    classic:           { font: "Georgia, serif",        accent: "#0D0D12", layout: "single",       headerStyle: "line"        },
    modern:            { font: "Helvetica, sans-serif", accent: "#FF4400", layout: "single",       headerStyle: "line"        },
    minimal:           { font: "Helvetica, sans-serif", accent: "#4A4D57", layout: "single",       headerStyle: "none"        },
    technical:         { font: "Consolas, monospace",   accent: "#0D0D12", layout: "single",       headerStyle: "line"        },
    creative:          { font: "Helvetica, sans-serif", accent: "#FF4400", layout: "single",       headerStyle: "split"       },
    executive_classic: { font: "Georgia, serif",        accent: "#1e3a5f", layout: "dark-header",  headerStyle: "block"       },
    modern_minimal:    { font: "Helvetica, sans-serif", accent: "#0D0D12", layout: "two-col",      headerStyle: "thin"        },
    bold_impact:       { font: "Arial, sans-serif",     accent: "#FF4400", layout: "single",       headerStyle: "bar"         },
    tech_pro:          { font: "Calibri, sans-serif",   accent: "#0D0D12", layout: "sidebar-dark", headerStyle: "sidebar"     },
    creative_slate:    { font: "Helvetica, sans-serif", accent: "#475569", layout: "single",       headerStyle: "block"       },
    fresh_graduate:    { font: "Calibri, sans-serif",   accent: "#00A859", layout: "single",       headerStyle: "line",       educationFirst: true },
    corporate_blue:    { font: "Georgia, serif",        accent: "#1e40af", layout: "single",       headerStyle: "double-line" },
    startup_vibes:     { font: "Arial, sans-serif",     accent: "#7c3aed", layout: "geometric",    headerStyle: "geometric"   },
    // New
    banker:            { font: "Georgia, serif",        accent: "#1a1a2e", layout: "banker",       headerStyle: "banker"      },
    clean_two_col:     { font: "Helvetica, sans-serif", accent: "#2d6a4f", layout: "clean-two-col",headerStyle: "clean"       },
    academic:          { font: "Georgia, serif",        accent: "#374151", layout: "academic",     headerStyle: "academic"    },
    terra:             { font: "Helvetica, sans-serif", accent: "#92400e", layout: "single",       headerStyle: "terra"       },
    mono_dark:         { font: "Consolas, monospace",   accent: "#06b6d4", layout: "mono-dark",    headerStyle: "mono-dark"   },
    india_ops:         { font: "Arial, sans-serif",     accent: "#b91c1c", layout: "india-ops",    headerStyle: "india-ops"   },
    timeline:          { font: "Helvetica, sans-serif", accent: "#0891b2", layout: "timeline",     headerStyle: "timeline"    },
    serif_executive:   { font: "Georgia, serif",        accent: "#111827", layout: "single",       headerStyle: "serif-exec"  },
};

export default function ResumePreview({ resume }) {
    const d   = resume.data || {};
    const p   = d.personal || {};
    const tid = resume.template_id || "classic";
    const cfg = CONFIG[tid] || CONFIG.classic;
    let order = resume.section_order || ["summary","experience","skills","education","projects","certifications"];
    if (cfg.educationFirst) order = ["summary","education","experience","skills","projects","certifications"];

    const baseStyle = { fontFamily: cfg.font, color: "#0D0D12" };

    if (cfg.layout === "sidebar-dark")   return <SidebarDarkLayout  {...{d,p,cfg,order,baseStyle}} />;
    if (cfg.layout === "two-col")        return <TwoColLayout        {...{d,p,cfg,order,baseStyle}} />;
    if (cfg.layout === "dark-header")    return <DarkHeaderLayout    {...{d,p,cfg,order,baseStyle}} />;
    if (cfg.layout === "geometric")      return <GeometricLayout     {...{d,p,cfg,order,baseStyle}} />;
    if (cfg.layout === "banker")         return <BankerLayout        {...{d,p,cfg,order,baseStyle}} />;
    if (cfg.layout === "clean-two-col")  return <CleanTwoColLayout   {...{d,p,cfg,order,baseStyle}} />;
    if (cfg.layout === "academic")       return <AcademicLayout      {...{d,p,cfg,order,baseStyle}} />;
    if (cfg.layout === "mono-dark")      return <MonoDarkLayout      {...{d,p,cfg,order,baseStyle}} />;
    if (cfg.layout === "india-ops")      return <IndiaOpsLayout      {...{d,p,cfg,order,baseStyle}} />;
    if (cfg.layout === "timeline")       return <TimelineLayout      {...{d,p,cfg,order,baseStyle}} />;
    return <SingleColumnLayout {...{d,p,cfg,order,baseStyle}} />;
}

// ─────────────────────────────────── EXISTING LAYOUTS ───────────────────────

function SingleColumnLayout({ d, p, cfg, order, baseStyle }) {
    return (
        <div className="p-8 text-[12px] leading-snug" style={{ ...baseStyle, minHeight: 780 }} data-testid="resume-preview">
            <Header d={d} p={p} cfg={cfg} />
            {order.map((s) => renderSection(s, d, cfg))}
        </div>
    );
}

function DarkHeaderLayout({ d, p, cfg, order, baseStyle }) {
    return (
        <div className="text-[12px] leading-snug" style={{ ...baseStyle, minHeight: 780 }} data-testid="resume-preview">
            <div className="px-8 py-6 text-white" style={{ background: cfg.accent }}>
                <div className="text-[24px] font-bold leading-none">{p.fullName || "Your Name"}</div>
                {p.headline && <div className="text-[12px] opacity-80 mt-1">{p.headline}</div>}
                <div className="text-[9px] opacity-80 mt-3 space-x-2">
                    {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((x, i) => <span key={i}>{i > 0 && "· "}{x}</span>)}
                </div>
            </div>
            <div className="p-8">{order.map((s) => renderSection(s, d, cfg))}</div>
        </div>
    );
}

function TwoColLayout({ d, p, cfg, order, baseStyle }) {
    return (
        <div className="p-8 text-[12px] leading-snug" style={{ ...baseStyle, minHeight: 780 }} data-testid="resume-preview">
            <div className="pb-3 mb-4" style={{ borderBottom: `1px solid ${cfg.accent}` }}>
                <div className="text-[22px] font-bold leading-none">{p.fullName || "Your Name"}</div>
                {p.headline && <div className="text-[11px] mt-1" style={{ color: "#4A4D57" }}>{p.headline}</div>}
            </div>
            <div className="grid grid-cols-[2fr_1fr] gap-5">
                <div>{["summary","experience","projects"].filter(s => order.includes(s)).map(s => renderSection(s,d,cfg))}</div>
                <div>
                    {renderContact(p)}
                    {["skills","education","certifications","languages"].filter(s => order.includes(s)).map(s => renderSection(s,d,cfg))}
                </div>
            </div>
        </div>
    );
}

function SidebarDarkLayout({ d, p, cfg, order, baseStyle }) {
    return (
        <div className="text-[12px] leading-snug" style={{ ...baseStyle, minHeight: 780 }} data-testid="resume-preview">
            <div className="grid grid-cols-[1fr_2fr]">
                <div className="p-6 text-white" style={{ background: "#0D0D12", minHeight: 780 }}>
                    <div className="text-[18px] font-bold leading-tight">{p.fullName || "Your Name"}</div>
                    {p.headline && <div className="text-[10px] opacity-70 mt-1">{p.headline}</div>}
                    <SidebarSection label="Contact" accent="#FF4400">
                        {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((x, i) => <div key={i} className="text-[9px] opacity-85">{x}</div>)}
                    </SidebarSection>
                    {(d.skills||[]).length > 0 && (
                        <SidebarSection label="Skills" accent="#FF4400">
                            {d.skills.map((s,i) => <div key={i} className="text-[10px]">• {s}</div>)}
                        </SidebarSection>
                    )}
                    {(d.education||[]).length > 0 && (
                        <SidebarSection label="Education" accent="#FF4400">
                            {d.education.map((e,i) => (
                                <div key={i} className="mb-2 text-[10px]">
                                    <b>{e.degree}{e.field && ` — ${e.field}`}</b>
                                    <div className="opacity-70">{e.school}</div>
                                    <div className="opacity-60">{e.duration}</div>
                                </div>
                            ))}
                        </SidebarSection>
                    )}
                </div>
                <div className="p-6">
                    {["summary","experience","projects","certifications"].filter(s => order.includes(s)).map(s => renderSection(s,d,cfg))}
                </div>
            </div>
        </div>
    );
}

function GeometricLayout({ d, p, cfg, order, baseStyle }) {
    return (
        <div className="text-[12px] leading-snug" style={{ ...baseStyle, minHeight: 780 }} data-testid="resume-preview">
            <div className="relative overflow-hidden" style={{ background: "#F4F5F7", padding: "32px" }}>
                <div className="absolute top-0 right-0 w-32 h-32" style={{ background: cfg.accent, transform: "rotate(45deg) translate(40%,-50%)" }} />
                <div className="absolute bottom-0 left-8 w-16 h-2" style={{ background: cfg.accent }} />
                <div className="relative">
                    <div className="text-[26px] font-bold leading-none" style={{ color: cfg.accent }}>{p.fullName || "Your Name"}</div>
                    {p.headline && <div className="text-[12px] mt-1">{p.headline}</div>}
                    <div className="text-[9px] mt-3 space-x-2" style={{ color: "#4A4D57" }}>
                        {[p.email, p.phone, p.location].filter(Boolean).map((x,i) => <span key={i}>{i > 0 && "· "}{x}</span>)}
                    </div>
                </div>
            </div>
            <div className="p-8">{order.map(s => renderSection(s,d,cfg))}</div>
        </div>
    );
}

// ─────────────────────────────── NEW LAYOUTS ────────────────────────────────

// ① Banker — conservative, finance/consulting, pure single-col with ruled sections
function BankerLayout({ d, p, cfg, order, baseStyle }) {
    const a = cfg.accent;
    return (
        <div className="text-[12px] leading-snug" style={{ ...baseStyle, minHeight: 780 }} data-testid="resume-preview">
            {/* Header: centered name between two thick rules */}
            <div className="px-10 pt-8 pb-4">
                <div style={{ borderTop: `2px solid ${a}`, borderBottom: `2px solid ${a}`, padding: "6px 0", textAlign: "center" }}>
                    <div className="text-[20px] font-bold tracking-widest uppercase">{p.fullName || "Your Name"}</div>
                </div>
                {p.headline && <div className="text-center text-[10px] mt-1 italic" style={{ color: "#4A4D57" }}>{p.headline}</div>}
                <div className="text-[9px] text-center mt-2 tracking-wide" style={{ color: "#4A4D57" }}>
                    {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).join("   ·   ")}
                </div>
            </div>
            <div className="px-10 pb-8">
                {order.map(s => renderSection(s, d, { ...cfg, accent: a }, "banker"))}
            </div>
        </div>
    );
}

// ② Clean Two-Col — light grey sidebar, green accent
function CleanTwoColLayout({ d, p, cfg, order, baseStyle }) {
    const a = cfg.accent;
    return (
        <div className="text-[12px] leading-snug" style={{ ...baseStyle, minHeight: 780 }} data-testid="resume-preview">
            <div className="grid grid-cols-[1fr_2.2fr]" style={{ minHeight: 780 }}>
                {/* Sidebar */}
                <div className="p-5" style={{ background: "#f0fdf4", borderRight: `2px solid ${a}` }}>
                    <div className="text-[16px] font-bold leading-snug" style={{ color: a }}>{p.fullName || "Your Name"}</div>
                    {p.headline && <div className="text-[10px] mt-1" style={{ color: "#4A4D57" }}>{p.headline}</div>}
                    <div className="mt-3 space-y-0.5 text-[9px]" style={{ color: "#4A4D57" }}>
                        {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((x,i) => <div key={i}>{x}</div>)}
                    </div>
                    {(d.skills||[]).length > 0 && (
                        <div className="mt-4">
                            <SmallHeading title="SKILLS" accent={a} />
                            {d.skills.map((s,i) => (
                                <div key={i} className="flex items-center gap-1 mt-0.5 text-[10px]">
                                    <span style={{ color: a }}>▸</span> {s}
                                </div>
                            ))}
                        </div>
                    )}
                    {(d.certifications||[]).length > 0 && (
                        <div className="mt-4">
                            <SmallHeading title="CERTS" accent={a} />
                            {d.certifications.map((c,i) => (
                                <div key={i} className="text-[9px] mt-0.5" style={{ color: "#374151" }}>
                                    {typeof c === "string" ? c : c.name}
                                </div>
                            ))}
                        </div>
                    )}
                    {(d.languages||[]).length > 0 && (
                        <div className="mt-4">
                            <SmallHeading title="LANGUAGES" accent={a} />
                            <div className="text-[9px]" style={{ color: "#374151" }}>{d.languages.join(", ")}</div>
                        </div>
                    )}
                </div>
                {/* Main */}
                <div className="p-6">
                    {["summary","experience","education","projects"].filter(s => order.includes(s)).map(s => renderSection(s,d,cfg))}
                </div>
            </div>
        </div>
    );
}

// ③ Academic — centred name, italic headline, publication-ready section style
function AcademicLayout({ d, p, cfg, order, baseStyle }) {
    const a = cfg.accent;
    return (
        <div className="p-10 text-[12px] leading-relaxed" style={{ ...baseStyle, minHeight: 780 }} data-testid="resume-preview">
            <div className="text-center mb-5">
                <div className="text-[24px] font-bold" style={{ color: a }}>{p.fullName || "Your Name"}</div>
                {p.headline && <div className="italic text-[11px] mt-1" style={{ color: "#6B7280" }}>{p.headline}</div>}
                <div className="text-[9px] mt-2 tracking-wide" style={{ color: "#6B7280" }}>
                    {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).join("  ·  ")}
                </div>
                <div className="mt-3 mx-auto w-24" style={{ borderBottom: `1px solid ${a}` }} />
            </div>
            {order.map(s => renderSection(s, d, cfg, "academic"))}
        </div>
    );
}

// ④ Mono Dark — dark header strip with cyan accent, monospace throughout
function MonoDarkLayout({ d, p, cfg, order, baseStyle }) {
    const a = cfg.accent;
    return (
        <div className="text-[11px] leading-snug" style={{ ...baseStyle, minHeight: 780 }} data-testid="resume-preview">
            {/* Dark header */}
            <div className="px-8 py-5" style={{ background: "#0f172a", color: "#e2e8f0" }}>
                <div className="text-[20px] font-bold" style={{ color: a }}>{p.fullName || "Your Name"}</div>
                {p.headline && <div className="text-[10px] mt-0.5 opacity-70">{p.headline}</div>}
                <div className="text-[9px] mt-2 opacity-60 flex flex-wrap gap-x-3">
                    {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((x,i) => <span key={i}>{x}</span>)}
                </div>
            </div>
            {/* Skills bar */}
            {(d.skills||[]).length > 0 && (
                <div className="px-8 py-2 flex flex-wrap gap-1" style={{ background: "#1e293b" }}>
                    {d.skills.map((s,i) => (
                        <span key={i} className="px-1.5 py-0.5 text-[9px] font-bold" style={{ background: "#0f172a", color: a, borderRadius: 2 }}>{s}</span>
                    ))}
                </div>
            )}
            {/* Body */}
            <div className="px-8 py-5">
                {["summary","experience","projects","education","certifications"].filter(s => order.includes(s)).map(s => renderSection(s, d, cfg, "mono-dark"))}
            </div>
        </div>
    );
}

// ⑤ India Ops — compact 10px density, red accent, great for ops/logistics/BPO
function IndiaOpsLayout({ d, p, cfg, order, baseStyle }) {
    const a = cfg.accent;
    return (
        <div className="text-[11px] leading-snug" style={{ ...baseStyle, minHeight: 780 }} data-testid="resume-preview">
            {/* Compact header */}
            <div className="px-6 py-3" style={{ borderBottom: `3px solid ${a}` }}>
                <div className="flex items-end justify-between">
                    <div>
                        <div className="text-[19px] font-extrabold uppercase tracking-tight" style={{ color: a }}>{p.fullName || "Your Name"}</div>
                        {p.headline && <div className="text-[10px]" style={{ color: "#4A4D57" }}>{p.headline}</div>}
                    </div>
                    <div className="text-[9px] text-right" style={{ color: "#4A4D57" }}>
                        {[p.email, p.phone, p.location].filter(Boolean).map((x,i) => <div key={i}>{x}</div>)}
                    </div>
                </div>
            </div>
            {/* Three-column skills strip */}
            {(d.skills||[]).length > 0 && (
                <div className="px-6 py-2" style={{ background: "#fef2f2", borderBottom: `1px solid ${a}` }}>
                    <span className="font-bold uppercase tracking-wider text-[9px]" style={{ color: a }}>Key Skills: </span>
                    <span className="text-[9px]">{d.skills.join(" | ")}</span>
                </div>
            )}
            {/* Compact body */}
            <div className="px-6 py-3">
                {order.filter(s => s !== "skills").map(s => renderSection(s, d, cfg, "india-ops"))}
            </div>
        </div>
    );
}

// ⑥ Timeline — vertical left rule with dot markers for experience
function TimelineLayout({ d, p, cfg, order, baseStyle }) {
    const a = cfg.accent;
    return (
        <div className="text-[12px] leading-snug" style={{ ...baseStyle, minHeight: 780 }} data-testid="resume-preview">
            {/* Header */}
            <div className="px-8 pt-7 pb-4" style={{ borderBottom: `2px solid ${a}` }}>
                <div className="text-[24px] font-bold" style={{ color: a }}>{p.fullName || "Your Name"}</div>
                {p.headline && <div className="text-[11px] mt-1" style={{ color: "#4A4D57" }}>{p.headline}</div>}
                <div className="text-[9px] mt-1.5 flex flex-wrap gap-x-3" style={{ color: "#6B7280" }}>
                    {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((x,i) => <span key={i}>{x}</span>)}
                </div>
            </div>
            <div className="grid grid-cols-[2.5fr_1fr] gap-0">
                {/* Left — timeline experience + projects */}
                <div className="px-8 py-5 border-r" style={{ borderColor: "#E5E7EB" }}>
                    {d.summary && (
                        <div className="mb-4">
                            <SmallHeading title="SUMMARY" accent={a} />
                            <p className="text-[11px] leading-relaxed">{d.summary}</p>
                        </div>
                    )}
                    {(d.experience||[]).length > 0 && (
                        <div className="mb-4">
                            <SmallHeading title="EXPERIENCE" accent={a} />
                            <div className="relative pl-4" style={{ borderLeft: `2px solid ${a}` }}>
                                {d.experience.map((e,i) => (
                                    <div key={i} className="relative mb-3 pl-3">
                                        {/* Timeline dot */}
                                        <div className="absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2" style={{ background: "#fff", borderColor: a }} />
                                        <div className="font-bold text-[11px]">{e.role}</div>
                                        {e.company && <div className="text-[10px]" style={{ color: a }}>{e.company}{e.location ? ` · ${e.location}` : ""}</div>}
                                        {e.duration && <div className="text-[9px] italic" style={{ color: "#9CA3AF" }}>{e.duration}</div>}
                                        {(e.bullets||[]).filter(Boolean).map((b,j) => (
                                            <div key={j} className="text-[10px] pl-2 relative mt-0.5"><span className="absolute left-0">–</span>{b}</div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {(d.projects||[]).length > 0 && (
                        <div className="mb-4">
                            <SmallHeading title="PROJECTS" accent={a} />
                            {d.projects.map((pr,i) => (
                                <div key={i} className="mb-2">
                                    <div className="font-bold text-[11px]">{pr.name}</div>
                                    {pr.description && <div className="text-[10px]">{pr.description}</div>}
                                    {(pr.bullets||[]).filter(Boolean).map((b,j) => (
                                        <div key={j} className="text-[10px] pl-2 relative"><span className="absolute left-0">–</span>{b}</div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {/* Right — skills, education, certs */}
                <div className="px-4 py-5">
                    {(d.skills||[]).length > 0 && (
                        <div className="mb-4">
                            <SmallHeading title="SKILLS" accent={a} />
                            {d.skills.map((s,i) => (
                                <div key={i} className="text-[10px] mt-0.5 flex items-center gap-1">
                                    <span style={{ color: a }}>◆</span> {s}
                                </div>
                            ))}
                        </div>
                    )}
                    {(d.education||[]).length > 0 && (
                        <div className="mb-4">
                            <SmallHeading title="EDUCATION" accent={a} />
                            {d.education.map((e,i) => (
                                <div key={i} className="mb-2 text-[10px]">
                                    <div className="font-bold">{e.degree}</div>
                                    {e.field && <div style={{ color: "#4A4D57" }}>{e.field}</div>}
                                    <div style={{ color: "#6B7280" }}>{e.school}</div>
                                    <div className="italic text-[9px]" style={{ color: "#9CA3AF" }}>{e.duration}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    {(d.certifications||[]).length > 0 && (
                        <div className="mb-4">
                            <SmallHeading title="CERTS" accent={a} />
                            {d.certifications.map((c,i) => (
                                <div key={i} className="text-[9px] mt-0.5">{typeof c === "string" ? c : c.name}</div>
                            ))}
                        </div>
                    )}
                    {(d.languages||[]).length > 0 && (
                        <div>
                            <SmallHeading title="LANGUAGES" accent={a} />
                            <div className="text-[9px]">{d.languages.join(", ")}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─────────────────────────────── HEADER COMPONENT ───────────────────────────

function Header({ d, p, cfg }) {
    const a = cfg.accent;
    if (cfg.headerStyle === "split") return (
        <div className="flex items-start justify-between pb-3 mb-4 border-b-2" style={{ borderColor: a }}>
            <div>
                <div className="text-[22px] font-bold leading-none">{p.fullName || "Your Name"}</div>
                {p.headline && <div className="text-[11px] mt-1" style={{ color: "#4A4D57" }}>{p.headline}</div>}
            </div>
            <div className="text-right text-[9px] space-y-0.5" style={{ color: "#4A4D57" }}>
                <div>{p.email}</div><div>{p.phone}</div><div>{p.location}</div>
            </div>
        </div>
    );
    if (cfg.headerStyle === "bar") return (
        <div className="mb-4">
            <div className="h-3 mb-2" style={{ background: a }} />
            <div className="text-[28px] font-extrabold leading-none uppercase tracking-tight">{p.fullName || "Your Name"}</div>
            {p.headline && <div className="text-[12px] mt-1" style={{ color: "#4A4D57" }}>{p.headline}</div>}
            <div className="text-[9px] mt-2 space-x-2" style={{ color: "#4A4D57" }}>
                {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((x,i) => <span key={i}>{i > 0 && "· "}{x}</span>)}
            </div>
        </div>
    );
    if (cfg.headerStyle === "block") return (
        <div className="mb-4 p-3" style={{ background: "#F4F5F7", borderLeft: `3px solid ${a}` }}>
            <div className="text-[22px] font-bold leading-none" style={{ color: a }}>{p.fullName || "Your Name"}</div>
            {p.headline && <div className="text-[11px] mt-1" style={{ color: "#4A4D57" }}>{p.headline}</div>}
            <div className="text-[9px] mt-2 space-x-2" style={{ color: "#4A4D57" }}>
                {[p.email, p.phone, p.location].filter(Boolean).map((x,i) => <span key={i}>{i > 0 && "· "}{x}</span>)}
            </div>
        </div>
    );
    if (cfg.headerStyle === "double-line") return (
        <div className="mb-4">
            <div className="h-0.5" style={{ background: a }} />
            <div className="py-2 text-center">
                <div className="text-[22px] font-bold leading-none" style={{ color: a }}>{p.fullName || "Your Name"}</div>
                {p.headline && <div className="text-[11px] mt-1 italic" style={{ color: "#4A4D57" }}>{p.headline}</div>}
            </div>
            <div className="h-0.5" style={{ background: a }} />
            <div className="text-[9px] mt-2 space-x-2 text-center" style={{ color: "#4A4D57" }}>
                {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((x,i) => <span key={i}>{i > 0 && "· "}{x}</span>)}
            </div>
        </div>
    );
    if (cfg.headerStyle === "terra") return (
        <div className="mb-4">
            <div className="h-1.5 rounded-sm" style={{ background: a }} />
            <div className="pt-3">
                <div className="text-[22px] font-bold leading-none" style={{ color: a }}>{p.fullName || "Your Name"}</div>
                {p.headline && <div className="text-[11px] mt-1" style={{ color: "#78350f" }}>{p.headline}</div>}
                <div className="text-[9px] mt-2 space-x-2" style={{ color: "#92400e" }}>
                    {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((x,i) => <span key={i}>{i > 0 && "· "}{x}</span>)}
                </div>
                <div className="h-px mt-3" style={{ background: "#fde68a" }} />
            </div>
        </div>
    );
    if (cfg.headerStyle === "serif-exec") return (
        <div className="mb-5 text-center">
            <div className="h-px mb-2" style={{ background: "#111827" }} />
            <div className="h-px mb-3" style={{ background: "#111827", marginTop: "2px" }} />
            <div className="text-[24px] font-bold tracking-[0.08em] uppercase">{p.fullName || "Your Name"}</div>
            {p.headline && <div className="text-[11px] mt-1 italic" style={{ color: "#4A4D57" }}>{p.headline}</div>}
            <div className="text-[9px] mt-2 tracking-wider" style={{ color: "#6B7280" }}>
                {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).join("   ·   ")}
            </div>
            <div className="h-px mt-3" style={{ background: "#111827" }} />
        </div>
    );
    if (cfg.headerStyle === "none") return (
        <div className="mb-5">
            <div className="text-[22px] font-bold leading-none">{p.fullName || "Your Name"}</div>
            {p.headline && <div className="text-[11px] mt-1" style={{ color: "#4A4D57" }}>{p.headline}</div>}
            <div className="text-[9px] mt-2 space-x-2" style={{ color: "#4A4D57" }}>
                {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((x,i) => <span key={i}>{i > 0 && "· "}{x}</span>)}
            </div>
        </div>
    );
    // default "line"
    return (
        <div className="mb-3 pb-3 border-b-2" style={{ borderColor: a }}>
            <div className="text-[22px] font-bold leading-none">{p.fullName || "Your Name"}</div>
            {p.headline && <div className="text-[11px] mt-1" style={{ color: "#4A4D57" }}>{p.headline}</div>}
            <div className="text-[9px] mt-2 space-x-2" style={{ color: "#4A4D57" }}>
                {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((x,i) => <span key={i}>{i > 0 && "· "}{x}</span>)}
            </div>
        </div>
    );
}

// ─────────────────────────────── SECTION RENDERER ───────────────────────────

function renderSection(sec, d, cfg, variant) {
    const a = cfg.accent;
    const compact = variant === "india-ops";
    const mono    = variant === "mono-dark";

    if (sec === "summary" && d.summary) return (
        <div key={sec} className="mb-3">
            <SectionHeading title="SUMMARY" accent={a} variant={variant} />
            <p className={`leading-snug ${compact ? "text-[10px]" : "text-[11px]"}`}>{d.summary}</p>
        </div>
    );

    if (sec === "experience" && (d.experience||[]).length) return (
        <div key={sec} className="mb-3">
            <SectionHeading title="EXPERIENCE" accent={a} variant={variant} />
            {d.experience.map((e,i) => (
                <div key={i} className={compact ? "mb-1.5" : "mb-2"}>
                    <div className="flex justify-between items-baseline">
                        <div className={compact ? "text-[10px]" : "text-[11px]"}>
                            <b>{e.role}</b>{e.company && <span style={{ color: mono ? a : "inherit" }}>{` — ${e.company}`}</span>}
                        </div>
                        <div className="text-[9px]" style={{ color: "#6B7280" }}>{e.duration}</div>
                    </div>
                    {e.location && <div className="text-[9px] italic" style={{ color: "#9CA3AF" }}>{e.location}</div>}
                    {e.description && <div className="text-[10px] mt-0.5">{e.description}</div>}
                    {(e.bullets||[]).filter(Boolean).map((b,j) => (
                        <div key={j} className="text-[10px] pl-3 relative mt-0.5"><span className="absolute left-0">•</span>{b}</div>
                    ))}
                </div>
            ))}
        </div>
    );

    if (sec === "skills" && (d.skills||[]).length) return (
        <div key={sec} className="mb-3">
            <SectionHeading title="SKILLS" accent={a} variant={variant} />
            <div className="text-[10px]">{d.skills.join(" · ")}</div>
        </div>
    );

    if (sec === "education" && (d.education||[]).length) return (
        <div key={sec} className="mb-3">
            <SectionHeading title="EDUCATION" accent={a} variant={variant} />
            {d.education.map((e,i) => (
                <div key={i} className="mb-1">
                    <div className="flex justify-between">
                        <b className="text-[11px]">{e.degree}{e.field && ` — ${e.field}`}</b>
                        <span className="text-[9px]" style={{ color: "#6B7280" }}>{e.duration}</span>
                    </div>
                    <div className="text-[10px]" style={{ color: "#4A4D57" }}>{e.school}{e.grade && ` · ${e.grade}`}</div>
                </div>
            ))}
        </div>
    );

    if (sec === "projects" && (d.projects||[]).length) return (
        <div key={sec} className="mb-3">
            <SectionHeading title="PROJECTS" accent={a} variant={variant} />
            {d.projects.map((pr,i) => (
                <div key={i} className="mb-2">
                    <b className="text-[11px]">{pr.name}</b>
                    {pr.description && <div className="text-[10px]">{pr.description}</div>}
                    {(pr.bullets||[]).filter(Boolean).map((b,j) => (
                        <div key={j} className="text-[10px] pl-3 relative"><span className="absolute left-0">•</span>{b}</div>
                    ))}
                </div>
            ))}
        </div>
    );

    if (sec === "certifications" && (d.certifications||[]).length) return (
        <div key={sec} className="mb-3">
            <SectionHeading title="CERTIFICATIONS" accent={a} variant={variant} />
            {d.certifications.map((c,i) => (
                <div key={i} className="text-[10px]">• {typeof c === "string" ? c : `${c.name}${c.issuer ? ` — ${c.issuer}` : ""}`}</div>
            ))}
        </div>
    );

    if (sec === "languages" && (d.languages||[]).length) return (
        <div key={sec} className="mb-3">
            <SectionHeading title="LANGUAGES" accent={a} variant={variant} />
            <div className="text-[10px]">{d.languages.join(" · ")}</div>
        </div>
    );

    if (sec === "hobbies" && (d.hobbies||[]).length) return (
        <div key={sec} className="mb-3">
            <SectionHeading title="INTERESTS" accent={a} variant={variant} />
            <div className="text-[10px]">{d.hobbies.join(" · ")}</div>
        </div>
    );
    return null;
}

// ─────────────────────────────── SHARED HELPERS ─────────────────────────────

function SectionHeading({ title, accent, variant }) {
    if (variant === "banker") return (
        <div className="flex items-center gap-2 mb-1.5">
            <div className="text-[10px] font-bold tracking-[0.2em]" style={{ color: accent }}>{title}</div>
            <div className="flex-1 h-px" style={{ background: accent }} />
        </div>
    );
    if (variant === "academic") return (
        <div className="mb-1.5">
            <div className="text-[11px] font-bold italic tracking-wide" style={{ color: accent }}>{title}</div>
            <div className="h-px mt-0.5" style={{ background: "#E5E7EB" }} />
        </div>
    );
    if (variant === "mono-dark") return (
        <div className="text-[10px] font-bold mb-1.5 pl-1" style={{ color: accent, borderLeft: `2px solid ${accent}` }}>{title}</div>
    );
    if (variant === "india-ops") return (
        <div className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1 py-0.5 px-1" style={{ background: "#fef2f2", color: accent }}>{title}</div>
    );
    return (
        <div className="text-[10px] font-bold tracking-[0.2em] pb-0.5 mb-1.5 border-b" style={{ color: accent, borderColor: accent }}>
            {title}
        </div>
    );
}

function SmallHeading({ title, accent }) {
    return <div className="text-[9px] font-bold uppercase tracking-[0.15em] mb-1 mt-0" style={{ color: accent }}>{title}</div>;
}

function renderContact(p) {
    return (
        <div className="mb-3">
            <SectionHeading title="CONTACT" accent="#4A4D57" />
            <div className="text-[10px] space-y-0.5" style={{ color: "#4A4D57" }}>
                {[p.email, p.phone, p.location, p.linkedin].filter(Boolean).map((x,i) => <div key={i}>{x}</div>)}
            </div>
        </div>
    );
}

function SidebarSection({ label, accent, children }) {
    return (
        <div className="mt-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.15em] mb-2" style={{ color: accent }}>{label}</div>
            <div className="space-y-1">{children}</div>
        </div>
    );
}
