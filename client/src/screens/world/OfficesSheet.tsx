import { useEffect, useState } from "react";
import { officeForUnit, type UnitId } from "@orbit/shared";
import { useWorld } from "../../state/world.ts";
import { useSession } from "../../state/session.ts";
import { useUI } from "../../state/ui.ts";
import { IconOffice } from "../../ui/Icons.tsx";
import { CONTROL_BOTTOM, CONTROL_H } from "../../ui/primitives.tsx";
import { formatLocalTime } from "../onboarding/places.ts";

export interface OfficesSheetProps {
  onPick: (unitId: UnitId) => void;
}

/** Quick travel: every office except the one you are in right now. */
export function OfficesSheet({ onPick }: OfficesSheetProps) {
  const offices = useWorld((s) => s.offices);
  const users = useWorld((s) => s.users);
  const me = useSession((s) => s.me);
  const setSheet = useUI((s) => s.setSheet);
  const [clock, setClock] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);
  const list = Object.values(offices)
    .filter((o) => o.unitId !== me?.currentUnit)
    .sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 25 }} onClick={() => setSheet("none")}>
      <section
        role="dialog"
        aria-label="Travel to an office"
        onClick={(e) => e.stopPropagation()}
        style={{ position: "absolute", left: "50%", bottom: CONTROL_BOTTOM + CONTROL_H + 14, transform: "translateX(-50%)", width: 360, display: "flex", flexDirection: "column", gap: 6, padding: 10, borderRadius: 24, background: "rgba(20,18,44,0.96)", border: "1px solid rgba(143,184,255,0.35)", boxShadow: "0 24px 60px rgba(0,0,0,0.6), 0 0 30px rgba(143,184,255,0.15)" }}
      >
        <div style={{ padding: "8px 10px 4px", font: "700 11px/14px var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "#8FB8FF" }}>Travel to an office</div>
        {list.length === 0 ? <p style={{ margin: 0, padding: "4px 10px 10px", fontSize: 13, color: "#8A84BA" }}>No other office to go to.</p> : null}
        {list.map((o) => {
          const def = officeForUnit(o.unitId);
          const there = Object.values(users).filter((u) => u.currentUnit === o.unitId && u.presence === "online").length;
          const mine = me?.officeUnit === o.unitId;
          return (
            <button
              key={o.unitId}
              onClick={() => onPick(o.unitId)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 16, border: 0, textAlign: "left", color: "#F4F2FF", background: "rgba(190,180,255,0.06)", cursor: "pointer" }}
            >
              <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 11, display: "grid", placeItems: "center", background: mine ? "#FFD23F" : "rgba(143,184,255,0.14)", color: mine ? "#0B0B1A" : "#8FB8FF" }}>
                <IconOffice size={18} />
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, minWidth: 0 }}>
                <span style={{ font: "700 14px var(--font-display)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {o.name}
                  {mine ? <span style={{ marginLeft: 8, fontSize: 11, color: "#FFD23F" }}>your desk</span> : null}
                </span>
                <span style={{ fontSize: 12, color: "#8A84BA" }}>
                  {def ? `${def.country} · ` : ""}
                  <span className="mono">{formatLocalTime(def?.tz ?? null, clock)}</span>
                </span>
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: there > 0 ? "#B6FF3B" : "#8A84BA", whiteSpace: "nowrap" }}>{there > 0 ? `${there} online` : "quiet"}</span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
