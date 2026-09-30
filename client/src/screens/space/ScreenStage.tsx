import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicUser } from "@orbit/shared";
import { useSession } from "../../state/session.ts";
import { useSpace } from "../../state/space.ts";
import { useWorld } from "../../state/world.ts";
import { useComm } from "../../state/comm.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { IconClose, IconCollapse, IconExpand, IconScreen } from "../../ui/Icons.tsx";

const EMPTY: string[] = [];

const iconButton: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: "50%",
  border: 0,
  background: "rgba(190,180,255,0.1)",
  color: "#F4F2FF",
  display: "grid",
  placeItems: "center",
};

export function ScreenStage({ zoneId }: { zoneId: string | null }) {
  const me = useSession((s) => s.me);
  const users = useWorld((s) => s.users);
  const members = useSpace((s) => (zoneId ? s.zones[zoneId]?.members : undefined) ?? EMPTY);
  const sharing = useSpace((s) => s.sharing);
  const remoteScreens = useComm((s) => s.remoteScreens);
  const [picked, setPicked] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const prevCount = useRef(0);

  const sharers = useMemo(
    () => members.filter((id) => id !== me?.id && sharing[id]).map((id) => users[id]).filter((u): u is PublicUser => !!u),
    [members, sharing, users, me?.id],
  );

  useEffect(() => {
    if (sharers.length > prevCount.current) {
      setPicked(sharers[sharers.length - 1].id);
      setHidden(false);
    }
    if (sharers.length === 0) setExpanded(false);
    prevCount.current = sharers.length;
  }, [sharers]);

  if (!me) return null;
  const current = sharers.find((u) => u.id === picked) ?? sharers[sharers.length - 1] ?? null;
  if (!current) return null;
  const stream = remoteScreens[current.id] ?? null;

  if (hidden) {
    return (
      <button
        aria-label={`Show ${current.name}'s screen`}
        onClick={() => setHidden(false)}
        style={{ position: "absolute", right: 32, top: 84, display: "flex", alignItems: "center", gap: 10, padding: "6px 14px 6px 6px", borderRadius: 999, border: "1px solid rgba(34,227,255,0.4)", background: "rgba(20,18,44,0.9)", color: "#F4F2FF", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", zIndex: 20, pointerEvents: "auto" }}
      >
        <Avatar spec={current.avatar} size={26} presence="none" />
        <IconScreen size={16} color="#22E3FF" />
        {sharers.length > 1 ? `${sharers.length} screens` : `${current.name} is sharing`}
        <span style={{ color: "#22E3FF" }}>Show</span>
      </button>
    );
  }

  return (
    <section
      aria-label={`${current.name}'s screen`}
      style={{
        position: "absolute",
        ...(expanded ? { left: 32, right: 32, top: 84, bottom: 176 } : { right: 32, top: 84, width: "min(46vw, 760px)" }),
        display: "flex",
        flexDirection: "column",
        borderRadius: 22,
        background: "rgba(20,18,44,0.92)",
        border: "1px solid rgba(34,227,255,0.35)",
        boxShadow: "0 0 40px rgba(34,227,255,0.12), 0 24px 60px rgba(0,0,0,0.55)",
        overflow: "hidden",
        zIndex: 20,
        pointerEvents: "auto",
      }}
    >
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 8px 8px 12px", minHeight: 48 }}>
        {sharers.length > 1 ? (
          sharers.map((u) => {
            const on = u.id === current.id;
            return (
              <button
                key={u.id}
                onClick={() => setPicked(u.id)}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 12px 4px 4px", borderRadius: 999, border: 0, background: on ? "rgba(34,227,255,0.16)" : "transparent", color: on ? "#22E3FF" : "#BDB8E6", font: "600 13px var(--font-display)", whiteSpace: "nowrap" }}
              >
                <Avatar spec={u.avatar} size={24} presence="none" />
                {u.name}
              </button>
            );
          })
        ) : (
          <>
            <Avatar spec={current.avatar} size={26} presence="none" />
            <span style={{ font: "600 13px var(--font-display)" }}>{current.name}&apos;s screen</span>
          </>
        )}
        <span style={{ flex: 1 }} />
        <button aria-label={expanded ? "Shrink" : "Expand"} onClick={() => setExpanded(!expanded)} style={iconButton}>
          {expanded ? <IconCollapse size={16} /> : <IconExpand size={16} />}
        </button>
        <button aria-label="Hide" onClick={() => setHidden(true)} style={iconButton}>
          <IconClose size={16} />
        </button>
      </header>
      <div style={{ position: "relative", background: "#050510", ...(expanded ? { flex: 1 } : { aspectRatio: "16 / 9" }) }}>
        {stream ? (
          <ScreenVideo stream={stream} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 13, color: "#8A84BA" }}>Connecting to {current.name}&apos;s screen…</div>
        )}
      </div>
    </section>
  );
}

function ScreenVideo({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.srcObject = stream;
    void el.play().catch(() => undefined);
    return () => {
      el.srcObject = null;
    };
  }, [stream]);
  return <video ref={ref} autoPlay playsInline muted style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />;
}
