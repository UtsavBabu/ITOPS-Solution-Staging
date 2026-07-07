import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { RadarSweepBackground } from "../components/PageBackgrounds";
import { Field } from "../components/Field";
import { Button } from "../components/Button";

function MailIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 118 0v3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      setSuccess(true);
      navigate("/dashboard");
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
      <RadarSweepBackground tint="cyan" />
      <div className="pointer-events-none absolute -left-32 top-20 h-96 w-96 rounded-full bg-cyan-400/10 blur-[120px]" />

      <form onSubmit={handleSubmit} className="glass relative z-10 w-full max-w-sm rounded-2xl p-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
          <span aria-hidden>←</span> ITOps Monitor
        </Link>
        <h1 className="mb-1 text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
        <p className="mb-6 text-sm text-white/50">Sign in to your operations dashboard.</p>

        {error && (
          <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <div className="space-y-4">
          <Field
            label="Work email"
            type="email"
            icon={<MailIcon />}
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Field
            label="Password"
            type="password"
            icon={<LockIcon />}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
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
      </form>
    </div>
  );
}
