import { randomUUID } from "node:crypto";
import type { AdminRole, LicensePool, TenantSummary, UserSummary } from "@cyvra/xcqc-shared";

export interface AppState {
  tenants: TenantSummary[];
  users: UserSummary[];
  licenses: Map<string, LicensePool>;
  /** Demo auth tokens → userId */
  tokens: Map<string, string>;
}

export function createSeedState(): AppState {
  const tenantId = "tenant-lab";
  const tenants: TenantSummary[] = [
    {
      tenantId,
      name: "CYVRA Lab Tenant",
      status: "active",
      createdAt: new Date().toISOString(),
    },
  ];
  const users: UserSummary[] = [
    {
      userId: "user-super",
      email: "super@cyvra.local",
      displayName: "Platform Super",
      role: "PLATFORM_SUPER",
      tenantId: null,
    },
    {
      userId: "user-admin",
      email: "admin@lab.local",
      displayName: "Lab Tenant Admin",
      role: "TENANT_ADMIN",
      tenantId,
    },
    {
      userId: "user-ops",
      email: "ops@lab.local",
      displayName: "Lab Operator",
      role: "OPERATOR",
      tenantId,
    },
  ];
  const licenses = new Map<string, LicensePool>([
    [
      tenantId,
      {
        tenantId,
        creditsRemaining: 100,
        creditsTotal: 100,
        plan: "mvp-demo",
      },
    ],
  ]);
  return { tenants, users, licenses, tokens: new Map() };
}

export function issueDemoToken(state: AppState, userId: string): string {
  const token = `xcqc-demo-${randomUUID()}`;
  state.tokens.set(token, userId);
  return token;
}

export function userFromAuth(
  state: AppState,
  header?: string,
): UserSummary | undefined {
  if (!header?.startsWith("Bearer ")) return undefined;
  const token = header.slice(7);
  const userId = state.tokens.get(token);
  if (!userId) {
    // Accept static demo tokens for web shell without login dance
    if (token === "demo-super") return state.users.find((u) => u.role === "PLATFORM_SUPER");
    if (token === "demo-admin") return state.users.find((u) => u.role === "TENANT_ADMIN");
    if (token === "demo-ops") return state.users.find((u) => u.role === "OPERATOR");
    return undefined;
  }
  return state.users.find((u) => u.userId === userId);
}

export function requireRole(
  user: UserSummary | undefined,
  minimum: AdminRole,
): boolean {
  if (!user) return false;
  const ranks: Record<AdminRole, number> = {
    PLATFORM_SUPER: 100,
    PLATFORM_SUPPORT: 90,
    TENANT_OWNER: 80,
    TENANT_ADMIN: 70,
    SUPERVISOR: 50,
    OPERATOR: 30,
    AUDITOR: 20,
  };
  return ranks[user.role] >= ranks[minimum];
}
