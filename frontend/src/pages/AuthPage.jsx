import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { toast } from "sonner";
import { ArrowRight } from "@phosphor-icons/react";

export default function AuthPage({ mode }) {
    const isSignup = mode === "signup";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("jobseeker");
    const [loading, setLoading] = useState(false);
    const [params] = useSearchParams();
    const nav = useNavigate();
    const { setAuth } = useAuthStore();

    async function submit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            if (isSignup) {
                const r = await api.post("/auth/register", { email, password, name, role });
                setAuth(r.data.token, r.data.user);
                toast.success("Welcome to LaunchCV!");
                nav(role === "employer" ? "/employer" : "/dashboard");
            } else {
                const r = await api.post("/auth/login", { email, password });
                setAuth(r.data.token, r.data.user);
                toast.success("Welcome back!");
                const redirect = params.get("redirect");
                if (redirect) nav(redirect);
                else if (r.data.user.role === "admin" || r.data.user.role === "superadmin") nav("/admin");
                else if (r.data.user.role === "employer") nav("/employer");
                else nav("/dashboard");
            }
        } catch (err) {
            toast.error(err?.response?.data?.detail || err?.response?.data?.error || "Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-[calc(100vh-80px)] grid lg:grid-cols-2">
            <div className="hidden lg:block bg-[#0D0D12] text-white p-12 relative overflow-hidden">
                <div className="absolute inset-0 rp-grid-bg opacity-10 pointer-events-none" />
                <div className="relative h-full flex flex-col justify-between">
                    <div className="font-display font-extrabold text-2xl">launchcv<span className="text-[#FF4400]">.</span>in</div>
                    <div>
                        <div className="text-[#FF4400] text-xs uppercase tracking-[0.2em] font-bold">Success story · Jhansi</div>
                        <p className="font-display text-3xl mt-3 tracking-tight leading-tight">"Pehla resume banake Swiggy me interview mil gaya. ATS score feature lajawab hai."</p>
                        <div className="mt-4 text-sm text-[#9CA3AF]">Rahul K · Data Analyst at Swiggy</div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center p-6 md:p-12">
                <form onSubmit={submit} className="w-full max-w-md space-y-5" data-testid="auth-form">
                    <div>
                        <h1 className="font-display font-extrabold text-4xl tracking-tight">{isSignup ? "Create your account" : "Welcome back"}</h1>
                        <p className="text-[#4A4D57] mt-2 text-sm">{isSignup ? "Build your first ATS-ready resume in 2 minutes." : "Log in to continue building your career."}</p>
                    </div>
                    {isSignup && (
                        <>
                            <Field label="Full name">
                                <input className="rp-input" value={name} onChange={(e) => setName(e.target.value)} required data-testid="signup-name-input" />
                            </Field>
                            <div>
                                <label className="rp-overline block mb-2">I am a</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[{ v: "jobseeker", l: "Job Seeker" }, { v: "employer", l: "Employer" }].map((o) => (
                                        <button
                                            type="button"
                                            key={o.v}
                                            onClick={() => setRole(o.v)}
                                            className={`py-3 text-sm font-semibold border transition-colors ${role === o.v ? "bg-[#0D0D12] text-white border-[#0D0D12]" : "bg-white text-[#0D0D12] border-[#E5E7EB] hover:border-[#0D0D12]"}`}
                                            style={{ borderRadius: 2 }}
                                            data-testid={`role-${o.v}`}
                                        >
                                            {o.l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                    <Field label="Email">
                        <input className="rp-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="auth-email-input" />
                    </Field>
                    <Field label="Password">
                        <input className="rp-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} data-testid="auth-password-input" />
                    </Field>
                    <button disabled={loading} className="rp-btn-orange w-full disabled:opacity-50" data-testid="auth-submit-btn">
                        {loading ? "…" : (isSignup ? "Create Account" : "Log In")} <ArrowRight size={16} weight="bold" />
                    </button>
                    <div className="text-center text-sm text-[#4A4D57]">
                        {isSignup ? <>Already have an account? <Link to="/login" className="text-[#FF4400] font-semibold">Log in</Link></>
                            : <>No account? <Link to="/signup" className="text-[#FF4400] font-semibold">Create one</Link></>}
                    </div>
                </form>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <label className="block">
            <div className="rp-overline mb-1.5">{label}</div>
            {children}
        </label>
    );
}
