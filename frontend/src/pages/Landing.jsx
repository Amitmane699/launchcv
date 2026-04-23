import { Link } from "react-router-dom";
import { useT } from "../lib/i18n";
import { ArrowRight, CheckCircle, Lightning, Target, Kanban, ChartBar, ShieldCheck, Users } from "@phosphor-icons/react";

export default function Landing() {
    const t = useT();

    return (
        <div>
            {/* ───── HERO ───── */}
            <section className="relative border-b border-[#0D0D12] overflow-hidden" data-testid="hero-section">
                <div className="absolute inset-0 rp-grid-bg opacity-40 pointer-events-none" />
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 md:py-24 relative">
                    <div className="grid lg:grid-cols-12 gap-10 items-center">
                        <div className="lg:col-span-7 rp-rise">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#0D0D12] text-white text-xs uppercase tracking-[0.2em] font-semibold" style={{ borderRadius: 2 }}>
                                <Lightning weight="fill" size={12} className="text-[#FF4400]" />
                                No AI · No waiting · Just results
                            </div>
                            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl mt-6 leading-[1.05] tracking-tight">
                                Build ATS Resume.<br />
                                Find Jobs. <span className="text-[#FF4400]">Get Hired.</span><br />
                                All in One Place.
                            </h1>
                            <p className="mt-6 text-base sm:text-lg text-[#4A4D57] max-w-xl">
                                {t.subtext} Built for Tier-2 &amp; Tier-3 India. Start free — upgrade only if you love it.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link to="/signup" className="rp-btn-orange" data-testid="hero-cta-build">
                                    {t.ctaBuild} <ArrowRight weight="bold" size={16} />
                                </Link>
                                <Link to="/post-job" className="rp-btn-outline" data-testid="hero-cta-post">
                                    {t.ctaPost}
                                </Link>
                            </div>
                            <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-[#4A4D57]">
                                <span className="flex items-center gap-1"><CheckCircle weight="fill" size={14} className="text-[#00A859]" /> PayUmoney secured</span>
                                <span className="flex items-center gap-1"><CheckCircle weight="fill" size={14} className="text-[#00A859]" /> No hidden charges</span>
                                <span className="flex items-center gap-1"><CheckCircle weight="fill" size={14} className="text-[#00A859]" /> 200+ colleges</span>
                                <span className="flex items-center gap-1"><CheckCircle weight="fill" size={14} className="text-[#00A859]" /> Cancel anytime</span>
                            </div>
                        </div>
                        <div className="lg:col-span-5 rp-rise rp-rise-2">
                            <HeroPreview />
                        </div>
                    </div>
                </div>
            </section>

            {/* ───── FEATURE GRID ───── */}
            <section className="py-20 border-b border-[#E5E7EB]" data-testid="features-section">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="max-w-2xl">
                        <span className="rp-overline">What you get</span>
                        <h2 className="font-display font-extrabold text-4xl sm:text-5xl mt-3 tracking-tight">Everything you need to go from resume to offer.</h2>
                    </div>
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0 border border-[#0D0D12]" style={{ borderRadius: 2 }}>
                        {[
                            { icon: Target, title: "Rule-based ATS score", body: "Instant 0-100 score. Paste any JD, see exactly what's missing. No AI, no delay." },
                            { icon: Lightning, title: "15 ATS templates", body: "Designed to parse cleanly through every Applicant Tracking System used in India." },
                            { icon: Kanban, title: "Kanban tracker", body: "Drag applications through wishlist → applied → interview → offer. Never lose track." },
                            { icon: ChartBar, title: "Live job board", body: "Filter by city, salary, remote. ATS match score on every listing. Apply in one click." },
                        ].map((f, i) => (
                            <div key={i} className="p-6 border-r border-b border-[#0D0D12] last:border-r-0 md:even:border-r-0 lg:md:even:border-r lg:last:border-r-0" data-testid={`feature-${i}`}>
                                <f.icon size={28} weight="duotone" className="text-[#FF4400]" />
                                <h3 className="font-display font-bold text-lg mt-4">{f.title}</h3>
                                <p className="text-sm text-[#4A4D57] mt-2 leading-relaxed">{f.body}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───── HOW ───── */}
            <section className="py-20 bg-[#F4F5F7]" data-testid="how-section">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <span className="rp-overline">How it works</span>
                            <h2 className="font-display font-extrabold text-4xl sm:text-5xl mt-3 tracking-tight">Three steps. Two minutes. One hire.</h2>
                        </div>
                    </div>
                    <div className="mt-12 grid md:grid-cols-3 gap-4">
                        {[
                            { n: "01", t: "Build", d: "Pick a template. Fill in. Your resume appears next to you in real time." },
                            { n: "02", t: "Score", d: "Paste a JD. Get an instant ATS score with matched and missing keywords." },
                            { n: "03", t: "Apply & Track", d: "Apply to jobs, track status on the Kanban board, celebrate offers." },
                        ].map((s) => (
                            <div key={s.n} className="bg-white border border-[#0D0D12] p-8" style={{ borderRadius: 2 }} data-testid={`step-${s.n}`}>
                                <div className="font-mono text-sm text-[#FF4400] font-bold">{s.n}</div>
                                <div className="font-display font-extrabold text-3xl mt-4">{s.t}</div>
                                <p className="text-sm text-[#4A4D57] mt-3 leading-relaxed">{s.d}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ───── SOCIAL PROOF ───── */}
            <section className="py-20 border-t border-[#E5E7EB]" data-testid="testimonials-section">
                <div className="max-w-7xl mx-auto px-4 md:px-8 grid md:grid-cols-2 gap-12 items-center">
                    <div>
                        <span className="rp-overline">Real stories</span>
                        <h2 className="font-display font-extrabold text-4xl mt-3 tracking-tight">From Jhansi to Bengaluru — resumes that land interviews.</h2>
                        <div className="mt-8 space-y-6">
                            <Testimonial
                                quote="Pehla resume banake Swiggy me interview mil gaya. ATS score feature lajawab hai."
                                name="Rahul K." role="Data Analyst, Swiggy"
                                img="https://images.unsplash.com/photo-1737574821698-862e77f044c1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2Nzd8MHwxfHNlYXJjaHwxfHxpbmRpYW4lMjBwcm9mZXNzaW9uYWwlMjBvZmZpY2UlMjBwb3J0cmFpdHxlbnwwfHx8fDE3NzY2Mjk5MzJ8MA&ixlib=rb-4.1.0&q=85"
                            />
                            <Testimonial
                                quote="The Kanban tracker kept my 40 applications organized. Offer from Razorpay in 3 weeks."
                                name="Priya S." role="Frontend Engineer, Razorpay"
                                img="https://images.pexels.com/photos/7580822/pexels-photo-7580822.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <StatTile num="12,847" label="Users onboard" />
                        <StatTile num="₹4.8L" label="Monthly revenue" accent />
                        <StatTile num="387" label="Active jobs" />
                        <StatTile num="68%" label="Interview rate" accent />
                    </div>
                </div>
            </section>

            {/* ───── CTA ───── */}
            <section className="py-20 bg-[#0D0D12] text-white" data-testid="cta-section">
                <div className="max-w-5xl mx-auto px-4 md:px-8 text-center">
                    <h2 className="font-display font-extrabold text-4xl md:text-6xl tracking-tight">Your next job is <span className="text-[#FF4400]">two minutes</span> away.</h2>
                    <p className="mt-5 text-[#9CA3AF] max-w-2xl mx-auto">Start building. If you don't get an interview, you pay nothing.</p>
                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <Link to="/signup" className="rp-btn-orange" data-testid="final-cta-signup">Start for Free <ArrowRight weight="bold" size={16} /></Link>
                        <Link to="/pricing" className="rp-btn-outline !text-white !border-white hover:!bg-white hover:!text-black" data-testid="final-cta-pricing">See Pricing</Link>
                    </div>
                </div>
            </section>
        </div>
    );
}

function Testimonial({ quote, name, role, img }) {
    return (
        <div className="flex gap-4" data-testid="testimonial">
            <img src={img} alt={name} className="w-14 h-14 object-cover border border-[#0D0D12]" style={{ borderRadius: 2 }} />
            <div>
                <p className="text-[#0D0D12] leading-relaxed">"{quote}"</p>
                <div className="mt-2 text-xs"><b>{name}</b> · <span className="text-[#4A4D57]">{role}</span></div>
            </div>
        </div>
    );
}

function StatTile({ num, label, accent }) {
    return (
        <div className={`p-6 border ${accent ? "bg-[#0D0D12] text-white border-[#0D0D12]" : "bg-white border-[#0D0D12]"}`} style={{ borderRadius: 2 }}>
            <div className="font-display font-extrabold text-4xl tracking-tight">{num}</div>
            <div className={`text-xs uppercase tracking-wider mt-1 ${accent ? "text-[#FF4400]" : "text-[#4A4D57]"}`}>{label}</div>
        </div>
    );
}

function HeroPreview() {
    return (
        <div className="relative">
            <div className="bg-white border border-[#0D0D12] p-6 shadow-sm" style={{ borderRadius: 2 }}>
                <div className="flex items-start justify-between">
                    <div>
                        <div className="font-display font-extrabold text-2xl">Aarav Sharma</div>
                        <div className="text-xs text-[#4A4D57] mt-1">Software Engineer · Bengaluru</div>
                    </div>
                    <div className="text-right">
                        <div className="rp-overline">ATS Score</div>
                        <div className="font-display font-extrabold text-3xl text-[#00A859]">86</div>
                    </div>
                </div>
                <div className="h-px bg-[#0D0D12] my-4" />
                <div className="rp-overline">SUMMARY</div>
                <p className="text-xs text-[#4A4D57] mt-1 leading-relaxed">Backend engineer with 3 years building Python + FastAPI services at scale.</p>
                <div className="rp-overline mt-3">EXPERIENCE</div>
                <div className="mt-1 text-xs">
                    <div className="flex justify-between"><b>Flipkart</b><span className="text-[#4A4D57]">2023—</span></div>
                    <div className="text-[#4A4D57]">Built payment APIs handling 2M req/day.</div>
                </div>
                <div className="rp-overline mt-3">SKILLS</div>
                <div className="mt-1 flex flex-wrap gap-1">
                    {["Python", "FastAPI", "PostgreSQL", "React", "AWS"].map((s) => (
                        <span key={s} className="text-[10px] px-2 py-0.5 border border-[#0D0D12]" style={{ borderRadius: 2 }}>{s}</span>
                    ))}
                </div>
            </div>
            <div className="absolute -right-4 -bottom-4 bg-[#FF4400] text-white px-4 py-3 shadow-lg rotate-2" style={{ borderRadius: 2 }}>
                <div className="text-[10px] uppercase tracking-[0.2em] font-semibold">Matched</div>
                <div className="font-display font-extrabold text-xl">12 / 15 keywords</div>
            </div>
        </div>
    );
}
