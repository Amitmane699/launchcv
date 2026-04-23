/**
 * PayUmoney real checkout — posts a form directly to PayU's endpoint.
 * On success/failure, PayU redirects to /payment-success or /payment-failure.
 */
import { useSearchParams, useNavigate, Link, useLocation } from "react-router-dom";
import { api } from "../lib/api";
import { useAuthStore } from "../store/authStore";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Check, X, CreditCard, ShieldCheck, Spinner, ArrowCounterClockwise } from "@phosphor-icons/react";

// ─────────────────────────────────────────────────────────────────────────────
// CheckoutRedirect — creates the PayU order then auto-submits the hidden form
// ─────────────────────────────────────────────────────────────────────────────
export function PaymentMock() {
    const [params] = useSearchParams();
    const nav       = useNavigate();
    const formRef   = useRef(null);

    const [payuData, setPayuData]  = useState(null);
    const [error,    setError]     = useState(null);
    const [loading,  setLoading]   = useState(true);

    const productType = params.get("type");
    const jobId       = params.get("job_id") || undefined;

    useEffect(() => {
        if (!productType) { nav("/pricing"); return; }
        api.post("/payments/create-order", { product_type: productType, job_id: jobId })
            .then((r) => {
                setPayuData(r.data);
                setLoading(false);
            })
            .catch((err) => {
                const msg = err?.response?.data?.detail || "Could not initiate payment";
                setError(typeof msg === "string" ? msg : "Could not initiate payment");
                setLoading(false);
            });
    }, []);

    // Auto-submit form once PayU data is ready
    useEffect(() => {
        if (payuData && formRef.current) {
            // Small delay so the page renders the "Redirecting..." state
            const t = setTimeout(() => formRef.current?.submit(), 800);
            return () => clearTimeout(t);
        }
    }, [payuData]);

    if (loading) return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-[#4A4D57]">
            <Spinner size={32} className="animate-spin text-[#FF4400]" />
            <p className="text-sm font-medium">Preparing secure checkout…</p>
        </div>
    );

    if (error) return (
        <div className="max-w-md mx-auto px-4 py-16 text-center">
            <div className="w-16 h-16 bg-[#EF4444] text-white grid place-items-center mx-auto" style={{ borderRadius: 2 }}>
                <X weight="bold" size={32} />
            </div>
            <h2 className="font-display font-extrabold text-2xl mt-6">Could not start payment</h2>
            <p className="text-[#4A4D57] mt-2 text-sm">{error}</p>
            <div className="flex gap-2 mt-8 justify-center">
                <Link to="/pricing" className="rp-btn-outline">Back to Pricing</Link>
            </div>
        </div>
    );

    const p = payuData.payu_params;

    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-[#4A4D57]">
            <Spinner size={32} className="animate-spin text-[#FF4400]" />
            <div className="text-center">
                <p className="font-semibold text-[#0D0D12]">Redirecting to PayUmoney…</p>
                <p className="text-xs mt-1">
                    Amount: <strong>₹{payuData.amount_inr}</strong> ·
                    Txn: <span className="font-mono">{payuData.txn_id}</span>
                </p>
                <p className="text-xs mt-2 text-[#9CA3AF]">
                    <ShieldCheck size={12} className="inline mr-0.5 text-[#00A859]" />
                    Secured by PayUmoney
                </p>
            </div>

            {/* Hidden auto-submit form */}
            <form ref={formRef} method="POST" action={payuData.payu_url} style={{ display: "none" }}>
                {Object.entries(p).map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                ))}
            </form>

            {/* Manual fallback */}
            <button
                onClick={() => formRef.current?.submit()}
                className="rp-btn-orange mt-4"
            >
                <CreditCard size={15} /> Click here if not redirected
            </button>
        </div>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// PaymentSuccess — PayU redirects here with form-POST params after success
