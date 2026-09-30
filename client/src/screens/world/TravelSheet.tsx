import { useEffect, useMemo, useState } from "react";
import { canDrive, haversineKm, midpoint, travelDurationMs, unitCentre, type TravelMode } from "@orbit/shared";
import { useSession } from "../../state/session.ts";
import { useUI, toast } from "../../state/ui.ts";
import { requestTravel } from "../../net/socket.ts";
import { Button, CONTROL_BOTTOM, Keycap } from "../../ui/primitives.tsx";
import { IconPlane } from "../../ui/Icons.tsx";
import { useGlobe } from "../../world/globe/handle.ts";
import { landSync, loadLand } from "../../world/globe/land.ts";

export function TravelSheet({ onDepart }: { onDepart: () => void }) {
  const me = useSession((s) => s.me);
  const target = useUI((s) => s.travelTarget);
  const setSheet = useUI((s) => s.setSheet);
  const setPreviewTrips = useUI((s) => s.setPreviewTrips);
  const globe = useGlobe();
  const [landReady, setLandReady] = useState(!!landSync());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void loadLand().then(() => setLandReady(true));
  }, []);

  const info = useMemo(() => {
    if (!me?.currentUnit || !target) return null;
    const from = unitCentre(me.currentUnit);
    const to = unitCentre(target.unitId);
    const km = haversineKm(from, to);
    const land = landSync();
    const same = land ? land.landmassIndex(from.lat, from.lng) >= 0 && land.landmassIndex(from.lat, from.lng) === land.landmassIndex(to.lat, to.lng) : true;
    return { from, to, km, carOk: canDrive(km, same), carMs: travelDurationMs("car", km), flightMs: travelDurationMs("flight", km), water: !same };
  }, [me?.currentUnit, target, landReady]);

  const mode: TravelMode = "flight";

  useEffect(() => {
    if (!globe || !info || !me?.currentUnit || !target) return;
    const h = Math.max(320, Math.min(4200, info.km * 1.35));
    void globe.flyTo(midpoint(info.from, info.to), { h, ms: 900 });
    const now = Date.now();
    setPreviewTrips([
      { id: "preview-flight", fromUnit: me.currentUnit, toUnit: target.unitId, mode: "flight" as const, distanceKm: info.km, durationMs: 2600 },
    ]);
    return () => setPreviewTrips([]);
  }, [globe, info, me?.currentUnit, target?.unitId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") void depart();
      if (e.key === "Escape") setSheet("none");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!me || !target || !info) return null;

  const depart = async () => {
    if (busy) return;
    setBusy(true);
    const res = await requestTravel({ mode, to: target.destId ? { destId: target.destId } : target.homeOf ? { homeOf: target.homeOf } : { unitId: target.unitId } });
    setBusy(false);
    if (!res.ok) {
      toast(res.code === "car_not_possible" ? "Car is off across water or over 1,500 km" : res.code === "already_traveling" ? "You are already traveling" : "Cannot travel there", "error");
      return;
    }
    setSheet("none");
    onDepart();
  };

  const fmt = (ms: number) => `${Math.round(ms / 1000)} s`;

  return (
    <section role="dialog" aria-label={`Travel to ${target.name}`} style={{ position: "absolute", left: 32, bottom: CONTROL_BOTTOM, width: 400, display: "flex", flexDirection: "column", gap: 16, padding: 22, borderRadius: 26, background: "rgba(20,18,44,0.92)", border: "1px solid rgba(190,180,255,0.16)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", backdropFilter: "blur(18px)", zIndex: 25 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ font: "700 11px/14px var(--font-mono)", letterSpacing: "0.1em", color: "#FFD23F" }}>TRAVEL · {Math.round(info.km).toLocaleString()} KM</span>
        <h1 style={{ margin: 0, font: "700 26px/30px var(--font-display)", letterSpacing: "-0.03em" }}>Fly to {target.name}</h1>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 18, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}>
        <span style={{ width: 40, height: 40, borderRadius: 12, background: "#FFFFFF", color: "#14122B", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <IconPlane size={22} strokeWidth={2} />
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1 }}>
          <span style={{ font: "700 15px var(--font-display)" }}>Flight</span>
          <span style={{ fontSize: 12, color: "#BDB8E6" }}>Everyone sees you moving until you land.</span>
        </span>
        <span style={{ font: "700 22px var(--font-mono)", color: "#F4F2FF", whiteSpace: "nowrap", flexShrink: 0 }}>{fmt(info.flightMs)}</span>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <Button variant="secondary" height={50} onClick={() => setSheet("none")}>
          Cancel
        </Button>
        <Button height={50} grow disabled={busy} onClick={() => void depart()}>
          {busy ? "Departing…" : "Take the flight"} <Keycap>↵</Keycap>
        </Button>
      </div>
    </section>
  );
}
