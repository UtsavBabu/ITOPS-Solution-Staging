import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { EnterpriseAuroraBackground } from "../components/PageBackgrounds";
import { Field } from "../components/Field";
import { BrandMark } from "../components/BrandLogo";
import { Button } from "../components/Button";
import { SecurityLock } from "../components/SecurityLock";
import { CaptchaChallenge, HoneypotField, useCaptchaGuard } from "../components/CaptchaChallenge";

const EASE = [0.16, 1, 0.3, 1];

function MailIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const { honeypotRef, isLikelyBot } = useCaptchaGuard();
  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    if (isLikelyBot()) {
      // Don't tip off a bot that it was caught — just look successful.
      setSent(true);
      return;
    }
    if (!captchaToken) {
      setError("Please complete the security check.");
      return;
    }
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email, captchaToken);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send the reset link");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 text-white antialiased" style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}>
      <EnterpriseAuroraBackground intensity="simplified" tint="cyan" forceDark />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE }}
        className="glass relative z-10 w-full max-w-sm rounded-2xl p-8"
      >
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
          <span aria-hidden>←</span> <BrandMark size={20} /> <span>ITOps Solution</span>
        </Link>

        {sent ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="text-center">
            <SecurityLock locked size={44} />
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-white">Check your email</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              If an account exists for <strong className="text-white">{email}</strong>, a password reset link is on its way.
            </p>
            <Link to="/login" className="mt-5 inline-block text-sm font-medium text-cyan-300 hover:text-cyan-200">
              Back to sign in
            </Link>
          </motion.div>
        ) : (
          <>
            <SecurityLock size={44} />
            <h1 className="mb-1 mt-3 text-center text-2xl font-semibold tracking-tight text-white">Reset your password</h1>
            <p className="mb-6 text-center text-sm text-white/50">Enter your email and we'll send you a reset link.</p>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                  animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                  exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                  className="overflow-hidden rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="space-y-4">
              <HoneypotField inputRef={honeypotRef} />
              <Field label="Work email" type="email" icon={<MailIcon />} required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <CaptchaChallenge onChange={setCaptchaToken} />
              <Button type="submit" full loading={isSubmitting}>
                {isSubmitting ? "Sending…" : "Send reset link"}
              </Button>
            </form>

            <p className="mt-5 text-center text-sm text-white/50">
              Remembered it?{" "}
              <Link to="/login" className="font-medium text-cyan-300 hover:text-cyan-200">
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
