import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../api/supabaseClient";
import { EnterpriseAuroraBackground } from "../components/PageBackgrounds";
import { Field } from "../components/Field";
import { BrandMark } from "../components/BrandLogo";
import { Button } from "../components/Button";
import { SecurityLock } from "../components/SecurityLock";

const EASE = [0.16, 1, 0.3, 1];

function LockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

/**
 * Landing page for the link in a "reset your password" email. Supabase's
 * client auto-detects the recovery token in the URL fragment and opens a
 * session (detectSessionInUrl, on by default) — this page just waits for
 * that PASSWORD_RECOVERY event before showing the form.
 */
export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    // If the tab already processed the recovery link before this listener
    // attached, a live session is still proof enough to show the form.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await updatePassword(password);
      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update your password");
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

        {!ready ? (
          <div className="py-6 text-center">
            <SecurityLock size={44} />
            <p className="mt-4 text-sm text-white/50">Verifying your reset link…</p>
          </div>
        ) : success ? (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="text-center">
            <SecurityLock locked size={44} />
            <h1 className="mt-3 text-xl font-semibold tracking-tight text-white">Password updated</h1>
            <p className="mt-2 text-sm leading-relaxed text-white/60">Taking you to your dashboard…</p>
          </motion.div>
        ) : (
          <>
            <SecurityLock size={44} />
            <h1 className="mb-1 mt-3 text-center text-2xl font-semibold tracking-tight text-white">Choose a new password</h1>
            <p className="mb-6 text-center text-sm text-white/50">Make it something you haven't used before.</p>

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
              <Field
                label="New password"
                type="password"
                icon={<LockIcon />}
                required
                minLength={8}
                autoComplete="new-password"
                showStrength
                hint="At least 8 characters."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" full loading={isSubmitting}>
                {isSubmitting ? "Updating…" : "Update password"}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
