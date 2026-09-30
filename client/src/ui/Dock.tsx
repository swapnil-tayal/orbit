import type { AvatarSpec } from "@orbit/shared";
import { Avatar } from "./Avatar.tsx";
import { GLASS_CONTROL } from "./primitives.tsx";
import { IconGlobe, IconHome, IconOffice, IconPeople } from "./Icons.tsx";

export interface DockProps {
  context: "globe" | "space";
  active?: "none" | "home" | "office" | "people" | "you" | "globe";
  online: number;
  me: AvatarSpec;
  onGlobe?: () => void;
  onHome?: () => void;
  onOffice?: () => void;
  onPeople?: () => void;
  onYou?: () => void;
}

const buttonStyle = (active: boolean): React.CSSProperties => ({
  width: 60,
  height: 50,
  border: 0,
  borderRadius: 999,
  background: active ? "rgba(190,180,255,0.14)" : "transparent",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 3,
  font: "600 10px/13px var(--font-ui)",
  cursor: "pointer",
  position: "relative",
});

export function Dock({ context, active = "none", online, me, onGlobe, onHome, onOffice, onPeople, onYou }: DockProps) {
  const inSpace = context === "space";
  return (
    <nav
      aria-label="World controls"
      style={{ ...GLASS_CONTROL, gap: 4, padding: 6, pointerEvents: "auto" }}
    >
      {inSpace ? (
        <button aria-label="Back to globe" style={{ ...buttonStyle(active === "globe"), color: "#22E3FF" }} onClick={onGlobe}>
          <IconGlobe size={20} strokeWidth={1.8} />
          <span style={{ color: "#BDB8E6" }}>Globe</span>
        </button>
      ) : null}
      {onHome ? (
        <button aria-label="Go home" style={{ ...buttonStyle(active === "home"), color: "#FFD23F" }} onClick={onHome}>
          <IconHome size={20} strokeWidth={1.8} />
          <span style={{ color: "#BDB8E6" }}>Home</span>
        </button>
      ) : null}
      {onOffice ? (
        <button aria-label="Travel to an office" aria-haspopup="dialog" style={{ ...buttonStyle(active === "office"), color: "#8FB8FF" }} onClick={onOffice}>
          <IconOffice size={20} strokeWidth={1.8} />
          <span style={{ color: "#BDB8E6" }}>Offices</span>
        </button>
      ) : null}
      <button aria-label="People" style={{ ...buttonStyle(active === "people"), color: "#B6FF3B" }} onClick={onPeople}>
        <IconPeople size={20} strokeWidth={1.8} />
        <span style={{ color: "#BDB8E6" }}>People</span>
        <span
          style={{
            position: "absolute",
            top: 4,
            right: 8,
            minWidth: 18,
            height: 16,
            padding: "0 4px",
            borderRadius: 999,
            background: "#B6FF3B",
            color: "#0B0B1A",
            font: "700 10px/16px var(--font-mono)",
            textAlign: "center",
            boxShadow: "0 0 10px rgba(182,255,59,0.6)",
          }}
        >
          {online}
        </span>
      </button>
      <span aria-hidden style={{ width: 1, height: 28, background: "rgba(190,180,255,0.16)", margin: "0 4px" }} />
      <button aria-label="Your profile" style={{ ...buttonStyle(active === "you"), color: "#F4F2FF" }} onClick={onYou}>
        <Avatar spec={me} size={20} presence="online" you />
        <span style={{ color: "#BDB8E6" }}>You</span>
      </button>
    </nav>
  );
}
