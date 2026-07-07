import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "../api/supabaseClient";
import type { Organization, User } from "../api/types";

interface Profile {
  user: User;
  organization: Organization;
  isPlatformAdmin: boolean;
}

interface AuthContextValue {
  user: User | null;
  organization: Organization | null;
  isPlatformAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    organizationName: string,
    name: string,
    email: string,
    password: string,
  ) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function loadProfile(): Promise<Profile | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;

  const [{ data: membership }, { data: isAdmin }] = await Promise.all([
    supabase.from("memberships").select("role, organization_id").eq("user_id", session.user.id).single(),
    supabase.rpc("is_platform_admin"),
  ]);
  if (!membership) return null;

  // Resolved via the membership's organization_id rather than a bare
  // `.from("organizations").single()` — a platform admin can see every
  // organization (by design, for the admin panel), which would otherwise
  // make `.single()` ambiguous and fail with a 406.
  const { data: org } = await supabase.from("organizations").select("id, name").eq("id", membership.organization_id).single();
  if (!org) return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
      name: (session.user.user_metadata?.full_name as string | undefined) ?? session.user.email ?? "",
      role: membership.role,
    },
    organization: { id: org.id, name: org.name },
    isPlatformAdmin: Boolean(isAdmin),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const applyProfile = useCallback((profile: Profile | null) => {
    setUser(profile?.user ?? null);
    setOrganization(profile?.organization ?? null);
    setIsPlatformAdmin(profile?.isPlatformAdmin ?? false);
  }, []);

  useEffect(() => {
    let active = true;

    loadProfile().then((profile) => {
      if (!active) return;
      applyProfile(profile);
      setIsLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        applyProfile(null);
        return;
      }
      loadProfile().then((profile) => active && applyProfile(profile));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [applyProfile]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      applyProfile(await loadProfile());
    },
    [applyProfile],
  );

  const register = useCallback(
    async (organizationName: string, name: string, email: string, password: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { organization_name: organizationName, full_name: name } },
      });
      if (error) throw new Error(error.message);

      if (!data.session) {
        return { needsEmailConfirmation: true };
      }
      applyProfile(await loadProfile());
      return { needsEmailConfirmation: false };
    },
    [applyProfile],
  );

  const logout = useCallback(() => {
    void supabase.auth.signOut();
    applyProfile(null);
  }, [applyProfile]);

  const value = useMemo(
    () => ({ user, organization, isPlatformAdmin, isLoading, login, register, logout }),
    [user, organization, isPlatformAdmin, isLoading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
