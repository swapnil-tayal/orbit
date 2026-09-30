export const API_BASE = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(/\/+$/, "");

export const TUNNEL_HEADERS: Record<string, string> = API_BASE ? { "ngrok-skip-browser-warning": "1" } : {};
