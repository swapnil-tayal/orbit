import type { PublicUser, ZoneDef } from "@orbit/shared";
import { useSession } from "../../state/session.ts";
import { useSpace } from "../../state/space.ts";
import { useWorld } from "../../state/world.ts";
import { useComm } from "../../state/comm.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { Waveform } from "../../ui/primitives.tsx";
import { IconMic, IconScreen } from "../../ui/Icons.tsx";

const EMPTY: string[] = [];

export function zoneTitle(zone: ZoneDef, owner: PublicUser | null): { banner: string; accent: string } {
  if (zone.kind === "desk") return { banner: "You're in ", accent: `${owner?.name ?? "someone"}'s space` };
  if (zone.kind === "meeting") return { banner: "You're in ", accent: "the meeting area" };
  if (zone.kind === "lounge") return { banner: "You're in ", accent: "the lounge" };
  return { banner: "You're at ", accent: zone.label.toLowerCase() };
}

const pillButton = (on: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 44,
  padding: "0 16px",
  borderRadius: 999,
  border: 0,
  background: on ? "#22E3FF" : "rgba(34,227,255,0.14)",
  color: on ? "#0B0B1A" : "#22E3FF",
  font: "600 13px var(--font-ui)",
  whiteSpace: "nowrap",
});

export function ProximityHud({ zone, owner, onShare, onMic }: { zone: ZoneDef; owner: PublicUser | null; onShare: () => void; onMic: () => void }) {
  const me = useSession((s) => s.me);
  const users = useWorld((s) => s.users);
  const zoneState = useSpace((s) => s.zones[zone.id]);
  const members = zoneState?.members ?? EMPTY;
  const speaking = useSpace((s) => s.speaking);
  const mic = useComm((s) => s.mic);
  const muted = useComm((s) => s.muted);
  const peers = useComm((s) => s.peers);
  const sharing = useComm((s) => s.localScreen !== null);
  const micAvailable = mic !== "denied" && mic !== "none";
  const localSpeaking = useComm((s) => s.localSpeaking);
  if (!me) return null;
  const others = members.filter((id) => id !== me.id).map((id) => users[id]).filter(Boolean) as PublicUser[];
  const talking = others.filter((u) => speaking[u.id]);
  const title = zoneTitle(zone, owner);
  const withText = others.length === 0 ? "Alone here" : others.length === 1 ? `With ${others[0].name}` : others.length === 2 ? `With ${others[0].name} and ${others[1].name}` : `With ${others.length} people`;
  const connecting = Object.values(peers).some((p) => p === "connecting");
  const sub =
    talking.length > 0
      ? `${talking[0].name} is talking · walk away to leave`
      : sharing
        ? "You're sharing your screen · walk away to leave"
        : mic === "denied" || mic === "none"
          ? "No mic · you can still listen · walk away to leave"
          : connecting
            ? "Connecting audio…"
            : muted
              ? "You're muted · walk away to leave"
              : "walk away to leave";
  return (
    <>
      <div style={{ position: "absolute", left: "50%", top: 28, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10, padding: "10px 18px", borderRadius: 999, background: "rgba(20,18,44,0.9)", border: "1px solid rgba(182,255,59,0.55)", boxShadow: "0 0 34px rgba(182,255,59,0.28)", fontSize: 14, whiteSpace: "nowrap", zIndex: 21 }}>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#B6FF3B", boxShadow: "0 0 10px #B6FF3B" }} />
        <span>
          {title.banner}
          <span style={{ font: "600 14px var(--font-display)", color: "#B6FF3B" }}>{title.accent}</span>
        </span>
      </div>
      <div role="region" aria-label="Who you're with" style={{ position: "absolute", left: "50%", bottom: 100, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 16, padding: "10px 10px 10px 14px", borderRadius: 999, background: "rgba(20,18,44,0.9)", border: `1px solid ${zone.kind === "desk" && owner?.id === me.id ? "rgba(255,61,154,0.35)" : "rgba(182,255,59,0.35)"}`, boxShadow: "0 18px 50px rgba(0,0,0,0.55), 0 0 30px rgba(182,255,59,0.15)", whiteSpace: "nowrap", zIndex: 21 }}>
        <div style={{ display: "flex", gap: 8 }}>
          {others.slice(0, 3).map((u) => (
            <Avatar key={u.id} spec={u.avatar} size={40} presence="online" speaking={!!speaking[u.id]} />
          ))}
          <Avatar spec={me.avatar} size={40} presence="online" you speaking={localSpeaking} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ font: "600 14px var(--font-display)" }}>{withText}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#BDB8E6" }}>
            {talking.length > 0 ? <Waveform /> : null}
            {sub}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button aria-label={!micAvailable ? "Microphone unavailable" : muted ? "Unmute microphone" : "Mute microphone"} onClick={onMic} disabled={!micAvailable} style={{ ...pillButton(micAvailable && !muted), opacity: micAvailable ? 1 : 0.6 }}>
            <IconMic size={18} strokeWidth={1.8} muted={muted || !micAvailable} />
            {!micAvailable ? "No mic" : muted ? "Unmute" : "Mute"}
          </button>
          <button aria-label={sharing ? "Stop sharing your screen" : "Share your screen"} onClick={onShare} style={pillButton(sharing)}>
            <IconScreen size={18} strokeWidth={1.8} />
            {sharing ? "Stop sharing" : "Share screen"}
          </button>
        </div>
      </div>
    </>
  );
}
