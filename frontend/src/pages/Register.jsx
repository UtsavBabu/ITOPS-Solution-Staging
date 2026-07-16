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
function BuildingIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="3" width="16" height="18" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 7h.01M15 7h.01M9 11h.01M15 11h.01M9 15h.01M15 15h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>;
}
function UserIcon() {
  return <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" stroke="currentColor" strokeWidth="1.8" />
    </svg>;
}
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
export default function Register() {
  const {
    register,
    loginWithGoogle
  } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { honeypotRef, isLikelyBot } = useCaptchaGuard();
  const [organizationName, setOrganizationName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      const {
        needsEmailConfirmation
      } = await register(organizationName, name, email, password, captchaToken);
      if (needsEmailConfirmation) {
        setConfirmationSent(true);
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
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
  const fontStyle = {
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  };
  if (confirmationSent) {
    return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 text-white antialiased" style={fontStyle}>
        <EnterpriseAuroraBackground intensity="simplified" tint="blue" forceDark />
        <motion.div initial={{
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
      }} className="glass relative z-10 w-full max-w-sm rounded-2xl p-8 text-center">
          <motion.div initial={{
          scale: 0.6,
          opacity: 0
        }} animate={{
          scale: 1,
          opacity: 1
        }} transition={{
          duration: 0.4,
          delay: 0.15,
          ease: EASE
        }} className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-emerald-400/10 light:bg-emerald-100 text-emerald-300 light:text-emerald-700">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </motion.div>
          <h1 className="mb-2 text-xl font-semibold tracking-tight text-white">Check your email</h1>
          <p className="text-sm text-white/60">
            We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it, then log in below.
          </p>
          <Link to="/login" className="mt-4 inline-block text-sm font-medium text-cyan-300 hover:text-cyan-200">
            Go to login
          </Link>
        </motion.div>
      </div>;
  }
  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12 text-white antialiased" style={fontStyle}>
      <EnterpriseAuroraBackground intensity="simplified" tint="blue" forceDark />

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
        <SecurityLock size={40} />
        <div className="mb-6 mt-3">
          <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            Free Starter plan · Trial
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Create your organization</h1>
          <p className="mt-1 text-sm text-white/50">Start monitoring your infrastructure in minutes.</p>
        </div>

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

        <GoogleButton onClick={handleGoogle} label="Sign up with Google" />
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-white/10" />
          <span className="text-xs text-white/35">or sign up with email</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <HoneypotField inputRef={honeypotRef} />
        <div className="space-y-4">
          <Field label="Organization name" icon={<BuildingIcon />} required value={organizationName} onChange={e => setOrganizationName(e.target.value)} />
          <Field label="Your name" icon={<UserIcon />} required autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
          <Field label="Work email" type="email" icon={<MailIcon />} required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          <Field label="Password" type="password" icon={<LockIcon />} required minLength={8} autoComplete="new-password" showStrength hint="At least 8 characters." value={password} onChange={e => setPassword(e.target.value)} />
          <CaptchaChallenge onChange={setCaptchaToken} />
        </div>

        <Button type="submit" full loading={isSubmitting} className="mt-6">
          {isSubmitting ? "Creating…" : "Create account"}
        </Button>

        <p className="mt-5 text-center text-sm text-white/50">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-cyan-300 hover:text-cyan-200">
            Log in
          </Link>
        </p>
      </motion.form>
    </div>;
}
