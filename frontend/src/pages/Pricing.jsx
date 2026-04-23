import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, X, ArrowRight, Lightning } from "@phosphor-icons/react";
import { useAuthStore } from "../store/authStore";
import { api } from "../lib/api";
import { toast } from "sonner";

const JOBSEEKER_PLANS = [
    {
        id: "free", plan_key: null,
        name: "Free", monthly: 0, annual: 0, tagline: "Try everything.",
        features: ["1 resume", "3 ATS checks / month", "1 watermarked PDF", "3 templates", "Browse jobs"],
        missing: ["Apply via platform", "Job alerts", "All 15 templates", "Cloud draft sync"],
    },
    {
        id: "resume_pro", plan_key: "resume_pro_monthly", annual_key: "resume_pro_annual",
        name: "Resume Pro", monthly: 149, annual: 999, tagline: "For serious builders.",
        features: ["Unlimited resumes", "Unlimited ATS checks", "All 15 templates", "Clean PDF + DOCX", "Cloud sync + versions", "Shareable resume link", "Cover letter generator"],
        missing: ["Apply via platform", "Kanban tracker"],
    },
    {
        id: "jobseeker_pro", plan_key: "jobseeker_pro_monthly", annual_key: "jobseeker_pro_annual",
        name: "Job Seeker Pro", monthly: 249, annual: 1499, tagline: "Build + apply + track.", popular: true,
        features: ["Everything in Resume Pro", "Unlimited job applications", "Job alerts (instant/daily/weekly)", "ATS match score per job", "Kanban application tracker", "1 free manual review / month"],
    },
    {
        id: "combo_pro", plan_key: "combo_pro_monthly", annual_key: "combo_pro_annual",
        name: "Combo Pro", monthly: 299, annual: 1999, tagline: "Maximum value.",
        features: ["Everything in Job Seeker Pro", "Referral rewards doubled (30-day free)", "College placement portal access", "Dedicated priority support"],
    },
];

const EMPLOYER_PLANS = [
    { id: "employer_starter", plan_key: "employer_starter", name: "Starter", price: 999, per: "per listing / 30 days",
      features: ["1 standard job listing", "Unlimited applicants", "ATS scores per applicant", "Email on each application"] },
    { id: "employer_growth", plan_key: "employer_growth", name: "Growth", price: 2499, per: "per featured listing / 30 days", popular: true,
      features: ["Featured (top of search)", "All Starter features", "CSV export of applicants", "Renewal reminders"] },
    { id: "employer_scale", plan_key: "employer_scale", name: "Scale", price: 7999, per: "/ month",
      features: ["10 active listings", "5 featured slots / month", "Branded company page", "Priority verification", "Analytics by listing"] },
];

