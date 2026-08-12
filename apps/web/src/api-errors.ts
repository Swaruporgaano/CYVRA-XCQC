/** User-facing message when browser fetch() fails (network / CORS / asleep API). */
export function formatFetchError(err: unknown, apiBase: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  const isNetwork =
    msg === "Failed to fetch" ||
    msg.includes("NetworkError") ||
    msg.includes("Load failed") ||
    msg.includes("Network request failed");

  if (!isNetwork) return msg;

  if (import.meta.env.PROD) {
    return `Cannot reach API at ${apiBase}. Wake Render (curl /health), confirm CORS_ORIGINS includes this Worker origin, and rebuild if VITE_API_URL changed.`;
  }

  return `Cannot reach API at ${apiBase}. Start the API with npm run dev:api or set VITE_API_URL.`;
}
