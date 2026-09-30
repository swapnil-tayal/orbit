import { useState } from "react";
import { Button, Eyebrow } from "../../ui/primitives.tsx";
import { IconHome, IconOffice } from "../../ui/Icons.tsx";

export type WorkMode = "home" | "office";

export interface ModeStepProps {
  initial: WorkMode | null;
  onPick: (mode: WorkMode) => void;
}

const OPTIONS: Array<{ mode: WorkMode; title: string; body: string; color: string; icon: (color: string) => React.ReactNode }> = [
  { mode: "home", title: "From home", body: "Pick your home area on the globe. You get your own desk at home, and people can drop by.", color: "#22E3FF", icon: (c) => <IconHome size={26} color={c} strokeWidth={1.8} /> },
  { mode: "office", title: "From an office", body: "Pick one of the team offices and claim a desk there. That desk is where you start each day.", color: "#FFD23F", icon: (c) => <IconOffice size={26} color={c} strokeWidth={1.8} /> },
];

export function ModeStep({ initial, onPick }: ModeStepProps) {
  const [mode, setMode] = useState<WorkMode | null>(initial);
  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "radial-gradient(900px 560px at 50% 40%, rgba(255,61,154,0.12), rgba(11,11,26,0) 70%)" }}>
      <section style={{ width: 600, display: "flex", flexDirection: "column", gap: 20, padding: 36, borderRadius: 30, background: "rgba(20,18,44,0.92)", border: "1px solid rgba(190,180,255,0.16)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)" }}>
        <Eyebrow>Step 1</Eyebrow>
        <h1 style={{ margin: 0, font: "700 40px/44px var(--font-display)", letterSpacing: "-0.03em" }}>
          Where do you <span style={{ color: "#FF3D9A" }}>work?</span>
        </h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: "23px", color: "#BDB8E6" }}>This decides where you appear on the globe and where you start when you come online. You can travel anywhere either way.</p>
        <div role="radiogroup" aria-label="Work mode" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {OPTIONS.map((o) => {
            const sel = mode === o.mode;
            return (
              <button
                key={o.mode}
                role="radio"
                aria-checked={sel}
                onClick={() => setMode(o.mode)}
                style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, padding: 18, borderRadius: 22, textAlign: "left", color: "#F4F2FF", background: sel ? `${o.color}1F` : "rgba(190,180,255,0.06)", border: `1.5px solid ${sel ? o.color : "rgba(190,180,255,0.16)"}`, boxShadow: sel ? `0 0 22px ${o.color}40` : undefined, cursor: "pointer" }}
              >
                <span style={{ width: 48, height: 48, borderRadius: 14, display: "grid", placeItems: "center", background: sel ? o.color : "rgba(190,180,255,0.1)" }}>{o.icon(sel ? "#0B0B1A" : o.color)}</span>
                <span style={{ font: "700 18px var(--font-display)" }}>{o.title}</span>
                <span style={{ fontSize: 13, lineHeight: "19px", color: "#BDB8E6" }}>{o.body}</span>
              </button>
            );
          })}
        </div>
        <Button height={56} disabled={!mode} onClick={() => mode && onPick(mode)}>
          {mode === "home" ? "Pick my home area" : mode === "office" ? "Pick my office" : "Choose one to continue"}
        </Button>
      </section>
    </div>
  );
}