export default function Pricing() {
    const [annual, setAnnual] = useState(true);
    const { user } = useAuthStore();
    const nav = useNavigate();

    function checkout(planKey) {
        if (!user) { nav("/signup"); return; }
        if (!planKey) { nav("/signup"); return; }
        nav(`/checkout?type=${planKey}`);
    }

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
            <div className="text-center max-w-2xl mx-auto">
                <span className="rp-overline text-[#FF4400]">Pricing · Transparent, no hidden charges</span>
                <h1 className="font-display font-extrabold text-5xl mt-3 tracking-tight">Start free. <br />Upgrade only if it helps.</h1>
                <p className="text-[#4A4D57] mt-4">Built for Tier-2 & Tier-3 India. Every plan includes a money-back guarantee.</p>
            </div>

            <div className="mt-8 flex justify-center">
                <div className="inline-flex border border-[#0D0D12]" style={{ borderRadius: 2 }} data-testid="pricing-toggle">
                    <button onClick={() => setAnnual(false)} className={`px-5 py-2 text-sm font-semibold ${!annual ? "bg-[#0D0D12] text-white" : "bg-white"}`} data-testid="pricing-monthly">Monthly</button>
                    <button onClick={() => setAnnual(true)} className={`px-5 py-2 text-sm font-semibold ${annual ? "bg-[#0D0D12] text-white" : "bg-white"}`} data-testid="pricing-annual">Annual <span className="text-[#FF4400]">· Save 45%</span></button>
                </div>
            </div>

            <div className="mt-10">
                <div className="text-center mb-6"><span className="rp-overline">For Job Seekers</span></div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {JOBSEEKER_PLANS.map((p) => {
                        const price = annual ? p.annual : p.monthly;
                        const key = annual ? p.annual_key : p.plan_key;
                        return (
                            <div key={p.id} className={`border p-6 flex flex-col ${p.popular ? "border-[#FF4400] border-2 relative" : "border-[#0D0D12]"}`} style={{ borderRadius: 2 }} data-testid={`plan-${p.id}`}>
                                {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF4400] text-white text-[10px] px-2 py-0.5 uppercase tracking-wider font-bold" style={{ borderRadius: 2 }}><Lightning weight="fill" size={10} className="inline" /> Most popular</span>}
                                <div className="font-display font-extrabold text-2xl">{p.name}</div>
                                <div className="text-xs text-[#4A4D57] mt-1">{p.tagline}</div>
                                <div className="mt-4">
                                    <span className="font-display font-extrabold text-4xl">{price === 0 ? "Free" : `₹${price}`}</span>
                                    {price > 0 && <span className="text-xs text-[#4A4D57] ml-1">/ {annual ? "year" : "month"}</span>}
                                </div>
                                <button onClick={() => p.id === "free" ? nav("/signup") : checkout(key)} className={`w-full mt-5 ${p.popular ? "rp-btn-orange" : "rp-btn-primary"}`} data-testid={`plan-cta-${p.id}`}>
                                    {p.id === "free" ? "Get started" : user?.plan === p.id ? "Current plan" : "Upgrade"} <ArrowRight size={14} weight="bold" />
                                </button>
                                <div className="mt-6 space-y-2 flex-1">
                                    {p.features.map((f) => (
                                        <div key={f} className="flex gap-2 text-xs"><Check weight="bold" size={14} className="text-[#00A859] shrink-0 mt-0.5" /><span>{f}</span></div>
                                    ))}
                                    {p.missing && p.missing.map((f) => (
                                        <div key={f} className="flex gap-2 text-xs text-[#4A4D57]"><X weight="bold" size={14} className="shrink-0 mt-0.5" /><span className="line-through">{f}</span></div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="mt-16">
                <div className="text-center mb-6"><span className="rp-overline">For Employers</span></div>
                <div className="grid md:grid-cols-3 gap-4">
                    {EMPLOYER_PLANS.map((p) => (
                        <div key={p.id} className={`border p-6 flex flex-col ${p.popular ? "border-[#FF4400] border-2 relative" : "border-[#0D0D12]"}`} style={{ borderRadius: 2 }} data-testid={`emp-plan-${p.id}`}>
                            {p.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF4400] text-white text-[10px] px-2 py-0.5 uppercase tracking-wider font-bold" style={{ borderRadius: 2 }}>Best value</span>}
                            <div className="font-display font-extrabold text-2xl">{p.name}</div>
                            <div className="mt-4">
                                <span className="font-display font-extrabold text-4xl">₹{p.price.toLocaleString("en-IN")}</span>
                                <span className="text-xs text-[#4A4D57] ml-1">{p.per}</span>
                            </div>
                            <button onClick={() => checkout(p.plan_key)} className={`w-full mt-5 ${p.popular ? "rp-btn-orange" : "rp-btn-primary"}`} data-testid={`emp-plan-cta-${p.id}`}>
                                Choose {p.name} <ArrowRight size={14} weight="bold" />
                            </button>
                            <div className="mt-6 space-y-2">
                                {p.features.map((f) => (
                                    <div key={f} className="flex gap-2 text-xs"><Check weight="bold" size={14} className="text-[#00A859] shrink-0 mt-0.5" /><span>{f}</span></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-16 grid md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {[
                    { title: "Single PDF", p: 49, sub: "No subscription", plan: "download" },
                    { title: "50 PDFs bulk", p: 999, sub: "One-time", plan: "bulk_downloads" },
                    { title: "Manual review", p: 199, sub: "48 hr turnaround", plan: "review" },
                    { title: "Listing renewal", p: 999, sub: "+30 more days", plan: "job_renewal" },
                ].map((pp) => (
                    <div key={pp.title} className="border border-[#E5E7EB] p-4 text-center" style={{ borderRadius: 2 }}>
                        <div className="text-xs uppercase tracking-wider text-[#4A4D57]">{pp.title}</div>
                        <div className="font-display font-extrabold text-2xl mt-1">₹{pp.p}</div>
                        <div className="text-[10px] text-[#4A4D57] mt-1">{pp.sub}</div>
                        <button onClick={() => checkout(pp.plan)} className="text-[10px] text-[#FF4400] font-bold mt-2 hover:underline" data-testid={`ppu-${pp.plan}`}>Buy now →</button>
                    </div>
                ))}
            </div>
        </div>
    );
}
