import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { EnterpriseAuroraBackground } from "../components/PageBackgrounds";
import { BrandMark } from "../components/BrandLogo";
import { Button } from "../components/Button";
import { SecurityLock } from "../components/SecurityLock";
const EASE = [0.16, 1, 0.3, 1];
const fontStyle = { fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" };

// Shown full-screen, blocking every route, whenever AuthContext reports a
// verified password/OAuth session that hasn't cleared its second factor yet
// — the actual enforcement point for MFA, not just the enrollment UI on
// Profile.jsx. There is deliberately no "skip" — only verify or sign out.
export default function MfaChallenge() {
  const { cancelMfaChallenge, resolveMfaChallenge } = useAuth();
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setIsSubmitting(true);
    try {
      await resolveMfaChallenge(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect code — try again.");
      setIsSubmitting(false);
    }
  }

  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12 text-white antialiased" style={fontStyle}>
      <EnterpriseAuroraBackground intensity="simplified" tint="blue" forceDark />
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: EASE }} className="glass relative z-10 w-full max-w-sm rounded-2xl p-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
          <span aria-hidden>←</span> <BrandMark size={20} /> <span>ITOps Solution</span>
        </Link>
        <SecurityLock size={40} />
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-white">Two-factor verification</h1>
        <p className="mt-2 text-sm text-white/60">
          Your password checked out. Enter the 6-digit code from your authenticator app to finish signing in.
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <input
            autoFocus
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full rounded-xl border border-white/12 bg-black/40 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder:text-white/20 focus:border-cyan-400/50 focus:outline-none focus:shadow-[0_0_0_4px_rgba(34,211,238,0.14)]"
          />
          {error && <p className="text-sm text-red-300">{error}</p>}
          <Button type="submit" full loading={isSubmitting}>{isSubmitting ? "Verifying…" : "Verify"}</Button>
        </form>
        <button type="button" onClick={cancelMfaChallenge} className="mt-5 w-full text-center text-sm text-white/50 hover:text-white">
          Not you, or lost your device? Sign out
        </button>
      </motion.div>
    </div>;
}
