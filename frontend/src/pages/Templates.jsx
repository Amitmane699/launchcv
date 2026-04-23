import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { TEMPLATES } from "../components/ResumePreview";
import ResumePreview from "../components/ResumePreview";
import { SAMPLE_RESUME } from "../data/sampleResume";
import { toast } from "sonner";
import { CheckCircle, ArrowRight } from "@phosphor-icons/react";

const CATEGORIES = ["All", "Classic", "Modern", "Minimal", "Bold", "Tech", "Creative", "Executive", "Corporate", "Student", "Compact"];

export default function Templates() {
    const [cat, setCat] = useState("All");
    const { user } = useAuthStore();
    const nav = useNavigate();

    async function applyTemplate(id) {
        if (!user) { nav("/signup"); return; }
        try {
            const r = await api.post("/resumes", {
                name: `${TEMPLATES.find(t => t.id === id)?.name || "Resume"} Resume`,
                template_id: id,
                data: SAMPLE_RESUME,
            });
            toast.success("Resume created with this template");
            nav(`/builder/${r.data.id}`);
        } catch {
            toast.error("Could not create — upgrade if you've reached the resume limit");
            nav("/pricing");
        }
    }

    const list = cat === "All" ? TEMPLATES : TEMPLATES.filter((t) => t.category === cat);

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
            <div>
                <span className="rp-overline">Templates</span>
                <h1 className="font-display font-extrabold text-4xl mt-2 tracking-tight">21 ATS-safe templates</h1>
                <p className="text-[#4A4D57] mt-1">Every template is single or two-column, uses web-safe fonts (Arial · Georgia · Helvetica · Calibri), and contains no images or tables. Pick one and start.</p>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-6" data-testid="template-categories">
                {CATEGORIES.map((c) => (
                    <button key={c} onClick={() => setCat(c)} data-testid={`cat-${c}`}
                        className={`text-xs px-3 py-1.5 font-semibold border transition-colors ${cat === c ? "bg-[#0D0D12] text-white border-[#0D0D12]" : "bg-white border-[#E5E7EB] hover:border-[#0D0D12]"}`}
                        style={{ borderRadius: 2 }}>
                        {c}
                    </button>
                ))}
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                {list.map((t) => (
                    <div key={t.id} className="rp-card overflow-hidden flex flex-col" data-testid={`template-card-${t.id}`}>
                        <div className="bg-[#F4F5F7] p-4 relative" style={{ height: 380 }}>
                            <div className="absolute top-2 right-2 z-10 bg-[#00A859] text-white text-[9px] font-bold px-1.5 py-0.5 flex items-center gap-1" style={{ borderRadius: 2 }}>
                                <CheckCircle weight="fill" size={10} /> ATS Safe
                            </div>
                            <div className="scale-[0.45] origin-top-left" style={{ width: "222%", height: "222%" }}>
                                <div className="bg-white shadow-sm" style={{ width: 600 }}>
                                    <ResumePreview resume={{ template_id: t.id, data: SAMPLE_RESUME }} />
                                </div>
                            </div>
                        </div>
                        <div className="p-5 border-t border-[#E5E7EB]">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-display font-bold text-lg">{t.name}</div>
                                    <div className="text-xs text-[#4A4D57] mt-0.5">{t.desc}</div>
                                </div>
                                <span className="rp-chip">{t.category}</span>
                            </div>
                            <button onClick={() => applyTemplate(t.id)} className="rp-btn-orange w-full mt-4 !text-xs" data-testid={`use-template-${t.id}`}>
                                Use This Template <ArrowRight size={12} weight="bold" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
