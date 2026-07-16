import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useAuth, PENDING_INVITE_STORAGE_KEY } from "../context/AuthContext";
import { fetchInviteDetails, switchOrganizationViaInvite } from "../api/endpoints";
import { EnterpriseAuroraBackground } from "../components/PageBackgrounds";
import { Field } from "../components/Field";
import { BrandLoading, BrandMark } from "../components/BrandLogo";
import { Button } from "../components/Button";
import { SecurityLock } from "../components/SecurityLock";
import { GoogleButton } from "../components/GoogleButton";
import { CaptchaChallenge, HoneypotField, useCaptchaGuard } from "../components/CaptchaChallenge";
import { useConfirm } from "../components/ConfirmDialog";
import { useToast } from "../components/Toast";
const EASE = [0.16, 1, 0.3, 1];

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

const fontStyle = { fontFamily: "'Readex Pro', system-ui, -apple-system, sans-serif" };

function Shell({ children }) {
  return <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-4 py-12 text-white antialiased" style={fontStyle}>
      <EnterpriseAuroraBackground intensity="simplified" tint="blue" forceDark />
      <motion.div initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.5, ease: EASE }} className="glass relative z-10 w-full max-w-sm rounded-2xl p-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/50 transition-colors hover:text-white">
          <span aria-hidden>←</span> <BrandMark size={20} /> <span>ITOps Solution</span>
        </Link>
        <SecurityLock size={40} />
        {children}
      </motion.div>
    </div>;
}

const STATUS_MESSAGE = {
  not_found: "This invite link isn't valid. Ask whoever invited you to send a new one.",
  expired: "This invite link has expired. Ask whoever invited you to send a new one.",
  revoked: "This invite has been revoked. Ask whoever invited you if you still need access.",
  accepted: "This invite has already been used. If that wasn't you, contact whoever invited you."
};

function SwitchOrganizationPanel({ invite, token }) {
  const { user, organization } = useAuth();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState(null);
  const currentOrgName = organization?.name ?? "your current organization";

  async function handleSwitch() {
    const ok = await confirm({
      title: `Switch to ${invite.organizationName}?`,
      description: `You'll leave ${currentOrgName} and join ${invite.organizationName} as ${invite.roleName}. ${currentOrgName}'s data stays intact, just without you as a member — this can't be undone from here.`
    });
    if (!ok) return;
    setIsSwitching(true);
    setSwitchError(null);
    try {
      await switchOrganizationViaInvite(token);
      // Hard reload so every piece of cached state (React Query, the
      // AuthContext organization it was built from) reflects the new
      // organization from scratch, the same guarantee logout() gives.
      window.location.href = "/dashboard";
    } catch (err) {
      setSwitchError(err instanceof Error ? err.message : "Failed to switch organizations");
      setIsSwitching(false);
    }
  }

  return <Shell>
      <h1 className="mt-3 text-xl font-semibold tracking-tight text-white">Switch to {invite.organizationName}?</h1>
      <p className="mt-2 text-sm text-white/60">
        You're signed in as <strong className="text-white">{user.email}</strong>, currently in <strong className="text-white">{currentOrgName}</strong>. Joining a second organization at the same time isn't supported yet, so accepting this invite means switching: you'll leave {currentOrgName} and join <strong className="text-white">{invite.organizationName}</strong> as {invite.roleName}.
      </p>
      {switchError && <p className="mt-2 text-sm text-red-300">{switchError}</p>}
      <Button type="button" full loading={isSwitching} className="mt-5" onClick={handleSwitch}>
        {isSwitching ? "Switching…" : `Switch to ${invite.organizationName}`}
      </Button>
      <button type="button" onClick={() => navigate("/dashboard")} className="mt-3 w-full text-center text-sm text-white/50 hover:text-white">
        Stay in {currentOrgName}
      </button>
    </Shell>;
}

