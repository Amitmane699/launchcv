import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUIStore = create(
    persist(
        (set) => ({
            lang: "en",
            theme: "light",
            setLang: (lang) => set({ lang }),
            setTheme: (theme) => set({ theme }),
        }),
        { name: "lcv-ui" },
    ),
);

export const STRINGS = {
    en: {
        brand: "LaunchCV",
        tagline: "Build ATS Resume. Find Jobs. Get Hired. All in One Place.",
        subtext: "India's fastest resume builder with a built-in job board. No AI. No waiting. Just results.",
        ctaBuild: "Build My Resume Free",
        ctaPost: "Post a Job — ₹999",
        trustBar: "PayUmoney secured · No hidden charges · Used by 200+ colleges · Cancel anytime",
        login: "Log In", signup: "Sign Up", logout: "Log Out",
        dashboard: "Dashboard", resumes: "Resumes", jobs: "Jobs", tracker: "Tracker",
        pricing: "Pricing", admin: "Admin", postJob: "Post a Job",
        buildResume: "Build New Resume", applyNow: "Apply Now", saveJob: "Save",
        atsScore: "ATS Score", keyword: "Keyword", matched: "Matched", missing: "Missing",
        upgrade: "Upgrade", free: "Free", pro: "Pro",
        email: "Email", password: "Password", name: "Full Name", phone: "Phone",
        role: "I am a", jobseeker: "Job Seeker", employer: "Employer",
        submit: "Submit", cancel: "Cancel", save: "Save", delete: "Delete", edit: "Edit",
        download: "Download PDF", share: "Share", duplicate: "Duplicate",
        searchJobs: "Search jobs, companies, skills…",
        location: "Location", category: "Category",
        wishlist: "Wishlist", applied: "Applied", interview: "Interview", offer: "Offer", rejected: "Rejected",
        addApplication: "Track a New Role",
    },
    hinglish: {
        brand: "LaunchCV",
        tagline: "ATS Resume banao. Jobs dhundo. Select ho jao. Sab ek jagah.",
        subtext: "India ka fastest resume builder + job board. No AI. No waiting. Sirf results.",
        ctaBuild: "Free me Resume banao",
        ctaPost: "Job post karo — ₹999",
        trustBar: "PayUmoney secure · No hidden charges · 200+ college use karte hain · Kabhi bhi cancel karo",
        login: "Login karo", signup: "Sign up karo", logout: "Logout",
        dashboard: "Dashboard", resumes: "Resume", jobs: "Jobs", tracker: "Tracker",
        pricing: "Pricing", admin: "Admin", postJob: "Job Post karo",
        buildResume: "Naya Resume banao", applyNow: "Apply karo", saveJob: "Save",
        atsScore: "ATS Score", keyword: "Keyword", matched: "Match hua", missing: "Missing",
        upgrade: "Upgrade karo", free: "Free", pro: "Pro",
        email: "Email", password: "Password", name: "Pura Naam", phone: "Phone",
        role: "Main hoon", jobseeker: "Job dhundh raha", employer: "Employer",
        submit: "Submit karo", cancel: "Cancel", save: "Save karo", delete: "Delete", edit: "Edit karo",
        download: "PDF Download karo", share: "Share karo", duplicate: "Copy banao",
        searchJobs: "Jobs, company, skills search karo…",
        location: "Location", category: "Category",
        wishlist: "Wishlist", applied: "Apply kiya", interview: "Interview", offer: "Offer", rejected: "Reject",
        addApplication: "Nayi role track karo",
    },
};

export const useT = () => {
    const lang = useUIStore((s) => s.lang);
    return STRINGS[lang] || STRINGS.en;
};
