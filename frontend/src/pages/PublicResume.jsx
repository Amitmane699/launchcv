import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import ResumePreview from "../components/ResumePreview";

export default function PublicResume() {
    const { token } = useParams();
    const [resume, setResume] = useState(null);
    const [err, setErr] = useState(false);

    useEffect(() => {
        api.get(`/resumes/public/${token}`).then((r) => setResume(r.data)).catch(() => setErr(true));
    }, [token]);

    if (err) return <div className="p-10 text-center text-[#4A4D57]">This resume is not available.</div>;
    if (!resume) return <div className="p-10 text-center text-[#4A4D57]">Loading…</div>;

    return (
        <div className="max-w-3xl mx-auto py-10 px-4">
            <div className="bg-white shadow-sm border border-[#E5E7EB]" style={{ borderRadius: 2 }}>
                <ResumePreview resume={resume} />
            </div>
            <div className="text-center text-xs text-[#4A4D57] mt-4">
                Made with <a href="/" className="text-[#FF4400] font-bold">launchcv.in</a>
            </div>
        </div>
    );
}
