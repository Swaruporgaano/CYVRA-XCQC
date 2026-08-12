import { Navigate, useLocation } from "react-router-dom";

const LEGACY_PREFIXES = [
  "/operator",
  "/sessions",
  "/certificates",
  "/devices",
  "/users",
  "/licenses",
  "/reports",
  "/settings",
  "/dashboard",
] as const;

/** Redirect old operator paths (/sessions, etc.) to /app/... */
export function LegacyOperatorRedirect() {
  const { pathname, search, hash } = useLocation();
  const base = pathname === "/dashboard" ? "/app" : `/app${pathname}`;
  return <Navigate to={`${base}${search}${hash}`} replace />;
}

export function isLegacyOperatorPath(pathname: string): boolean {
  if (pathname === "/dashboard") return true;
  return LEGACY_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
