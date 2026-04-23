/**
 * Job Alerts — subscribe to matching job notifications.
 */
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { BellRinging, Plus, Trash, Eye, ToggleLeft, ToggleRight } from "@phosphor-icons/react";

const FREQUENCIES = [
  { id: "instant", label: "Instant", desc: "As soon as a matching job is posted" },
  { id: "daily", label: "Daily Digest", desc: "Once a day, morning summary" },
  { id: "weekly", label: "Weekly Summary", desc: "Every Monday, weekly wrap-up" },
];

const CATEGORIES = [
  "Technology", "Finance", "Marketing", "Sales", "Design", "Operations",
  "HR", "Legal", "Healthcare", "Education", "Engineering", "Other",
];

export default function JobAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [previews, setPreviews] = useState({});
  const [form, setForm] = useState({
    keywords: "", location: "", category: "", employment_type: "", frequency: "daily",
  });

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const r = await api.get("/job-alerts");
      setAlerts(r.data || []);
    } catch { /* silent */ }
  }

  async function create() {
    if (!form.keywords.trim() && !form.category && !form.location.trim()) {
      toast.error("Enter at least one filter (keyword, location or category)");
      return;
    }
    try {
      await api.post("/job-alerts", form);
      toast.success("Alert created!");
      setShowAdd(false);
      setForm({ keywords: "", location: "", category: "", employment_type: "", frequency: "daily" });
      load();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Could not create alert";
      toast.error(typeof msg === "string" ? msg : "Max 5 alerts allowed");
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this alert?")) return;
    await api.delete(`/job-alerts/${id}`);
    load();
    toast.success("Alert deleted");
  }

  async function toggle(id) {
    try {
      const r = await api.put(`/job-alerts/${id}/toggle`);
      setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, active: r.data.active } : a));
    } catch { toast.error("Could not toggle"); }
  }

  async function preview(id) {
    try {
      const r = await api.get(`/job-alerts/preview/${id}`);
      setPreviews((p) => ({ ...p, [id]: r.data }));
    } catch { toast.error("Could not preview"); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <span className="rp-overline">Notifications</span>
          <h1 className="font-display font-extrabold text-4xl mt-2 tracking-tight">Job Alerts</h1>
          <p className="text-[#4A4D57] mt-1">Get notified when jobs matching your preferences are posted.</p>
        </div>
        <button onClick={() => setShowAdd((s) => !s)} className="rp-btn-orange">
          <Plus size={14} weight="bold" /> New Alert
        </button>
      </div>

      {/* Create form */}
      {showAdd && (
        <div className="border border-[#0D0D12] p-6 mb-8 bg-[#F4F5F7]" style={{ borderRadius: 2 }}>
          <h2 className="font-display font-bold text-xl mb-4">Create Alert</h2>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">Keywords</label>
              <input
                className="rp-input w-full"
                placeholder="e.g. React developer"
                value={form.keywords}
                onChange={(e) => setForm((f) => ({ ...f, keywords: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">Location</label>
              <input
                className="rp-input w-full"
                placeholder="e.g. Mumbai, Remote"
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">Category</label>
              <select
                className="rp-input w-full"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-1">Employment Type</label>
              <select
                className="rp-input w-full"
                value={form.employment_type}
                onChange={(e) => setForm((f) => ({ ...f, employment_type: e.target.value }))}
              >
                <option value="">Any</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold uppercase tracking-[0.12em] mb-2">Notification Frequency</label>
            <div className="flex gap-3 flex-wrap">
              {FREQUENCIES.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setForm((prev) => ({ ...prev, frequency: f.id }))}
                  className={`px-4 py-2 border text-sm transition-all ${form.frequency === f.id
                    ? "border-[#FF4400] bg-orange-50 font-semibold"
                    : "border-[#E5E7EB] hover:border-[#0D0D12]"
                    }`}
                  style={{ borderRadius: 2 }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={create} className="rp-btn-orange">Create Alert</button>
            <button onClick={() => setShowAdd(false)} className="rp-btn-outline">Cancel</button>
          </div>
        </div>
      )}

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="border border-dashed border-[#E5E7EB] py-16 text-center text-[#4A4D57]" style={{ borderRadius: 2 }}>
          <BellRinging size={40} className="mx-auto opacity-30 mb-3" />
          <p className="font-semibold">No alerts yet</p>
          <p className="text-sm mt-1">Create your first alert to start receiving job notifications.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.id} className={`border p-5 transition-all ${alert.active ? "border-[#0D0D12]" : "border-[#E5E7EB] opacity-60"}`} style={{ borderRadius: 2 }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {alert.keywords && (
                      <span className="px-2 py-0.5 bg-[#0D0D12] text-white text-xs font-mono">{alert.keywords}</span>
                    )}
                    {alert.location && (
                      <span className="px-2 py-0.5 border border-[#E5E7EB] text-xs">{alert.location}</span>
                    )}
                    {alert.category && (
                      <span className="px-2 py-0.5 border border-[#E5E7EB] text-xs">{alert.category}</span>
                    )}
                    {alert.employment_type && (
                      <span className="px-2 py-0.5 border border-[#E5E7EB] text-xs">{alert.employment_type}</span>
                    )}
                    <span className="px-2 py-0.5 bg-[#FF4400] text-white text-xs uppercase tracking-wide">
                      {alert.frequency}
                    </span>
                  </div>
                  {alert.last_sent_at && (
                    <p className="text-xs text-[#6B7280] mt-2">
                      Last sent: {new Date(alert.last_sent_at).toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => preview(alert.id)}
                    className="rp-btn-outline text-xs px-2 py-1"
                    title="Preview matching jobs"
                  >
                    <Eye size={13} /> Preview
                  </button>
                  <button
                    onClick={() => toggle(alert.id)}
                    title={alert.active ? "Pause alert" : "Resume alert"}
                    className="text-[#0D0D12]"
                  >
                    {alert.active
                      ? <ToggleRight size={26} weight="fill" className="text-[#00A859]" />
                      : <ToggleLeft size={26} className="text-[#9CA3AF]" />
                    }
                  </button>
                  <button onClick={() => remove(alert.id)} className="text-[#EF4444]">
                    <Trash size={16} />
                  </button>
                </div>
              </div>

              {previews[alert.id] && (
                <div className="mt-4 pt-4 border-t border-[#E5E7EB]">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] mb-2 text-[#4A4D57]">
                    Preview: {previews[alert.id].matches} matching jobs right now
                  </p>
                  <div className="space-y-1">
                    {previews[alert.id].sample.slice(0, 5).map((j) => (
                      <div key={j.id} className="text-sm flex items-center gap-2">
                        <span className="font-medium">{j.title}</span>
                        <span className="text-[#4A4D57]">@ {j.company}</span>
                        <span className="text-xs text-[#9CA3AF]">{j.location}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[#9CA3AF] mt-6">
        Up to 5 alerts. Notifications are sent to your registered email address.
        Instant alerts require Job Seeker Pro plan or higher.
      </p>
    </div>
  );
}
