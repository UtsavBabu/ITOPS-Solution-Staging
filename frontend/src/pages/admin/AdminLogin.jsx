import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { supabase } from "../../api/supabaseClient";
import { EnterpriseAuroraBackground } from "../../components/PageBackgrounds";
import { Field } from "../../components/Field";
import { BrandMark } from "../../components/BrandLogo";
import { Button } from "../../components/Button";
import { SecurityLock } from "../../components/SecurityLock";
import { CaptchaChallenge, HoneypotField, useCaptchaGuard } from "../../components/CaptchaChallenge";
const EASE = [0.16, 1, 0.3, 1];
export default function AdminLogin() {
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
      const {
        error: signInError
      } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: { captchaToken }
      });
      if (signInError) throw new Error(signInError.message);

      // Verified independently of the shared AuthContext (which updates
      // asynchronously off the auth-state-change event) so this decision
      // never races a stale render.
      const {
        data: isAdmin,
        error: adminCheckError
      } = await supabase.rpc("is_platform_admin");
      if (adminCheckError) throw new Error(adminCheckError.message);
      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("This account does not have platform admin access.");
      }
      setSuccess(true);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }
  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-10 text-white antialiased" style={{
    fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif"
  }}>
      <EnterpriseAuroraBackground intensity="simplified" tint="amber" forceDark />
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
    }} className="glass relative z-10 w-full max-w-sm rounded-2xl border-amber-400/20 p-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
          <span aria-hidden>←</span> <BrandMark size={20} /> <span>ITOps Solution</span>
        </Link>
        <SecurityLock locked={success} size={44} />
        <div className="mt-3 flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
            <span className="relative grid h-1.5 w-1.5 place-items-center">
              <span className="absolute h-1.5 w-1.5 rounded-full bg-amber-400/70 animate-sonar" />
              <span className="relative h-1.5 w-1.5 rounded-full bg-amber-400" />
            </span>
            Platform Admin Portal
          </span>
        </div>
        <h1 className="mb-1 mt-3 text-center text-2xl font-semibold tracking-tight text-white">Admin sign in</h1>
        <p className="mb-6 text-center text-sm text-white/50">Restricted access — platform admins only.</p>

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

        <HoneypotField inputRef={honeypotRef} />
        <div className="space-y-4">
          <Field label="Email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          <div>
            <Field label="Password" type="password" required autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
            <div className="mt-1.5 text-right">
              <Link to="/forgot-password" className="text-xs text-white/45 hover:text-white">
                Forgot password?
              </Link>
            </div>
          </div>
          <CaptchaChallenge onChange={setCaptchaToken} />
        </div>

        <Button type="submit" full loading={isSubmitting} success={success} className="mt-6 !text-black ![background:linear-gradient(100deg,#fbbf24,#f59e0b)] shadow-[0_8px_30px_-8px_rgba(251,191,36,0.5)]">
          {isSubmitting ? "Checking access…" : success ? "Access granted" : "Log in to Admin Portal"}
        </Button>

        <p className="mt-5 text-center text-sm text-white/50">
          Customer?{" "}
          <Link to="/login" className="font-medium text-amber-300 hover:text-amber-200">
            Log in here
          </Link>
        </p>
      </motion.form>
    </div>;
}
