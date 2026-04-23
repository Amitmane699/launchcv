/**
 * Collapsible, section-aware tips sidebar for the builder.
 */
import { useState } from "react";
import { CaretDown, CaretRight, Lightbulb, CheckCircle, XCircle } from "@phosphor-icons/react";

const SECTION_TIPS = {
    personal: [
        "Use a professional email (firstname.lastname@domain).",
        "Include city + state (not full address).",
        "Link LinkedIn or a portfolio for extra credibility.",
    ],
    summary: [
        "2–3 lines max. Who you are + core skills + 1 big result.",
        "Lead with years of experience: 'Backend engineer with 4+ years…'",
        "Quantify impact: ' served 2M users', 'cut latency by 60%'.",
    ],
    experience: [
        "Use numbers! Replace 'improved sales' with 'increased sales by 35%'.",
        "Start bullets with action verbs: Led, Built, Managed, Shipped.",
        "Focus on impact, not responsibilities.",
        "Keep bullets to 1–2 lines each.",
    ],
    skills: [
        "List hard skills first (tools, tech), soft skills second.",
        "Match skills to the JD keywords.",
        "Avoid 'Microsoft Word' on tech resumes — it's assumed.",
    ],
    education: [
        "Newer grads: put education first, include GPA if 3.5+.",
        "Experienced professionals: keep education minimal.",
        "Include relevant coursework if changing fields.",
    ],
    projects: [
        "Show impact: stars, downloads, users reached.",
        "Link to live demo or repo when possible.",
        "Only include projects relevant to the role.",
    ],
};

const COMMON_MISTAKES = [
    { bad: "❌ Don't write 'References available upon request'" },
    { bad: "❌ No photos on resume (US/Canada/UK standards)" },
    { bad: "❌ Avoid tables, text boxes — ATS can't parse them" },
    { bad: "❌ Skip fancy fonts — stick to web-safe (Arial, Georgia, Calibri)" },
    { good: "✅ Keep to 1 page if under 10 years of experience" },
    { good: "✅ Use keywords from the job description" },
    { good: "✅ Save as PDF when applying" },
    { good: "✅ Tailor each resume for the specific role" },
];

export default function TipsSidebar({ activeSection }) {
    const [open, setOpen] = useState(true);
    const sectionTips = SECTION_TIPS[activeSection] || SECTION_TIPS.experience;

    return (
        <div className="border border-[#E5E7EB]" style={{ borderRadius: 2 }} data-testid="tips-sidebar">
            <button
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between p-3 hover:bg-[#F4F5F7]"
                data-testid="tips-toggle"
            >
                <div className="flex items-center gap-2">
                    <Lightbulb size={14} weight="duotone" className="text-[#FFB300]" />
                    <span className="rp-overline">Pro tips</span>
                </div>
                {open ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
            </button>
            {open && (
                <div className="p-4 border-t border-[#E5E7EB] space-y-4">
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#FF4400] mb-2">
                            For {activeSection || "experience"}
                        </div>
                        <ul className="space-y-1.5">
                            {sectionTips.map((t, i) => (
                                <li key={i} className="text-xs text-[#0D0D12] leading-snug flex gap-1.5">
                                    <span className="text-[#FF4400] font-bold">→</span> {t}
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-[#4A4D57] mb-2">Common mistakes</div>
                        <ul className="space-y-1">
                            {COMMON_MISTAKES.map((m, i) => (
                                <li key={i} className="text-[11px] text-[#4A4D57] leading-snug">
                                    {m.bad || m.good}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    );
}