export default function InviteAccept() {
  const { token } = useParams();
  const { user, register, loginWithGoogle, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { honeypotRef, isLikelyBot } = useCaptchaGuard();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);

  const { data: invite, isLoading, isError } = useQuery({
    queryKey: ["invite-details", token],
    queryFn: () => fetchInviteDetails(token),
    retry: false
  });

  if (isLoading) return <BrandLoading />;

  if (isError || !invite || invite.status !== "pending") {
    const message = !invite || isError ? STATUS_MESSAGE.not_found : STATUS_MESSAGE[invite.status] ?? STATUS_MESSAGE.not_found;
    return <Shell>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-white">Invite unavailable</h1>
        <p className="mt-2 text-sm text-white/60">{message}</p>
        <Link to="/login" className="mt-5 inline-block text-sm font-medium text-cyan-300 hover:text-cyan-200">Go to login</Link>
      </Shell>;
  }

  // Someone is already signed in. If it's the invited email, offer a real
  // organization switch (see SwitchOrganizationPanel) — simultaneous
  // multi-org membership isn't built anywhere in this codebase (every
  // org-scoped RPC resolves "my organization" via `memberships ... limit 1`),
  // so switching, not joining a second org, is the real supported path.
  if (user) {
    const emailMatches = invite.email && user.email && invite.email.toLowerCase() === user.email.toLowerCase();
    if (emailMatches) return <SwitchOrganizationPanel invite={invite} token={token} />;
    return <Shell>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-white">You're already signed in</h1>
        <p className="mt-2 text-sm text-white/60">
          You're signed in as <strong className="text-white">{user.email}</strong>, but this invite is for <strong className="text-white">{invite.email}</strong>.
        </p>
        <p className="mt-2 text-sm text-white/60">
          Log out and sign in (or sign up) with that email to accept it.
        </p>
        <Button type="button" full className="mt-5" onClick={() => logout()}>Log out</Button>
      </Shell>;
  }

  if (confirmationSent) {
    return <Shell>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-white">Check your email</h1>
        <p className="mt-2 text-sm text-white/60">
          We sent a confirmation link to <strong className="text-white">{invite.email}</strong>. Click it, then log in to join {invite.organizationName}.
        </p>
        <Link to="/login" className="mt-4 inline-block text-sm font-medium text-cyan-300 hover:text-cyan-200">Go to login</Link>
      </Shell>;
  }

  async function handleGoogle() {
    // Read on the other side by loadProfile() in AuthContext.jsx once the
    // OAuth redirect completes and a real session exists — OAuth signups
    // never carry the options.data payload handle_new_user() reads an
    // invite_token from, so redemption happens just after, not at signup.
    sessionStorage.setItem(PENDING_INVITE_STORAGE_KEY, token);
    try {
      await loginWithGoogle();
    } catch (err) {
      sessionStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
      toast.error(err instanceof Error ? err.message : "Google sign-in isn't set up yet.");
    }
  }

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
      const { needsEmailConfirmation } = await register(invite.organizationName, name, invite.email, password, captchaToken, token);
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

  return <Shell>
      <div className="mb-6 mt-3">
        <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300">
          Team invite
        </span>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">Join {invite.organizationName}</h1>
        <p className="mt-1 text-sm text-white/50">You've been invited as {invite.roleName}. Create your account to accept.</p>
      </div>

      <AnimatePresence>
        {error && <motion.p initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: "auto", marginBottom: 16 }} exit={{ opacity: 0, height: 0, marginBottom: 0 }} className="overflow-hidden rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </motion.p>}
      </AnimatePresence>

      <GoogleButton onClick={handleGoogle} label="Continue with Google" />
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-xs text-white/35">or continue with email</span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <form onSubmit={handleSubmit}>
        <HoneypotField inputRef={honeypotRef} />
        <div className="space-y-4">
          <Field label="Your name" icon={<UserIcon />} required autoComplete="name" value={name} onChange={e => setName(e.target.value)} />
          <Field label="Email" type="email" icon={<MailIcon />} value={invite.email} readOnly hint="This invite is tied to this email address." />
          <Field label="Password" type="password" icon={<LockIcon />} required minLength={8} autoComplete="new-password" showStrength hint="At least 8 characters." value={password} onChange={e => setPassword(e.target.value)} />
          <CaptchaChallenge onChange={setCaptchaToken} />
        </div>

        <Button type="submit" full loading={isSubmitting} className="mt-6">
          {isSubmitting ? "Joining…" : `Join ${invite.organizationName}`}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-white/50">
        Already have an account with a different email?{" "}
        <Link to="/login" className="font-medium text-cyan-300 hover:text-cyan-200">Log in</Link>
      </p>
    </Shell>;
}
