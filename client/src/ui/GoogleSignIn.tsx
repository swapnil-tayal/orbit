import { useEffect, useRef, useState } from "react";

interface TokenResponse {
  access_token?: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void;
}

interface GoogleOAuth2 {
  initTokenClient(opts: { client_id: string; scope: string; callback: (r: TokenResponse) => void; error_callback?: (e: { type?: string }) => void }): TokenClient;
  revoke?(token: string, done?: () => void): void;
}

type GoogleWindow = Window & { google?: { accounts: { oauth2: GoogleOAuth2; id?: { disableAutoSelect(): void } } } };

const CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? "";
let scriptPromise: Promise<GoogleOAuth2> | null = null;

function loadGoogle(): Promise<GoogleOAuth2> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const ready = () => (window as GoogleWindow).google?.accounts?.oauth2;
    const now = ready();
    if (now) {
      resolve(now);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      const g = ready();
      if (g) resolve(g);
      else reject(new Error("google identity unavailable"));
    };
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("google script failed to load"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export function googleSignInAvailable(): boolean {
  return CLIENT_ID.length > 0;
}

export function googleSignOut(): void {
  (window as GoogleWindow).google?.accounts?.id?.disableAutoSelect();
}

function GoogleG({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export function GoogleSignInButton({ onAccessToken, busy = false }: { onAccessToken: (token: string) => void; busy?: boolean }) {
  const client = useRef<TokenClient | null>(null);
  const cb = useRef(onAccessToken);
  cb.current = onAccessToken;
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let alive = true;
    loadGoogle()
      .then((oauth2) => {
        if (!alive) return;
        client.current = oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: "openid email profile",
          callback: (r) => {
            setWaiting(false);
            if (r.access_token) cb.current(r.access_token);
          },
          error_callback: () => setWaiting(false),
        });
        setState("ready");
      })
      .catch(() => alive && setState("failed"));
    return () => {
      alive = false;
    };
  }, []);

  if (!CLIENT_ID) return <span style={{ fontSize: 13, color: "#BDB8E6" }}>Google sign-in is not configured.</span>;
  if (state === "failed") return <span style={{ fontSize: 13, color: "#FF8FB8" }}>Could not load Google sign-in. Check your connection and reload.</span>;

  const disabled = state !== "ready" || busy || waiting;
  return (
    <button
      onClick={() => {
        if (!client.current) return;
        setWaiting(true);
        client.current.requestAccessToken({ prompt: "" });
      }}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        height: 58,
        padding: "0 30px 0 24px",
        borderRadius: 999,
        border: 0,
        background: "#FFFFFF",
        color: "#1A0012",
        fontSize: 17,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.7 : 1,
        transition: "opacity 160ms",
      }}
    >
      <GoogleG size={22} />
      {busy || waiting ? "Signing you in…" : "Continue with Google"}
    </button>
  );
}
