import { useEffect, useMemo, useRef, useState } from "react";
import { OFFICES, haversineKm, officeUnitId, unitCentre, type OfficeDef, type OfficeInfo, type PublicUser, type UnitId } from "@orbit/shared";
import { api } from "../../net/api.ts";
import { useSession } from "../../state/session.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { Button, Eyebrow } from "../../ui/primitives.tsx";
import { IconOffice } from "../../ui/Icons.tsx";
import { GlobeCanvas } from "../../world/globe/GlobeCanvas.tsx";
import { Anchor, GlobeOverlay } from "../../world/globe/Overlay.tsx";
import { useGlobe } from "../../world/globe/handle.ts";
import { loadLand } from "../../world/globe/land.ts";
import { H_ORBIT } from "../../world/globe/constants.ts";
import { formatLocalTime } from "./places.ts";

export interface OfficeStepProps {
  initialUnit: UnitId | null;
  stepLabel?: string;
  busy?: boolean;
  onConfirm: (unitId: UnitId) => void;
  onSkip?: () => void;
  onBack?: () => void;
}

const YELLOW = "#FFD23F";

export function OfficeStep({ initialUnit, stepLabel = "Step 2 of 4", busy, onConfirm, onSkip, onBack }: OfficeStepProps) {
  const globe = useGlobe();
  const homeUnit = useSession((s) => s.draft.homeUnit);
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    if (initialUnit) {
      const match = OFFICES.find((o) => officeUnitId(o) === initialUnit);
      if (match) return match.id;
    }
    if (homeUnit) {
      const from = unitCentre(homeUnit);
      let best: OfficeDef | null = null;
      let bestKm = Infinity;
      for (const o of OFFICES) {
        const km = haversineKm(from, unitCentre(officeUnitId(o)));
        if (km < bestKm) {
          bestKm = km;
          best = o;
        }
      }
      return best?.id ?? null;
    }
    return OFFICES[0]?.id ?? null;
  });
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [offices, setOffices] = useState<Record<UnitId, OfficeInfo>>({});
  const [clock, setClock] = useState(() => new Date());
  const initialised = useRef(false);

  useEffect(() => {
    void loadLand();
    let alive = true;
    api
      .world()
      .then((w) => {
        if (!alive) return;
        setUsers(w.users);
        setOffices(Object.fromEntries(w.offices.map((o) => [o.unitId, o])));
      })
      .catch(() => undefined);
    const t = window.setInterval(() => setClock(new Date()), 30000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, []);

  const selected = useMemo(() => OFFICES.find((o) => o.id === selectedId) ?? null, [selectedId]);
  const selectedUnit = selected ? officeUnitId(selected) : null;
  const selectedCentre = selectedUnit ? unitCentre(selectedUnit) : null;

  const showOnGlobe = (o: OfficeDef, animate: boolean) => {
    if (!globe) return;
    const unitId = officeUnitId(o);
    const c = unitCentre(unitId);
    globe.setHighlights([{ unitId, color: 0xffd23f, opacity: 0.5, pulse: true }]);
    globe.setPoints([{ id: "office", lat: c.lat, lng: c.lng }]);
    if (animate) void globe.flyTo(c, { h: 140, ms: 900 });
    else globe.jumpTo(c, H_ORBIT);
  };

  useEffect(() => {
    if (!globe || initialised.current) return;
    initialised.current = true;
    if (selected) showOnGlobe(selected, false);
    else globe.jumpTo({ lat: 20, lng: 20 }, H_ORBIT);
  }, [globe]);

  const pick = (o: OfficeDef) => {
    setSelectedId(o.id);
    showOnGlobe(o, true);
  };

  const workersOf = (unitId: UnitId) => users.filter((u) => u.officeUnit === unitId);
  const selectedOpen = !!selectedUnit && !!offices[selectedUnit];
  const canConfirm = !!selectedUnit && selectedOpen && !busy;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <GlobeCanvas shiftX={0.17} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(90deg, rgba(11,11,26,0.92) 0%, rgba(11,11,26,0.55) 33%, rgba(11,11,26,0) 52%)" }} />
      <GlobeOverlay>
        {selected && selectedCentre ? (
          <Anchor id="office">
            <div style={{ position: "absolute", left: -46, top: -28, width: 92, height: 56, borderRadius: "50%", border: `2px solid ${YELLOW}`, animation: "ping-wide 2s ease-out infinite" }} />
            <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: YELLOW, boxShadow: `0 0 14px ${YELLOW}` }} />
            <div style={{ position: "absolute", left: -1, top: -24, width: 2, height: 22, background: `linear-gradient(rgba(255,210,63,0), ${YELLOW})` }} />
            <div style={{ position: "absolute", left: 0, top: -30, transform: "translate(-50%, -100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 12px", borderRadius: 14, background: "rgba(20,18,44,0.9)", border: "1px solid rgba(255,210,63,0.55)", whiteSpace: "nowrap" }}>
              <span style={{ font: "600 13px var(--font-display)" }}>{selected.name} office</span>
              <span style={{ font: "12px/16px var(--font-mono)", color: "#BDB8E6" }}>{formatLocalTime(selected.tz, clock)}</span>
            </div>
          </Anchor>
        ) : null}
      </GlobeOverlay>

      <section style={{ position: "absolute", left: 48, top: 130, width: 420, display: "flex", flexDirection: "column", gap: 22, pointerEvents: "auto" }}>
        <Eyebrow color={YELLOW}>{stepLabel}</Eyebrow>
        <h1 style={{ margin: 0, font: "700 46px/50px var(--font-display)", letterSpacing: "-0.03em" }}>
          Which <span style={{ color: YELLOW }}>office</span> do you work in?
        </h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: "24px", color: "#BDB8E6" }}>Offices are set up by your admin. Pick yours, then claim a desk there. That desk is where you start each day.</p>
        <ul role="listbox" aria-label="Offices" style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
          {OFFICES.map((o) => {
            const unitId = officeUnitId(o);
            const isSel = o.id === selectedId;
            const open = !!offices[unitId];
            const workers = workersOf(unitId);
            return (
              <li key={o.id}>
                <button
                  role="option"
                  aria-selected={isSel}
                  onClick={() => pick(o)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 14px",
                    borderRadius: 18,
                    textAlign: "left",
                    color: "#F4F2FF",
                    background: isSel ? "rgba(255,210,63,0.12)" : "rgba(20,18,44,0.9)",
                    border: `1.5px solid ${isSel ? YELLOW : "rgba(190,180,255,0.16)"}`,
                    boxShadow: isSel ? "0 0 20px rgba(255,210,63,0.22)" : undefined,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, display: "grid", placeItems: "center", background: isSel ? YELLOW : "rgba(190,180,255,0.1)", color: isSel ? "#0B0B1A" : "#BDB8E6" }}>
                    <IconOffice size={20} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, minWidth: 0 }}>
                    <span style={{ font: "700 15px var(--font-display)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.name}</span>
                    <span style={{ fontSize: 12, color: "#8A84BA" }}>
                      {o.country} · <span className="mono">{formatLocalTime(o.tz, clock)}</span>
                    </span>
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ display: "flex" }}>
                      {workers.slice(0, 3).map((u, i) => (
                        <span key={u.id} style={{ marginLeft: i === 0 ? 0 : -8, display: "inline-flex" }}>
                          <Avatar spec={u.avatar} size={24} presence={u.presence} />
                        </span>
                      ))}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: !open ? "#FF7BBA" : workers.length > 0 ? "#B6FF3B" : "#8A84BA", whiteSpace: "nowrap" }}>
                      {!open ? "Opening soon" : workers.length === 0 ? "Nobody yet" : `${workers.length} ${workers.length === 1 ? "person" : "people"}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div style={{ display: "flex", gap: 10 }}>
          {onBack ? (
            <Button variant="secondary" height={56} onClick={onBack} disabled={busy}>
              Back
            </Button>
          ) : null}
          {onSkip ? (
            <Button variant="secondary" height={56} grow onClick={onSkip} disabled={busy}>
              {busy ? "Entering…" : "Skip for now"}
            </Button>
          ) : null}
          <Button variant="yellow" height={56} grow disabled={!canConfirm} onClick={() => selectedUnit && onConfirm(selectedUnit)}>
            {selected ? "Use this office" : "Pick an office"}
          </Button>
        </div>
        <span style={{ fontSize: 12, color: "#8A84BA" }}>You can still travel to any other office whenever you like.</span>
      </section>
    </div>
  );
}
