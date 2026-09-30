import { useEffect, useMemo, useState } from "react";
import { unitCentre, type PublicUser } from "@orbit/shared";
import { useSession } from "../state/session.ts";
import { api, ApiError, type AuthResponse } from "../net/api.ts";
import { clearLegacyUserId, devProfile, legacyUserId, setToken } from "../net/identity.ts";
import { reconnectSocket } from "../net/socket.ts";
import { applySignedIn } from "../app/boot.ts";
import { toast } from "../state/ui.ts";
import { GoogleSignInButton } from "../ui/GoogleSignIn.tsx";
import { GlobeCanvas } from "../world/globe/GlobeCanvas.tsx";
import { OrbitRing } from "./OrbitRing.tsx";
import { Anchor, GlobeOverlay } from "../world/globe/Overlay.tsx";
import { useGlobe } from "../world/globe/handle.ts";
import { IconArrowRight } from "../ui/Icons.tsx";
import { Wordmark } from "../ui/primitives.tsx";

export function Landing() {
  const setStatus = useSession((s) => s.setStatus);
  const me = useSession((s) => s.me);
  const signedIn = useSession((s) => s.userId !== "");
  const [busy, setBusy] = useState(false);
  const profile = import.meta.env.DEV ? devProfile() : null;
  const [users, setUsers] = useState<PublicUser[]>([]);

  const signInWith = async (run: () => Promise<AuthResponse>) => {
    if (busy) return;
    setBusy(true);
    try {
      const { token, user } = await run();
      setToken(token);
      clearLegacyUserId();
      applySignedIn(user);
      reconnectSocket();
      setStatus(user.onboarded ? "world" : "onboarding");
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "error";
      toast(code === "world_full" ? "The world is full (50 people)." : code === "invalid_google_token" ? "Google sign-in failed. Try again." : "Could not sign in", "error");
    } finally {
      setBusy(false);
    }
  };
  const globe = useGlobe();

  useEffect(() => {
    let alive = true;
    const load = () => api.world().then((w) => alive && setUsers(w.users)).catch(() => undefined);
    void load();
    const t = window.setInterval(load, 15000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const pings = useMemo(() => {
    const seen = new Map<string, { unitId: string; presence: PublicUser["presence"] }>();
    for (const u of users) {
      if (!u.currentUnit) continue;
      const prev = seen.get(u.currentUnit);
      if (!prev || (prev.presence !== "online" && u.presence === "online")) seen.set(u.currentUnit, { unitId: u.currentUnit, presence: u.presence });
    }
    return [...seen.values()];
  }, [users]);

  useEffect(() => {
    if (!globe) return;
    globe.setPoints(
      pings.map((p) => {
        const c = unitCentre(p.unitId);
        return { id: `unit:${p.unitId}`, lat: c.lat, lng: c.lng };
      }),
    );
  }, [globe, pings]);

    const enter = () => setStatus(me?.onboarded ? "world" : "onboarding");

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0B0B1A url(/starfield.webp) center / cover" }}>
      <OrbitRing side="back" />
      <GlobeCanvas landing autoRotate style={{ backgroundImage: "none" }} />
      <OrbitRing side="front" />
      <GlobeOverlay>
        {pings.map((p) => {
          const color = p.presence === "online" ? "#B6FF3B" : p.presence === "traveling" ? "#22E3FF" : "#6E6A8F";
          return (
            <Anchor key={p.unitId} id={`unit:${p.unitId}`}>
              {p.presence === "online" ? <div style={{ position: "absolute", left: -6, top: -6, width: 12, height: 12, borderRadius: "50%", background: color, animation: "ping 1.8s ease-out infinite" }} /> : null}
              <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: color, boxShadow: p.presence === "offline" ? "none" : `0 0 12px ${color}` }} />
            </Anchor>
          );
        })}
      </GlobeOverlay>

      <header style={{ position: "absolute", left: 48, right: 48, top: 32, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Wordmark />
        </div>
        {signedIn && me ? (
          <button
            onClick={enter}
            style={{ padding: "10px 18px", borderRadius: 999, border: "1px solid rgba(190,180,255,0.25)", background: "rgba(20,18,44,0.6)", color: "#F4F2FF", fontSize: 14, fontWeight: 600 }}
          >
            Continue as {me.name}
          </button>
        ) : null}
      </header>

      <main style={{ position: "absolute", left: 0, right: 0, top: "12.5%", display: "flex", flexDirection: "column", alignItems: "center", gap: 22, textAlign: "center", padding: "0 24px" }}>
        <h1 style={{ margin: 0, font: "800 clamp(36px, 4.2vw, 60px)/1.1 var(--font-display)", letterSpacing: "-0.045em" }}>
          Where is <span style={{ color: "#FF3D9A", textShadow: "0 0 40px rgba(255,61,154,0.6)" }}>everyone?</span>
        </h1>
        <p style={{ margin: 0, maxWidth: 520, fontSize: 16, lineHeight: "26px", color: "#BDB8E6" }}>Find your team on a live globe. Travel there. Walk over to talk.</p>
        {signedIn ? (
          <button
            onClick={enter}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              height: 58,
              padding: "0 30px",
              borderRadius: 999,
              border: 0,
              background: "#FFFFFF",
              color: "#1A0012",
              fontSize: 17,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Enter the world
            <IconArrowRight size={18} strokeWidth={2.4} />
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, pointerEvents: busy ? "none" : "auto" }}>
            <GoogleSignInButton busy={busy} onAccessToken={(accessToken) => void signInWith(() => api.authGoogle({ accessToken, linkUserId: legacyUserId() }))} />
            <span style={{ fontSize: 12, color: "#8A84BA" }}>We only use your name and email.</span>
            {profile ? (
              <button onClick={() => void signInWith(() => api.authDev(profile))} style={{ padding: "8px 16px", borderRadius: 999, border: "1px dashed rgba(190,180,255,0.4)", background: "transparent", color: "#BDB8E6", fontSize: 13, cursor: "pointer" }}>
                Dev sign-in as {profile}
              </button>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
