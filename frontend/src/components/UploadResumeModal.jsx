import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, API_BASE } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { toast } from "sonner";
import { UploadSimple, FileText, CheckCircle, X } from "@phosphor-icons/react";

export default function UploadResumeModal({ onClose }) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);
    const { token } = useAuthStore();
    const nav = useNavigate();

    async function handleFile(file) {
        if (!file) return;
        const allowed = [".pdf", ".docx"];
        if (!allowed.some((e) => file.name.toLowerCase().endsWith(e))) {
            setError("Only PDF or DOCX files supported."); return;
        }
        setUploading(true); setError(null);
        try {
            const fd = new FormData(); fd.append("file", file);
            const res = await fetch(`${API_BASE}/api/resumes/parse-upload`, {
                method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd,
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j.detail || "Could not parse");
            }
            const parsed = await res.json();
            // Create a new resume with parsed data
            const create = await api.post("/resumes", {
                name: parsed.data.personal.fullName ? `${parsed.data.personal.fullName} · Resume` : "Imported Resume",
                template_id: "classic",
                data: parsed.data,
            });
            const msg = parsed.confidence >= 60
                ? "We found your info! Review and edit below."
                : "Couldn't read all fields — please fill manually.";
            toast.success(msg);
            onClose?.();
            nav(`/builder/${create.data.id}`);
        } catch (e) {
            setError(String(e.message || e));
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-50 grid place-items-center p-4" onClick={onClose}>
            <div className="bg-white border border-[#0D0D12] p-6 w-full max-w-md" style={{ borderRadius: 2 }} onClick={(e) => e.stopPropagation()} data-testid="upload-modal">
                <div className="flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2">
                            <UploadSimple size={16} weight="duotone" className="text-[#FF4400]" />
                            <span className="rp-overline">Upload your existing resume</span>
                        </div>
                        <h2 className="font-display font-extrabold text-2xl mt-2">Import from PDF or DOCX</h2>
                        <p className="text-xs text-[#4A4D57] mt-1">We'll auto-fill your info. You can edit anything before saving.</p>
                    </div>
                    <button onClick={onClose} className="text-[#4A4D57] hover:text-[#0D0D12]" data-testid="upload-close"><X size={18} weight="bold" /></button>
                </div>

                <label className="mt-5 block border-2 border-dashed border-[#0D0D12] p-8 text-center hover:bg-[#F4F5F7] cursor-pointer transition-colors" style={{ borderRadius: 2 }} data-testid="upload-dropzone">
                    <FileText size={28} weight="duotone" className="mx-auto text-[#FF4400]" />
                    <div className="font-display font-bold text-lg mt-2">Choose a file</div>
                    <div className="text-xs text-[#4A4D57] mt-1">PDF or DOCX · max 8 MB</div>
                    <input type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} disabled={uploading} data-testid="upload-input" />
                </label>

                {uploading && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-[#4A4D57]">
                        <div className="w-3 h-3 border-2 border-[#FF4400] border-t-transparent animate-spin rounded-full"></div>
                        Parsing your resume…
                    </div>
                )}
                {error && (
                    <div className="mt-4 p-3 bg-[#FEE2E2] border border-[#EF4444] text-xs text-[#7F1D1D]" style={{ borderRadius: 2 }}>{error}</div>
                )}
                <div className="mt-5 text-[11px] text-[#4A4D57] p-3 bg-[#F4F5F7]" style={{ borderRadius: 2 }}>
                    <CheckCircle weight="fill" size={12} className="inline mr-1 text-[#00A859]" />
                    100% rule-based parser — no AI, no data leaves our server.
                </div>
            </div>
        </div>
    );
}
