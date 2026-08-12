import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "xcqc_customer_token";

export interface CustomerProfile {
  id: string;
  name?: string | null;
  mobile: string;
  email?: string | null;
  status: string;
  createdAt: string;
}

interface CustomerAuthState {
  token: string | null;
  customer: CustomerProfile | null;
  apiBase: string;
  loading: boolean;
  setSession: (token: string, customer: CustomerProfile) => void;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const CustomerAuthCtx = createContext<CustomerAuthState | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const apiBase = import.meta.env.VITE_API_URL ?? "/api";
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(STORAGE_KEY)));

  const setSession = useCallback((nextToken: string, nextCustomer: CustomerProfile) => {
    localStorage.setItem(STORAGE_KEY, nextToken);
    setToken(nextToken);
    setCustomer(nextCustomer);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setCustomer(null);
  }, []);

  const refreshMe = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`${apiBase}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      logout();
      return;
    }
    const data = (await res.json()) as { customer: CustomerProfile };
    setCustomer(data.customer);
  }, [apiBase, token, logout]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    refreshMe()
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token, refreshMe, logout]);

  const value = useMemo(
    () => ({ token, customer, apiBase, loading, setSession, logout, refreshMe }),
    [token, customer, apiBase, loading, setSession, logout, refreshMe],
  );

  return <CustomerAuthCtx.Provider value={value}>{children}</CustomerAuthCtx.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthCtx);
  if (!ctx) throw new Error("CustomerAuthProvider missing");
  return ctx;
}

export async function customerApiPost<T>(
  path: string,
  apiBase: string,
  body: unknown,
  token?: string | null,
): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = data as { error?: string; message?: string };
    throw new Error(err.error ?? err.message ?? `${res.status}`);
  }
  return data as T;
}

export async function customerApiGet<T>(path: string, apiBase: string, token: string): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json() as Promise<T>;
}
