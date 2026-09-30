import { useEffect, useState } from "react";
import { easeFraction, tripProgress, type TravelState } from "@orbit/shared";
import { serverNow, useSession } from "../../state/session.ts";
import { useWorld } from "../../state/world.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { IconCar, IconPlane } from "../../ui/Icons.tsx";

const PINK = "#FF3D9A";
const YELLOW = "#FFD23F";

export function TripHud({ travel }: { travel: TravelState }) {
  const me = useSession((s) => s.me);
  const offices = useWorld((s) => s.offices);
  const destinations = useWorld((s) => s.destinations);
  const [now, setNow] = useState(serverNow());
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setNow(serverNow());
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  if (!me) return null;
  const t = Math.max(0, Math.min(1, (now - travel.startedAt) / travel.durationMs));
  const s = tripProgress(t, easeFraction(travel.durationMs));
  const pct = Math.round(s * 100);
  const kmToGo = Math.max(0, Math.round(travel.distanceKm * (1 - s)));
  const secondsLeft = Math.max(0, Math.ceil((travel.startedAt + travel.durationMs - now) / 1000));
  const car = travel.mode === "car";
  const fromName = offices[travel.fromUnit]?.name ?? destinations.find((d) => d.unitId === travel.fromUnit)?.name ?? (travel.fromUnit === me.homeUnit ? "home" : "your area");
  const landing = !car && s > 0.85;
  const Icon = car ? IconCar : IconPlane;

  return (
    <div
      role="status"
      aria-label={`${car ? "Driving" : "Flying"} to ${travel.toName}, ${pct}% of the way, ${secondsLeft} seconds left`}
      style={{ position: "absolute", left: "50%", top: car ? 84 : 28, transform: "translateX(-50%)", width: "min(680px, calc(100% - 64px))", display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 18, padding: "12px 18px 12px 12px", borderRadius: 26, background: "linear-gradient(180deg, rgba(28,24,60,0.94), rgba(20,18,44,0.94))", border: "1px solid rgba(255,61,154,0.35)", boxShadow: "0 18px 50px rgba(0,0,0,0.5), 0 0 40px rgba(255,61,154,0.16), inset 0 1px 0 rgba(255,255,255,0.06)", zIndex: 22 }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar spec={me.avatar} size={40} presence="traveling" you />
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 120 }}>
          <span style={{ font: "700 15px var(--font-display)", whiteSpace: "nowrap" }}>
            {car ? "Driving to " : "Flying to "}
            <span style={{ color: YELLOW }}>{travel.toName}</span>
          </span>
          <span style={{ fontSize: 12, color: "#8A84BA", whiteSpace: "nowrap" }}>
            from {fromName} · <span className="mono">{travel.distanceKm.toLocaleString()}</span> km
          </span>
        </div>
      </div>

      <div style={{ position: "relative", height: 30, display: "flex", alignItems: "center" }}>
        <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Trip progress" style={{ position: "absolute", left: 6, right: 6, height: 6, borderRadius: 999, background: "rgba(190,180,255,0.14)", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${pct}%`, borderRadius: 999, background: `linear-gradient(90deg, ${PINK}, ${YELLOW})`, boxShadow: `0 0 12px ${PINK}88` }} />
        </div>
        <span style={{ position: "absolute", left: 3, width: 6, height: 6, borderRadius: "50%", background: PINK }} />
        <span style={{ position: "absolute", right: 3, width: 6, height: 6, borderRadius: "50%", background: pct >= 99 ? YELLOW : "rgba(255,210,63,0.45)", boxShadow: pct >= 99 ? `0 0 10px ${YELLOW}` : undefined }} />
        <span style={{ position: "absolute", left: `calc(6px + ${s} * (100% - 12px))`, transform: "translateX(-50%)", width: 28, height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "#14122B", border: `2px solid ${YELLOW}`, color: YELLOW, boxShadow: `0 0 14px ${YELLOW}66` }}>
          <Icon size={15} strokeWidth={2.2} />
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, minWidth: 96 }}>
        <span style={{ font: "700 22px/26px var(--font-mono)", color: YELLOW, letterSpacing: "-0.02em" }}>
          {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
        </span>
        <span style={{ fontSize: 12, color: landing ? "#B6FF3B" : "#BDB8E6", whiteSpace: "nowrap" }}>
          {landing ? "landing soon" : <><span className="mono">{kmToGo.toLocaleString()}</span> km to go</>}
        </span>
      </div>
    </div>
  );
}