// ─────────────────────────────────────────────────────────────────────────────
export function PaymentSuccess() {
    const nav          = useNavigate();
    const location     = useLocation();
    const { user, setUser } = useAuthStore();
    const [status, setStatus]   = useState("verifying"); // verifying | done | error
    const [txnId,  setTxnId]    = useState("");
    const [amount, setAmount]   = useState("");

    useEffect(() => {
        // PayU sends a form POST to surl — params arrive as URL query string
        // on redirect (some integrations) or in the POST body.
        // We read from the URL search params here; the webhook handles server-side.
        const sp = new URLSearchParams(location.search);
        const txn    = sp.get("txnid")  || sp.get("txn") || "";
        const amt    = sp.get("amount") || "";
        const mihpay = sp.get("mihpayid") || "";
        const hash   = sp.get("hash") || "";

        setTxnId(txn);
        setAmount(amt);

        if (!txn) { setStatus("error"); return; }

        // Notify backend (webhook may have already processed it)
        const payu_params = Object.fromEntries(sp.entries());
        api.post("/payments/payu-success", {
            txn_id: txn,
            payu_payment_id: mihpay || undefined,
            payu_params: Object.keys(payu_params).length > 2 ? payu_params : undefined,
        }).then(() => {
            // Refresh user so plan shows updated
            api.get("/auth/me").then((r) => {
                if (r.data) useAuthStore.getState().setUser(r.data);
            }).catch(() => {});
            setStatus("done");
        }).catch(() => {
            // Webhook may have processed it — poll verify
            api.get(`/payments/verify/${txn}`)
                .then((r) => setStatus(r.data?.status === "paid" ? "done" : "error"))
                .catch(() => setStatus("error"));
        });
    }, []);

    if (status === "verifying") return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-[#4A4D57]">
            <Spinner size={28} className="animate-spin text-[#FF4400]" />
            <p className="text-sm">Confirming your payment…</p>
        </div>
    );

    if (status === "error") return (
        <div className="max-w-md mx-auto px-4 py-16 text-center" data-testid="payment-success">
            <div className="w-16 h-16 bg-[#FFB300] text-white grid place-items-center mx-auto" style={{ borderRadius: 2 }}>
                <ArrowCounterClockwise weight="bold" size={32} />
            </div>
            <h1 className="font-display font-extrabold text-2xl mt-6">Almost there!</h1>
            <p className="text-[#4A4D57] mt-2 text-sm">
                Your payment was received but confirmation is still processing.
                Your plan will be updated within a few minutes.
            </p>
            <div className="flex gap-2 mt-8 justify-center">
                <Link to="/dashboard" className="rp-btn-orange">Go to Dashboard</Link>
            </div>
        </div>
    );

    return (
        <div className="max-w-md mx-auto px-4 py-16 text-center" data-testid="payment-success">
            <div className="w-20 h-20 bg-[#00A859] text-white grid place-items-center mx-auto" style={{ borderRadius: 2 }}>
                <Check weight="bold" size={40} />
            </div>
            <h1 className="font-display font-extrabold text-3xl mt-6">Payment successful!</h1>
            {txnId && (
                <p className="text-[#4A4D57] mt-2 text-sm">
                    Txn: <span className="font-mono">{txnId}</span>
                </p>
            )}
            {amount && <p className="text-[#4A4D57] mt-1">Amount: <strong>₹{amount}</strong></p>}
            <p className="text-sm mt-3 text-[#4A4D57]">Your plan has been activated. Enjoy LaunchCV!</p>
            <div className="flex gap-2 mt-8 justify-center">
                <Link to="/dashboard" className="rp-btn-orange">Go to Dashboard</Link>
                <Link to="/builder/new" className="rp-btn-outline">Build Resume</Link>
            </div>
        </div>
    );
}


// ─────────────────────────────────────────────────────────────────────────────
// PaymentFailure
// ─────────────────────────────────────────────────────────────────────────────
export function PaymentFailure() {
    const location = useLocation();
    const sp       = new URLSearchParams(location.search);
    const txn      = sp.get("txnid") || sp.get("txn") || "";

    useEffect(() => {
        if (txn) {
            api.post("/payments/payu-failure", { txn_id: txn }).catch(() => {});
        }
    }, []);

    return (
        <div className="max-w-md mx-auto px-4 py-16 text-center" data-testid="payment-failure">
            <div className="w-20 h-20 bg-[#EF4444] text-white grid place-items-center mx-auto" style={{ borderRadius: 2 }}>
                <X weight="bold" size={40} />
            </div>
            <h1 className="font-display font-extrabold text-3xl mt-6">Payment failed</h1>
            <p className="text-[#4A4D57] mt-2">Nothing was charged. You can retry anytime.</p>
            {txn && (
                <p className="text-xs text-[#9CA3AF] mt-2 font-mono">{txn}</p>
            )}
            <div className="flex gap-2 mt-8 justify-center">
                <Link to="/pricing" className="rp-btn-outline">Back to Pricing</Link>
                <Link to="/dashboard" className="rp-btn-orange">Dashboard</Link>
            </div>
        </div>
    );
}
