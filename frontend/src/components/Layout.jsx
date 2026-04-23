import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useUIStore, useT } from "../lib/i18n";
import { Translate, SignOut, User, List, X, Moon, Sun } from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import { api } from "../lib/api";

export default function Layout({ children }) {
    const { user, logout } = useAuthStore();
    const { lang, setLang, theme, setTheme } = useUIStore();
    const t = useT();
    const nav = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [banner, setBanner] = useState(null);

    useEffect(() => {
        api.get("/settings/public").then((r) => {
            const ab = r.data?.announcement_banner;
            if (ab && ab.active && ab.text) setBanner(ab.text);
        }).catch(() => {});
    }, []);
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme || "light");
    }, [theme]);

    const doLogout = () => { logout(); nav("/"); };

    return (
        <div className="min-h-screen flex flex-col bg-white">
            {banner && (
                <div className="bg-[#0D0D12] text-white text-sm px-4 py-2 text-center" data-testid="announcement-banner">
                    {banner}
                </div>
            )}
            <header className="sticky top-0 z-40 bg-white border-b border-[#0D0D12]" data-testid="main-header">
                <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2" data-testid="logo-link">
                        <div className="w-8 h-8 bg-[#0D0D12] text-white grid place-items-center font-display font-extrabold text-lg" style={{ borderRadius: 2 }}>L</div>
                        <span className="font-display font-extrabold text-xl tracking-tight">launchcv<span className="text-[#FF4400]">.</span>in</span>
                    </Link>

                    <nav className="hidden lg:flex items-center gap-1">
                        <NavItem to="/templates" label="Templates" testid="nav-templates" />
                        <NavItem to="/jobs" label={t.jobs} testid="nav-jobs" />
                        <NavItem to="/pricing" label={t.pricing} testid="nav-pricing" />
                        {user && <NavItem to="/dashboard" label={t.dashboard} testid="nav-dashboard" />}
                        {user && <NavItem to="/tracker" label={t.tracker} testid="nav-tracker" />}
                        {user && <NavItem to="/skill-gap" label="Skill Radar" testid="nav-skill-gap" />}
                        {user && <NavItem to="/career-graph" label="Career Graph" testid="nav-career-graph" />}
                        {user && <NavItem to="/cover-letter" label="Cover Letter" testid="nav-cover-letter" />}
                        {user && <NavItem to="/compare" label="JD Compare" testid="nav-compare" />}
                        {user && <NavItem to="/job-alerts" label="Alerts" testid="nav-alerts" />}
                        {user && <NavItem to="/referrals" label="Referrals" testid="nav-referrals" />}
                        {user && user.role === "employer" && <NavItem to="/employer" label="Employer" testid="nav-employer" />}
                        {user && (user.role === "admin" || user.role === "superadmin") && (
                            <NavItem to="/admin" label={t.admin} testid="nav-admin" />
                        )}
                    </nav>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                            className="p-2 border border-[#E5E7EB] hover:border-[#0D0D12] transition-colors"
                            style={{ borderRadius: 2 }}
                            title="Toggle theme"
                            data-testid="theme-toggle"
                        >
                            {theme === "dark" ? <Sun size={14} weight="bold" /> : <Moon size={14} weight="bold" />}
                        </button>
                        <button
                            onClick={() => setLang(lang === "en" ? "hinglish" : "en")}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider font-semibold border border-[#E5E7EB] hover:border-[#0D0D12] transition-colors"
                            style={{ borderRadius: 2 }}
                            data-testid="lang-toggle"
                        >
                            <Translate size={14} weight="bold" />
                            {lang === "en" ? "EN" : "HI"}
                        </button>
                        {!user ? (
                            <>
                                <Link to="/login" className="hidden sm:inline-block px-3 py-2 text-sm font-semibold hover:text-[#FF4400]" data-testid="header-login-btn">{t.login}</Link>
                                <Link to="/signup" className="rp-btn-orange !py-2 !px-4" data-testid="header-signup-btn">{t.signup}</Link>
                            </>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Link to="/dashboard" className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-[#E5E7EB] hover:border-[#0D0D12]" style={{ borderRadius: 2 }} data-testid="user-pill">
                                    <User size={14} weight="bold" />
                                    <span className="truncate max-w-[100px]">{user.name || user.email}</span>
                                </Link>
                                <button onClick={doLogout} className="p-2 border border-[#E5E7EB] hover:border-[#0D0D12]" style={{ borderRadius: 2 }} data-testid="logout-btn">
                                    <SignOut size={16} weight="bold" />
                                </button>
                            </div>
                        )}
                        <button className="lg:hidden p-2" onClick={() => setMenuOpen(!menuOpen)} data-testid="mobile-menu-toggle">
                            {menuOpen ? <X size={20} /> : <List size={20} />}
                        </button>
                    </div>
                </div>
                {menuOpen && (
                    <div className="lg:hidden border-t border-[#E5E7EB] px-4 py-3 space-y-1" data-testid="mobile-menu">
                        <MobileLink to="/templates" label="Templates" onClick={() => setMenuOpen(false)} />
                        <MobileLink to="/jobs" label={t.jobs} onClick={() => setMenuOpen(false)} />
                        <MobileLink to="/pricing" label={t.pricing} onClick={() => setMenuOpen(false)} />
                        {user && <MobileLink to="/dashboard" label={t.dashboard} onClick={() => setMenuOpen(false)} />}
                        {user && <MobileLink to="/tracker" label={t.tracker} onClick={() => setMenuOpen(false)} />}
                        {user && user.role === "employer" && <MobileLink to="/employer" label="Employer" onClick={() => setMenuOpen(false)} />}
                        {user && (user.role === "admin" || user.role === "superadmin") && (
                            <MobileLink to="/admin" label={t.admin} onClick={() => setMenuOpen(false)} />
                        )}
                    </div>
                )}
            </header>
            <main className="flex-1">{children}</main>
            <footer className="border-t border-[#E5E7EB] mt-20 py-10 bg-[#F4F5F7]">
                <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row justify-between gap-6 text-sm">
                    <div>
                        <div className="font-display font-extrabold text-lg">launchcv<span className="text-[#FF4400]">.</span>in</div>
                        <p className="text-[#4A4D57] mt-2 max-w-sm">{t.trustBar}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-8 gap-y-2">
                        <Link to="/jobs" className="text-[#4A4D57] hover:text-[#0D0D12]">Browse Jobs</Link>
                        <Link to="/pricing" className="text-[#4A4D57] hover:text-[#0D0D12]">Pricing</Link>
                        <Link to="/post-job" className="text-[#4A4D57] hover:text-[#0D0D12]">Post a Job</Link>
                        <a className="text-[#4A4D57] hover:text-[#0D0D12]" href="#">About</a>
                        <a className="text-[#4A4D57] hover:text-[#0D0D12]" href="#">Contact</a>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto px-4 md:px-8 mt-6 pt-6 border-t border-[#E5E7EB] text-xs text-[#4A4D57]">
                    © 2026 LaunchCV ATS · Made in India for Indian job seekers.
                </div>
            </footer>
        </div>
    );
}

function NavItem({ to, label, testid }) {
    return (
        <NavLink
            to={to}
            data-testid={testid}
            className={({ isActive }) =>
                `px-3 py-2 text-sm font-medium transition-colors ${isActive ? "text-[#FF4400]" : "text-[#0D0D12] hover:text-[#FF4400]"}`
            }
        >
            {label}
        </NavLink>
    );
}

function MobileLink({ to, label, onClick }) {
    return (
        <Link to={to} onClick={onClick} className="block px-3 py-2 text-sm font-medium hover:bg-[#F4F5F7]" data-testid={`mobile-nav-${label.toLowerCase().replace(/\s/g, '-')}`}>
            {label}
        </Link>
    );
}
