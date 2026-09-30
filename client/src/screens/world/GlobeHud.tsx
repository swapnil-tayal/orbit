import { useEffect, useState } from "react";
import { useSession } from "../../state/session.ts";
import { useWorld } from "../../state/world.ts";
import { useView } from "../../state/view.ts";
import { useUI } from "../../state/ui.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { Dock } from "../../ui/Dock.tsx";
import { IconEye, IconLocate, IconMinus, IconPlus, IconRotate } from "../../ui/Icons.tsx";
import { CONTROL_BOTTOM, CONTROL_H, GLASS_CONTROL } from "../../ui/primitives.tsx";
import { useGlobe } from "../../world/globe/handle.ts";
import { LOG_H_MIN, LOG_H_ORBIT } from "../../world/globe/constants.ts";
import { formatLocalTime, loadPlaces, nearestPlace } from "../onboarding/places.ts";
import { unitCentre } from "@orbit/shared";

export interface GlobeHudProps {
  peeking: boolean;
  onBackToMe: () => void;
  onHome?: () => void;
  onOffice?: () => void;
}

export function useLocalTimeOf(unitId: string | null): string {
  const [text, setText] = useState("");
  useEffect(() => {
    let alive = true;
    const update = async () => {
      if (!unitId) return;
      const places = await loadPlaces();
      const c = unitCentre(unitId);
      const tz = nearestPlace(places, c.lat, c.lng)?.tz ?? null;
      if (alive) setText(formatLocalTime(tz));
    };
    void update();
    const t = window.setInterval(() => void update(), 30000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [unitId]);
  return text;
}

export function GlobeHud({ peeking, onBackToMe, onHome, onOffice }: GlobeHudProps) {
  const me = useSession((s) => s.me);
  const users = useWorld((s) => s.users);
  const level = useView((s) => s.level);
  const zoomLog = useView((s) => s.zoomLog);
  const farSide = useView((s) => s.farSide);
  const sheet = useUI((s) => s.sheet);
  const setSheet = useUI((s) => s.setSheet);
  const globe = useGlobe();
  const list = Object.values(users);
  const online = list.filter((u) => u.presence === "online").length;
  const traveling = list.filter((u) => u.presence === "traveling").length;
  const offline = list.filter((u) => u.presence === "offline").length;
  const localTime = useLocalTimeOf(me?.currentUnit ?? null);
  const offices = useWorld((s) => s.offices);
  const inHome = !!me?.spaceId?.startsWith("home:");
  const ownHome = me?.spaceId === `home:${me?.id}`;
  const hostName = inHome && !ownHome ? (users[me?.spaceId?.slice(5) ?? ""]?.name ?? "Someone") : "";
  const placeName = me?.spaceId?.startsWith("dest:") ? "Shared destination" : ownHome ? "Home" : inHome ? `${hostName}'s home` : (offices[me?.currentUnit ?? ""]?.name ?? "Office");
  const status = me?.presence === "traveling" ? "Traveling" : me?.seated ? "At your desk" : inHome ? (ownHome ? "At home" : "Visiting") : "In the office";
  const thumbTop = Math.round(((zoomLog - LOG_H_MIN) / (LOG_H_ORBIT - LOG_H_MIN)) * 56);
  const atMax = zoomLog <= LOG_H_MIN + 0.02;
  if (!me) return null;

  return (
    <>
      <header style={{ position: "absolute", left: 32, right: 32, top: 28, display: "flex", alignItems: "center", justifyContent: "space-between", pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button
            onClick={() => setSheet(sheet === "profile" ? "none" : "profile")}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px 6px 6px", borderRadius: 999, background: "rgba(20,18,44,0.8)", border: "1px solid rgba(255,61,154,0.35)", color: "#F4F2FF", pointerEvents: "auto", textAlign: "left" }}
          >
            <Avatar spec={me.avatar} size={30} presence={me.presence === "traveling" ? "traveling" : "online"} you />
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{status}</span>
              <span style={{ fontSize: 12, color: "#BDB8E6" }}>
                {placeName}
                {localTime ? ` · ${localTime}` : ""}
              </span>
            </span>
          </button>
        </div>
        <button
          onClick={() => setSheet(sheet === "people" ? "none" : "people")}
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 16px", borderRadius: 999, background: "rgba(20,18,44,0.8)", border: "1px solid rgba(190,180,255,0.16)", fontSize: 13, color: "#F4F2FF", pointerEvents: "auto" }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#B6FF3B", boxShadow: "0 0 8px #B6FF3B" }} />
            <span className="mono" style={{ fontWeight: 700 }}>
              {online}
            </span>
            <span style={{ color: "#BDB8E6" }}>online</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22E3FF", boxShadow: "0 0 8px #22E3FF" }} />
            <span className="mono" style={{ fontWeight: 700 }}>
              {traveling}
            </span>
            <span style={{ color: "#BDB8E6" }}>traveling</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", border: "1.5px solid #6E6A8F" }} />
            <span className="mono" style={{ fontWeight: 700 }}>
              {offline}
            </span>
            <span style={{ color: "#BDB8E6" }}>offline</span>
          </span>
        </button>
      </header>

      {peeking ? (
        <div style={{ position: "absolute", left: "50%", top: 28, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10, padding: "7px 7px 7px 16px", borderRadius: 999, background: "rgba(20,18,44,0.88)", border: "1px solid rgba(255,210,63,0.45)", fontSize: 13, whiteSpace: "nowrap", zIndex: 20 }}>
          <IconEye size={16} color="#FFD23F" strokeWidth={2} />
          <span style={{ fontWeight: 600 }}>Peeking</span>
          <span style={{ color: "#BDB8E6" }}>{me.seated ? "you're still at your desk" : "your avatar stays put"}</span>
          <button onClick={onBackToMe} style={{ padding: "7px 14px", borderRadius: 999, border: 0, background: "rgba(255,61,154,0.18)", color: "#FF3D9A", fontWeight: 700 }}>
            Back to me
          </button>
        </div>
      ) : null}

      {level === "orbit" && farSide > 0 ? (
        <div style={{ position: "absolute", left: 32, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 8, padding: "8px 12px 8px 10px", borderRadius: 999, background: "rgba(20,18,44,0.85)", border: "1px solid rgba(34,227,255,0.35)", fontSize: 12, pointerEvents: "none" }}>
          <IconRotate size={16} color="#22E3FF" />
          <span className="mono" style={{ fontWeight: 700 }}>
            {farSide}
          </span>
          <span>on the far side</span>
        </div>
      ) : null}

      <div style={{ position: "absolute", right: 32, bottom: CONTROL_BOTTOM, display: "flex", flexDirection: "row", alignItems: "center", gap: 10, zIndex: 15 }}>
        <button aria-label="Back to me" onClick={onBackToMe} style={{ ...GLASS_CONTROL, width: CONTROL_H, justifyContent: "center", color: "#FF3D9A", cursor: "pointer" }}>
          <IconLocate size={20} strokeWidth={2} />
        </button>

        <div role="group" aria-label="Zoom" style={{ ...GLASS_CONTROL, gap: 4, padding: 6 }}>
          <button aria-label="Zoom out" onClick={() => globe?.zoomBy(0.7)} style={{ width: 50, height: 50, borderRadius: "50%", border: 0, background: "transparent", color: "#F4F2FF", display: "grid", placeItems: "center" }}>
            <IconMinus size={18} strokeWidth={2.2} />
          </button>
          <div style={{ width: 56, height: 3, borderRadius: 3, background: "rgba(244,242,255,0.25)", position: "relative" }}>
            <div style={{ position: "absolute", left: 51 - thumbTop, top: -3.5, width: 10, height: 10, borderRadius: "50%", background: "#F4F2FF" }} />
          </div>

          <button aria-label={atMax ? "Zoom in, at maximum" : "Zoom in"} disabled={atMax} onClick={() => globe?.zoomBy(-0.7)} style={{ width: 50, height: 50, borderRadius: "50%", border: 0, background: "transparent", color: atMax ? "#6E6A8F" : "#F4F2FF", display: "grid", placeItems: "center" }}>
            <IconPlus size={18} strokeWidth={2.2} />
          </button>
        </div>
      </div>

      <div style={{ position: "absolute", left: "50%", bottom: CONTROL_BOTTOM, transform: "translateX(-50%)", zIndex: 20 }}>
        <Dock context="globe" online={online} me={me.avatar} active={sheet === "people" ? "people" : sheet === "profile" ? "you" : sheet === "offices" ? "office" : "none"} onHome={onHome} onOffice={onOffice} onPeople={() => setSheet(sheet === "people" ? "none" : "people")} onYou={() => setSheet(sheet === "profile" ? "none" : "profile")} />
      </div>
    </>
  );
}
