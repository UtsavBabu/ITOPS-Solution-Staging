import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { EnterpriseAuroraBackground } from "../components/PageBackgrounds";
import { Field } from "../components/Field";
import { BrandMark } from "../components/BrandLogo";
import { Button } from "../components/Button";
import { SecurityLock } from "../components/SecurityLock";
import { GoogleButton } from "../components/GoogleButton";
import { CaptchaChallenge, HoneypotField, useCaptchaGuard } from "../components/CaptchaChallenge";
import { useToast } from "../components/Toast";
const EASE = [0.16, 1, 0.3, 1];
function MailIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" />
    </svg>;
}
function LockIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.8" />
    </svg>;
}
export default function Login() {
  const {
    login,
    loginWithGoogle
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { honeypotRef, isLikelyBot } = useCaptchaGuard();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    if (isLikelyBot()) {
      setError("Couldn't verify this submission. Please try again.");
      return;
    }
    if (!captchaToken) {
      setError("Please complete the security check.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { mfaPending } = await login(email, password, captchaToken);
      // mfaPending: App.jsx is already showing the two-factor prompt full-
      // screen regardless of route — navigating now would just leave the
      // address bar reading /dashboard under it. resolveMfaChallenge()
      // handles landing them in the app for real once they verify.
      if (!mfaPending) {
        setSuccess(true);
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }
  async function handleGoogle() {
    try {
      await loginWithGoogle();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in isn't set up yet.");
      throw err;
    }
  }
  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 text-white antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <EnterpriseAuroraBackground intensity="simplified" tint="cyan" forceDark />

      <motion.form onSubmit={handleSubmit} initial={{
      opacity: 0,
      y: 16,
      scale: 0.98
    }} animate={{
      opacity: 1,
      y: 0,
      scale: 1
    }} transition={{
      duration: 0.5,
      ease: EASE
    }} className="glass relative z-10 w-full max-w-sm rounded-2xl p-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
          <span aria-hidden>←</span> <BrandMark size={20} /> <span>ITOps Solution</span>
        </Link>
        <SecurityLock locked={success} size={44} />
        <h1 className="mb-1 mt-3 text-center text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
        <p className="mb-6 text-center text-sm text-white/50">Sign in to your operations dashboard.</p>

        <AnimatePresence>
          {error && <motion.p initial={{
          opacity: 0,
          height: 0,
          marginBottom: 0
        }} animate={{
          opacity: 1,
          height: "auto",
          marginBottom: 16
        }} exit={{
          opacity: 0,
          height: 0,
          marginBottom: 0
        }} className="overflow-hidden rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">
              {error}
            </motion.p>}
        </AnimatePresence>

        <GoogleButton onClick={handleGoogle} />
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/35">or sign in with email</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <HoneypotField inputRef={honeypotRef} />
        <div className="space-y-4">
          <Field label="Work email" type="email" icon={<MailIcon />} required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          <div>
            <Field label="Password" type="password" icon={<LockIcon />} required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
            <div className="mt-1.5 text-right">
              <Link to="/forgot-password" className="text-xs text-white/45 hover:text-white">
                Forgot password?
              </Link>
            </div>
          </div>
          <CaptchaChallenge onChange={setCaptchaToken} />
        </div>

        <Button type="submit" full loading={isSubmitting} success={success} className="mt-6">
          {isSubmitting ? "Signing in…" : success ? "Success" : "Sign in"}
        </Button>

        <p className="mt-5 text-center text-sm text-white/50">
          No account?{" "}
          <Link to="/pricing" className="font-medium text-cyan-300 hover:text-cyan-200">
            View packages
          </Link>
        </p>
      </motion.form>
    </div>;
}
