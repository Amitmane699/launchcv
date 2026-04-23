/**
 * Referral Rewards page — share your code, earn free days.
 */
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Gift, Copy, Users, Star, ArrowRight } from "@phosphor-icons/react";

export default function Referrals() {
  const [myCode, setMyCode] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [applyCode, setApplyCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [c, l] = await Promise.all([
        api.get("/referrals/my-code"),
        api.get("/referrals/leaderboard"),
      ]);
      setMyCode(c.data);
      setLeaderboard(l.data || []);
    } catch { /* silent */ }
  }

  function copyCode() {
    navigator.clipboard.writeText(myCode?.code || "");
    toast.success("Referral code copied!");
  }

  function copyLink() {
    const link = `${window.location.origin}/signup?ref=${myCode?.code}`;
    navigator.clipboard.writeText(link);
    toast.success("Referral link copied!");
  }

  async function useCode() {
    if (!applyCode.trim()) { toast.error("Enter a referral code"); return; }
    setApplying(true);
    try {
      const r = await api.post("/referrals/use", { referral_code: applyCode.trim() });
      setApplyResult(r.data);
      toast.success(r.data.message);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Invalid or already used code");
    } finally { setApplying(false); }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10">
      <div className="mb-8">
        <span className="rp-overline">Rewards</span>
        <h1 className="font-display font-extrabold text-4xl mt-2 tracking-tight">
          Refer &amp; Earn
        </h1>
        <p className="text-[#4A4D57] mt-1">
          Share your code. When a friend signs up and uses it, you both win — you get 6 free days added to your plan.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* My referral code */}
        <div className="border border-[#0D0D12] p-6" style={{ borderRadius: 2 }}>
          <div className="flex items-center gap-2 mb-4">
            <Gift size={20} weight="fill" className="text-[#FF4400]" />
            <h2 className="font-display font-bold text-xl">Your Referral Code</h2>
          </div>

          {myCode ? (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div
                  className="flex-1 px-4 py-3 bg-[#0D0D12] text-white text-xl font-mono font-bold tracking-widest text-center"
                  style={{ borderRadius: 2 }}
                >
                  {myCode.code}
                </div>
                <button onClick={copyCode} className="rp-btn-outline px-3 py-3">
                  <Copy size={18} />
                </button>
              </div>

              <button onClick={copyLink} className="rp-btn-orange w-full justify-center mb-4">
                <Copy size={14} /> Copy Referral Link
              </button>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#F4F5F7] p-4 text-center" style={{ borderRadius: 2 }}>
                  <div className="text-3xl font-extrabold text-[#FF4400]">{myCode.referrals_made}</div>
                  <div className="text-xs text-[#4A4D57] mt-1 uppercase tracking-wide">Referrals Made</div>
                </div>
                <div className="bg-[#F4F5F7] p-4 text-center" style={{ borderRadius: 2 }}>
                  <div className="text-3xl font-extrabold text-[#00A859]">{myCode.rewards_earned_days}</div>
                  <div className="text-xs text-[#4A4D57] mt-1 uppercase tracking-wide">Free Days Earned</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 text-sm" style={{ borderRadius: 2 }}>
                <strong>How it works:</strong> Share your code. When someone uses it while signing up,
                you earn <strong>6 free days</strong> added to your current plan. Combo Pro doubles the reward to 30 days.
              </div>
            </>
          ) : (
            <div className="text-[#4A4D57] text-sm">Loading your code…</div>
          )}
        </div>

        {/* Apply a code */}
        <div className="border border-[#E5E7EB] p-6" style={{ borderRadius: 2 }}>
          <div className="flex items-center gap-2 mb-4">
            <Star size={20} weight="fill" className="text-[#FFB300]" />
            <h2 className="font-display font-bold text-xl">Have a Code?</h2>
          </div>
          <p className="text-sm text-[#4A4D57] mb-4">
            Enter a friend's referral code to apply it to your account (one-time use).
          </p>

          {applyResult ? (
            <div className="p-4 bg-green-50 border border-green-200 text-sm text-green-800" style={{ borderRadius: 2 }}>
              <strong>✓ Applied!</strong> {applyResult.message}
            </div>
          ) : (
            <>
              <input
                className="rp-input w-full mb-3"
                placeholder="Enter referral code (e.g. AB12CD34)"
                value={applyCode}
                onChange={(e) => setApplyCode(e.target.value.toUpperCase())}
              />
              <button
                onClick={useCode}
                disabled={applying}
                className="rp-btn-orange w-full justify-center"
              >
                {applying ? "Applying…" : <><ArrowRight size={14} /> Apply Code</>}
              </button>
            </>
          )}

          <div className="mt-6">
            <h3 className="font-bold text-sm uppercase tracking-wide mb-3">Top Referrers</h3>
            {leaderboard.length === 0 ? (
              <p className="text-xs text-[#9CA3AF]">No referrals yet — be the first!</p>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((u, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#F4F5F7] flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </span>
                      <span>{u.name || "Anonymous"}</span>
                    </div>
                    <span className="font-mono text-[#FF4400] font-bold">{u.referrals_made} refs</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
