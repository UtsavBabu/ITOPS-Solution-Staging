import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../api/supabaseClient";
const AuthContext = createContext(undefined);
// Stashed by InviteAccept.jsx right before a Google sign-in/sign-up redirect
// — OAuth signups never carry the options.data payload handle_new_user()
// reads an invite_token from, so that path can't redeem the invite at
// signup time the way email/password does. Redeeming it here instead,
// right after a real session exists, covers both a brand-new OAuth signup
// (leaves the default org handle_new_user() just created) and an existing
// account signing in with Google to accept an invite (leaves its real org).
export const PENDING_INVITE_STORAGE_KEY = "pending_invite_token";
async function loadProfile() {
  const {
    data: {
      session
    }
  } = await supabase.auth.getSession();
  if (!session) return null;

  // Stop here, before redeeming an invite or touching org membership, if
  // this session hasn't cleared its second factor yet — none of that should
  // happen on a not-yet-fully-authenticated session.
  if (await needsMfaChallenge()) {
    return { mfaPending: true };
  }

  const pendingInviteToken = sessionStorage.getItem(PENDING_INVITE_STORAGE_KEY);
  if (pendingInviteToken) {
    sessionStorage.removeItem(PENDING_INVITE_STORAGE_KEY);
    const { error: inviteError } = await supabase.rpc("switch_organization_via_invite", { p_token: pendingInviteToken });
    if (inviteError) console.warn("Invite redemption failed:", inviteError.message);
  }

  // Ensure org + membership exist — self-heals users whose handle_new_user
  // trigger failed silently at signup (also the path Google-OAuth sign-ups
  // take, since they never call options.data). Safe to call repeatedly (no-op
  // if membership already exists). Requires migration 0017 to be applied.
  await supabase.rpc("ensure_user_organization");
  const [{
    data: membership
  }, {
    data: isAdmin
  }, {
    data: adminRole
  }] = await Promise.all([
    supabase.from("memberships").select("role, organization_id").eq("user_id", session.user.id).single(),
    supabase.rpc("is_platform_admin"),
    // Returns null for non-admins; requires migration 0030. Failing this call
    // (e.g. migration not yet applied) shouldn't block login, so it's not awaited strictly.
    supabase.rpc("platform_admin_role").then((r) => r).catch(() => ({ data: null })),
  ]);
  if (!membership) return null;
  const {
    data: org
  } = await supabase.from("organizations").select("id, name").eq("id", membership.organization_id).single();
  if (!org) return null;
  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
      name: session.user.user_metadata?.full_name ?? session.user.email ?? "",
      role: membership.role
    },
    organization: {
      id: org.id,
      name: org.name
    },
    isPlatformAdmin: Boolean(isAdmin),
    platformAdminRole: adminRole ?? null
  };
}
// Enrolling an MFA factor (see Profile.jsx) means nothing if a session with
// a verified factor is still treated as fully logged in without ever being
// challenged for it — Supabase issues an aal1 session on password/OAuth
// sign-in regardless of enrolled factors; the app is responsible for
// checking the assurance level and blocking access until a second factor
// is verified. Checked on every session (initial load and auth-state
// changes), not just at the login form, so a still-valid stored session
// from before MFA was enrolled gets challenged too, not grandfathered in.
async function needsMfaChallenge() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) return false;
  return data.currentLevel === "aal1" && data.nextLevel === "aal2";
}
export function AuthProvider({
  children
}) {
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [platformAdminRole, setPlatformAdminRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mfaPending, setMfaPending] = useState(false);
  const queryClient = useQueryClient();
  // Every query in this app (fetchMyCybersachetStats, fetchPlanUsage,
  // fetchMyEnrollments, ...) is keyed by a static string, not a user id —
  // the query client itself is the thing scoped to "whoever is logged in
  // right now". Without clearing it on every account switch, a second
  // account logged into the same tab would render the first account's
  // cached answers (a different organization's training stats, in the
  // worst case) until an unrelated refetch happened to overwrite them.
  const lastUserIdRef = useRef(null);
  const applyProfile = useCallback(profile => {
    if (profile?.mfaPending) {
      setMfaPending(true);
      setUser(null);
      setOrganization(null);
      setIsPlatformAdmin(false);
      setPlatformAdminRole(null);
      return;
    }
    setMfaPending(false);
    setUser(profile?.user ?? null);
    setOrganization(profile?.organization ?? null);
    setIsPlatformAdmin(profile?.isPlatformAdmin ?? false);
    setPlatformAdminRole(profile?.platformAdminRole ?? null);
  }, []);
  useEffect(() => {
    let active = true;
    loadProfile().then(profile => {
      if (!active) return;
      lastUserIdRef.current = profile?.mfaPending ? null : (profile?.user?.id ?? null);
      applyProfile(profile);
      setIsLoading(false);
    });
    const {
      data: listener
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        lastUserIdRef.current = null;
        queryClient.clear();
        applyProfile(null);
        return;
      }
      // A session for a different user than the one the cache was built for
      // — sign-out+sign-in as someone else, or a switch with no sign-out in
      // between — clear before loading the new profile so nothing from the
      // previous account is still sitting in the cache when it renders.
      if (session.user.id !== lastUserIdRef.current) {
        queryClient.clear();
      }
      loadProfile().then(profile => {
        if (!active) return;
        // An MFA-pending session hasn't loaded a real profile yet — leave
        // lastUserIdRef unset so the eventual post-challenge reload is
        // treated as a fresh load (cache-clear included) rather than
        // matching a ref that was set before authentication finished.
        lastUserIdRef.current = profile?.mfaPending ? null : session.user.id;
        applyProfile(profile);
      });
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [applyProfile, queryClient]);
  const login = useCallback(async (email, password, captchaToken) => {
    const {
      error
    } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaToken ? { captchaToken } : undefined
    });
    if (error) throw new Error(error.message);
    const profile = await loadProfile();
    applyProfile(profile);
    // The caller (Login.jsx) needs this to decide whether to navigate to
    // /dashboard — App.jsx's mfaPending gate already blocks real content
    // either way, but navigating early leaves the address bar reading
    // /dashboard while the person is still looking at the MFA prompt.
    return { mfaPending: !!profile?.mfaPending };
  }, [applyProfile]);
  const loginWithGoogle = useCallback(async () => {
    const {
      error
    } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/dashboard`
      }
    });
    if (error) throw new Error(error.message);
    // Browser navigates away to Google — nothing left to do here.
  }, []);
  const register = useCallback(async (organizationName, name, email, password, captchaToken, inviteToken) => {
    const {
      data,
      error
    } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          organization_name: organizationName,
          full_name: name,
          ...(inviteToken ? { invite_token: inviteToken } : {})
        },
        ...(captchaToken ? { captchaToken } : {})
      }
    });
    if (error) throw new Error(error.message);
    if (!data.session) {
      return {
        needsEmailConfirmation: true
      };
    }
    applyProfile(await loadProfile());
    return {
      needsEmailConfirmation: false
    };
  }, [applyProfile]);
  const requestPasswordReset = useCallback(async (email, captchaToken) => {
    const {
      error
    } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
      captchaToken: captchaToken || undefined
    });
    if (error) throw new Error(error.message);
  }, []);
  const updatePassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw new Error(error.message);
  }, []);
  const logout = useCallback(() => {
    void supabase.auth.signOut();
    lastUserIdRef.current = null;
    queryClient.clear();
    applyProfile(null);
  }, [applyProfile, queryClient]);
  // Verifies the 6-digit code from the user's authenticator app against
  // their enrolled TOTP factor and, only on success, loads the real profile
  // — this is the actual enforcement point; everything up to here has been
  // a valid password/OAuth session that still isn't allowed into the app.
  const resolveMfaChallenge = useCallback(async code => {
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    if (listError) throw new Error(listError.message);
    const factor = (factors?.totp ?? []).find(f => f.status === "verified");
    if (!factor) throw new Error("No verified authenticator found on this account.");
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
    if (error) throw new Error(error.message);
    applyProfile(await loadProfile());
  }, [applyProfile]);
  // The account has a verified factor but the person at the login screen
  // can't produce a code for it (lost device, etc.) — signing out is the
  // only safe option; there's no "skip MFA" path once a factor is enrolled.
  const cancelMfaChallenge = useCallback(() => {
    void supabase.auth.signOut();
    lastUserIdRef.current = null;
    applyProfile(null);
  }, [applyProfile]);
  const value = useMemo(() => ({
    user,
    organization,
    isPlatformAdmin,
    platformAdminRole,
    isLoading,
    mfaPending,
    resolveMfaChallenge,
    cancelMfaChallenge,
    login,
    loginWithGoogle,
    register,
    requestPasswordReset,
    updatePassword,
    logout
  }), [user, organization, isPlatformAdmin, platformAdminRole, isLoading, mfaPending, resolveMfaChallenge, cancelMfaChallenge, login, loginWithGoogle, register, requestPasswordReset, updatePassword, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
