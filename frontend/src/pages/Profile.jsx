import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../api/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { Reveal, SpotlightCard } from "../components/Animated";
import { SkeletonRows } from "../components/Skeleton";
import { ErrorState } from "../components/EmptyState";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/ConfirmDialog";

async function listMfaFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return data.totp ?? [];
}

function EnrollMfaPanel({ onEnrolled }) {
  const toast = useToast();
  const [enrolling, setEnrolling] = useState(null); // { factorId, qrCode, secret }
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function startEnroll() {
    setStarting(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) throw new Error(error.message);
      setEnrolling({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to start enrollment");
    } finally {
      setStarting(false);
    }
  }

  async function verify(event) {
    event.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code from your authenticator app.");
      return;
    }
    setVerifying(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: enrolling.factorId });
      if (challengeError) throw new Error(challengeError.message);
      const { error: verifyError } = await supabase.auth.mfa.verify({ factorId: enrolling.factorId, challengeId: challenge.id, code });
      if (verifyError) throw new Error(verifyError.message);
      toast.success("Authenticator app added.");
      setEnrolling(null);
      setCode("");
      onEnrolled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Incorrect code — try again.");
    } finally {
      setVerifying(false);
    }
  }

  if (!enrolling) {
    return <button onClick={startEnroll} disabled={starting} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-neutral-200 disabled:opacity-50">
        {starting ? "Starting…" : "+ Set up authenticator app"}
      </button>;
  }
  return <div className="max-w-sm space-y-3 rounded-xl border border-white/10 light:border-slate-900/10 bg-black/20 light:bg-slate-900/[0.03] p-4">
      <p className="text-sm font-medium text-white light:text-slate-900">Scan with your authenticator app</p>
      <p className="text-xs text-white/45 light:text-slate-400">Google Authenticator, 1Password, Authy — any TOTP app works.</p>
      {/* eslint-disable-next-line */}
      <img src={enrolling.qrCode} alt="MFA setup QR code" className="mx-auto h-40 w-40 rounded-lg bg-white p-2" />
      <p className="break-all text-center text-[11px] text-white/35 light:text-slate-400">Can't scan? Enter manually: {enrolling.secret}</p>
      <form onSubmit={verify} className="space-y-2">
        <input autoFocus inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" className="w-full rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-3 py-2 text-center text-lg tracking-[0.4em] text-white light:text-slate-900 placeholder:text-white/20 focus:border-cyan-400/40 focus:outline-none" />
        {error && <p className="text-xs text-red-300">{error}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={verifying} className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black hover:bg-neutral-200 disabled:opacity-50">
            {verifying ? "Verifying…" : "Verify & enable"}
          </button>
          <button type="button" onClick={() => { setEnrolling(null); setCode(""); setError(null); }} className="text-xs text-white/50 light:text-slate-500 hover:text-white light:hover:text-slate-900">
            Cancel
          </button>
        </div>
      </form>
    </div>;
}

function SecuritySection() {
  const toast = useToast();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { data: factors, isLoading, isError, refetch } = useQuery({ queryKey: ["mfa-factors"], queryFn: listMfaFactors });
  const unenroll = useMutation({
    mutationFn: factorId => supabase.auth.mfa.unenroll({ factorId }).then(({ error }) => { if (error) throw new Error(error.message); }),
    onSuccess: () => { toast.success("Authenticator app removed."); refetch(); },
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to remove")
  });
  const verified = (factors ?? []).filter(f => f.status === "verified");

  async function handleRemove(factor) {
    const ok = await confirm({
      title: "Remove this authenticator app?",
      description: "You'll sign in with just your password until you set up a new one.",
      confirmLabel: "Remove",
      danger: true
    });
    if (ok) unenroll.mutate(factor.id);
  }

  return <SpotlightCard className="overflow-hidden" delay={0.05}>
      <div className="border-b border-white/10 light:border-slate-900/10 px-4 py-3">
        <h2 className="text-sm font-medium text-white light:text-slate-900">Two-factor authentication</h2>
        <p className="mt-0.5 text-xs text-white/40 light:text-slate-400">Real TOTP via Supabase Auth — once enabled, every sign-in (password or Google) asks for a 6-digit code from your authenticator app, not just here.</p>
      </div>
      <div className="p-4 space-y-4">
        {isError ? <ErrorState message="Couldn't load your authenticator apps." onRetry={refetch} /> : isLoading ? <SkeletonRows count={1} /> : verified.length > 0 ? <div className="space-y-2">
              {verified.map(f => <div key={f.id} className="flex items-center justify-between rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-300" aria-hidden>✓</span>
                    <div>
                      <p className="text-sm text-white light:text-slate-900">{f.friendly_name || "Authenticator app"}</p>
                      <p className="text-[11px] text-white/35 light:text-slate-400">Added {new Date(f.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button onClick={() => handleRemove(f)} disabled={unenroll.isPending} className="text-xs text-red-300 light:text-red-600 hover:underline disabled:opacity-50">Remove</button>
                </div>)}
            </div> : <p className="text-sm text-white/40 light:text-slate-400">No authenticator app added yet — your account is protected by password only.</p>}
        {verified.length === 0 && <EnrollMfaPanel onEnrolled={() => queryClient.invalidateQueries({ queryKey: ["mfa-factors"] })} />}
      </div>
    </SpotlightCard>;
}

function AccountSection() {
  const { user } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const updateName = useMutation({
    mutationFn: () => supabase.auth.updateUser({ data: { full_name: name } }).then(({ error }) => { if (error) throw new Error(error.message); }),
    onSuccess: () => toast.success("Name updated."),
    onError: err => toast.error(err instanceof Error ? err.message : "Failed to update name")
  });
  return <SpotlightCard className="p-5" delay={0}>
      <h2 className="text-sm font-medium text-white light:text-slate-900">Account</h2>
      <div className="mt-4 space-y-3 max-w-sm">
        <div>
          <p className="text-xs text-white/50 light:text-slate-500">Email</p>
          <p className="mt-1 text-sm text-white light:text-slate-900">{user?.email}</p>
        </div>
        <div>
          <p className="text-xs text-white/50 light:text-slate-500">Full name</p>
          <div className="mt-1 flex items-center gap-2">
            <input value={name} onChange={e => setName(e.target.value)} className="w-56 rounded-lg border border-white/15 light:border-slate-900/15 bg-black/40 light:bg-white px-3 py-1.5 text-sm text-white light:text-slate-900 focus:border-cyan-400/40 focus:outline-none" />
            {name !== (user?.name ?? "") && <button onClick={() => updateName.mutate()} disabled={updateName.isPending} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/70 light:text-slate-600 hover:text-white light:hover:text-slate-900 disabled:opacity-50">Save</button>}
          </div>
        </div>
      </div>
    </SpotlightCard>;
}

export default function Profile() {
  return <div className="space-y-6">
      <Reveal y={12}>
        <h1 className="text-2xl font-medium tracking-tight text-white light:text-slate-900">My Profile</h1>
        <p className="text-sm text-white/50 light:text-slate-500">Your account and sign-in security — nobody else can see or change this.</p>
      </Reveal>
      <AccountSection />
      <SecuritySection />
    </div>;
}
