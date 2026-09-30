import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";
import { useUI } from "../state/ui.ts";
import { useWorld } from "../state/world.ts";
import { Avatar } from "./Avatar.tsx";

type Variant = "primary" | "secondary" | "tinted" | "yellow" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  height?: number;
  grow?: boolean;
  glow?: boolean;
  children: ReactNode;
}

const variantStyle: Record<Variant, CSSProperties> = {
  primary: { background: "#FF3D9A", color: "#1A0012", fontWeight: 700 },
  secondary: { background: "rgba(190,180,255,0.1)", color: "#F4F2FF", fontWeight: 600 },
  tinted: { background: "rgba(34,227,255,0.14)", color: "#22E3FF", fontWeight: 700 },
  yellow: { background: "#FFD23F", color: "#0B0B1A", fontWeight: 700 },
  ghost: { background: "transparent", color: "#BDB8E6", fontWeight: 500 },
};

export function Button({ variant = "primary", height = 48, grow, glow = variant === "primary", children, style, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        height,
        padding: `0 ${Math.round(height * 0.5)}px`,
        borderRadius: 999,
        border: 0,
        fontSize: height >= 56 ? 16 : height >= 52 ? 15 : 14,
        flexGrow: grow ? 1 : undefined,
        boxShadow: glow && variant === "primary" ? `0 0 ${Math.round(height * 0.6)}px rgba(255,61,154,0.55)` : undefined,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        whiteSpace: "nowrap",
        ...variantStyle[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Keycap({ children, inverse }: { children: ReactNode; inverse?: boolean }) {
  return (
    <span
      style={{
        font: "700 11px/16px var(--font-mono)",
        padding: "2px 6px",
        borderRadius: 6,
        background: inverse ? "rgba(190,180,255,0.14)" : "rgba(26,0,18,0.18)",
        color: inverse ? "#22E3FF" : "inherit",
      }}
    >
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: 7,
        border: "1px solid rgba(34,227,255,0.4)",
        font: "600 11px/22px var(--font-mono)",
        color: "#22E3FF",
      }}
    >
      {children}
    </kbd>
  );
}

export function Waveform({ bars = 3, width = 2, height = 10, color = "#B6FF3B", delays = [0, 0.15, 0.3] }: { bars?: number; width?: number; height?: number; color?: string; delays?: number[] }) {
  return (
    <span style={{ display: "inline-flex", gap: 2, height, alignItems: "center" }} aria-hidden>
      {Array.from({ length: bars }, (_, i) => (
        <span key={i} style={{ width, height, borderRadius: 2, background: color, animation: `wave 0.9s ease-in-out ${delays[i % delays.length]}s infinite`, transformOrigin: "center" }} />
      ))}
    </span>
  );
}

export function GlassPill({ children, border = "rgba(190,180,255,0.16)", style, glow }: { children: ReactNode; border?: string; style?: CSSProperties; glow?: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "7px 16px 7px 7px",
        borderRadius: 999,
        background: "rgba(20,18,44,0.85)",
        border: `1px solid ${border}`,
        fontSize: 13,
        whiteSpace: "nowrap",
        boxShadow: glow ? `0 0 30px ${glow}` : undefined,
        pointerEvents: "auto",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Panel({ children, style, border = "rgba(190,180,255,0.16)", padding = 24 }: { children: ReactNode; style?: CSSProperties; border?: string; padding?: number }) {
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 18,
        padding,
        borderRadius: 28,
        background: "rgba(20,18,44,0.9)",
        border: `1px solid ${border}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        pointerEvents: "auto",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function Eyebrow({ children, color = "#FF3D9A" }: { children: ReactNode; color?: string }) {
  return <div style={{ font: "700 11px/14px var(--font-mono)", letterSpacing: "0.1em", color, textTransform: "uppercase" }}>{children}</div>;
}

export function StepBar({ step, total = 3 }: { step: number; total?: number }) {
  return (
    <nav aria-label="Onboarding steps" style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {Array.from({ length: total }, (_, i) => {
        const done = i < step;
        const current = i === step;
        return (
          <span
            key={i}
            style={{
              width: current ? 56 : 36,
              height: 6,
              borderRadius: 999,
              background: done ? "#B6FF3B" : current ? "#FF3D9A" : "rgba(190,180,255,0.2)",
              boxShadow: current ? "0 0 12px #FF3D9A" : undefined,
              transition: "width 240ms var(--ease-camera), background 240ms",
            }}
          />
        );
      })}
    </nav>
  );
}

export function Toasts() {
  const toasts = useUI((s) => s.toasts);
  const users = useWorld((s) => s.users);
  return (
    <div style={{ position: "absolute", left: "50%", top: 28, transform: "translateX(-50%)", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", pointerEvents: "none", zIndex: 40 }}>
      {toasts.map((t) => {
        const border = t.kind === "error" ? "rgba(255,90,95,0.6)" : t.kind === "travel" ? "rgba(34,227,255,0.45)" : t.kind === "space" ? "rgba(182,255,59,0.55)" : "rgba(255,61,154,0.4)";
        const avatar = t.avatarUserId ? users[t.avatarUserId] : null;
        return (
          <div
            key={t.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: avatar ? "6px 18px 6px 6px" : "10px 18px",
              borderRadius: 999,
              background: "rgba(20,18,44,0.9)",
              border: `1px solid ${border}`,
              boxShadow: "0 0 30px rgba(255,61,154,0.18), 0 18px 40px rgba(0,0,0,0.5)",
              fontSize: 13,
              whiteSpace: "nowrap",
              animation: "fade-in 200ms ease-out",
            }}
          >
            {avatar ? <Avatar spec={avatar.avatar} size={28} presence="online" /> : null}
            {t.accent ? <span style={{ font: "600 14px var(--font-display)", color: t.kind === "space" ? "#B6FF3B" : "#FF3D9A" }}>{t.accent}</span> : null}
            <span style={{ color: t.accent ? "#BDB8E6" : "#F4F2FF" }}>{t.text}</span>
          </div>
        );
      })}
    </div>
  );
}

export const CONTROL_H = 64;
export const CONTROL_BOTTOM = 24;

export const GLASS_CONTROL: CSSProperties = {
  boxSizing: "border-box",
  height: CONTROL_H,
  display: "flex",
  alignItems: "center",
  borderRadius: 999,
  background: "rgba(20,18,44,0.72)",
  border: "1px solid rgba(190,180,255,0.18)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
  backdropFilter: "blur(18px) saturate(160%)",
  WebkitBackdropFilter: "blur(18px) saturate(160%)",
};

export function Wordmark({ size = 20 }: { size?: number }) {
  return <span style={{ font: `700 ${size}px/${size + 4}px var(--font-display)`, letterSpacing: "-0.02em" }}>Connect</span>;
}
