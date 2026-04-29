"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearToken, getToken, setToken } from "@/lib/api";
import type { User } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (perm: string | string[]) => boolean;
  hasRole: (role: string | string[]) => boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ user: User }>("/me");
      setUser(res.user);
    } catch {
      clearToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ token: string; user: User }>("/login", {
        method: "POST",
        body: { email, password },
        auth: false,
      });
      setToken(res.token);
      setUser(res.user);
      router.push("/dashboard");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await apiFetch("/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  const hasPermission = useCallback(
    (perm: string | string[]) => {
      if (!user) return false;
      if (user.role?.name === "super_admin") return true;
      const list = Array.isArray(perm) ? perm : [perm];
      return list.some((p) => user.permissions.includes(p));
    },
    [user]
  );

  const hasRole = useCallback(
    (role: string | string[]) => {
      if (!user?.role) return false;
      const list = Array.isArray(role) ? role : [role];
      return list.includes(user.role.name);
    },
    [user]
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, hasPermission, hasRole, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
