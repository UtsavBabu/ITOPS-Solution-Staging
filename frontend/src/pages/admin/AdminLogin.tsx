import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../api/supabaseClient";
import { RadarSweepBackground } from "../../components/PageBackgrounds";
import { Field } from "../../components/Field";
import { Button } from "../../components/Button";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw new Error(signInError.message);

      // Verified independently of the shared AuthContext (which updates
      // asynchronously off the auth-state-change event) so this decision
      // never races a stale render.
      const { data: isAdmin, error: adminCheckError } = await supabase.rpc("is_platform_admin");
      if (adminCheckError) throw new Error(adminCheckError.message);

      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("This account does not have platform admin access.");
      }

      navigate("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 text-white antialiased"
      style={{ fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" }}
    >
      <RadarSweepBackground tint="amber" />
      <div className="pointer-events-none absolute -left-32 top-24 h-96 w-96 rounded-full bg-amber-400/10 blur-[120px]" />
      <form onSubmit={handleSubmit} className="glass relative z-10 w-full max-w-sm rounded-2xl border-amber-400/20 p-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
          <span aria-hidden>←</span> ITOps Monitor
        </Link>
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 [animation:pulse-glow_1.6s_ease-in-out_infinite]" />
          Platform Admin Portal
        </span>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Admin sign in</h1>
        <p className="mb-6 text-sm text-white/50">Restricted access — platform admins only.</p>

        {error && (
          <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <div className="space-y-4">
          <Field label="Email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        <Button type="submit" full loading={isSubmitting} className="mt-6 !text-black [background:linear-gradient(100deg,#fbbf24,#f59e0b)] shadow-[0_8px_30px_-8px_rgba(251,191,36,0.5)]">
          {isSubmitting ? "Checking access…" : "Log in to Admin Portal"}
        </Button>

        <p className="mt-5 text-center text-sm text-white/50">
          Customer?{" "}
          <Link to="/login" className="font-medium text-amber-300 hover:text-amber-200">
            Log in here
          </Link>
        </p>
      </form>
    </div>
  );
}
