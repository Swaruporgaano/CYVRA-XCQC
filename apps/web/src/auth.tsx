import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { formatFetchError } from "./api-errors";

export type DemoRole = "PLATFORM_SUPER" | "TENANT_ADMIN" | "OPERATOR";

const TOKEN_BY_ROLE: Record<DemoRole, string> = {
  PLATFORM_SUPER: "demo-super",
  TENANT_ADMIN: "demo-admin",
  OPERATOR: "demo-ops",
};

interface AuthState {
  role: DemoRole;
  token: string;
  setRole: (role: DemoRole) => void;
  apiBase: string;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<DemoRole>("TENANT_ADMIN");
  const apiBase = import.meta.env.VITE_API_URL ?? "/api";
  const value = useMemo(
    () => ({ role, token: TOKEN_BY_ROLE[role], setRole, apiBase }),
    [role, apiBase],
  );
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("AuthProvider missing");
  return ctx;
}

export async function apiGet<T>(path: string, token: string, apiBase: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBase}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (err) {
    throw new Error(formatFetchError(err, apiBase));
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(
  path: string,
  token: string,
  apiBase: string,
  body?: unknown,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new Error(formatFetchError(err, apiBase));
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}
