import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { haversineKm, unitCentre, type PublicUser, type UnitId } from "@orbit/shared";
import { useGlobe } from "../../world/globe/handle.ts";
import { Anchor, onGlobeFrame } from "../../world/globe/Overlay.tsx";
import type { FrameData, TripSpec } from "../../world/globe/GlobeScene.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { IconOffice, IconPalm, IconPlane } from "../../ui/Icons.tsx";
import { serverNow, useSession } from "../../state/session.ts";
import { useView } from "../../state/view.ts";
import { useUI } from "../../state/ui.ts";
import { useUnitMarkers, type UnitMarker } from "./useMarkers.ts";
import { useWorld } from "../../state/world.ts";
import { CarSprite, PlaneSprite } from "./VehicleSprites.tsx";

interface Cluster {
  key: string;
  anchor: UnitId;
  members: UnitMarker[];
}

const JOIN_PAD = 4;
const KEEP_PAD = 14;

type Pt = { m: UnitMarker; p: { x: number; y: number } };

function boxOf(m: UnitMarker): { l: number; r: number; t: number; b: number } {
  if (m.isMine) return { l: -20, r: m.users.length > 1 ? 48 : 20, t: -54, b: 6 };
  if (m.users.length === 1) return { l: -14, r: 14, t: -40, b: 5 };
  return { l: -42, r: 42, t: -40, b: 5 };
}

function touches(a: Pt, b: Pt, pad: number): boolean {
  const A = boxOf(a.m);
  const B = boxOf(b.m);
  return a.p.x + A.l - pad < b.p.x + B.r && b.p.x + B.l - pad < a.p.x + A.r && a.p.y + A.t - pad < b.p.y + B.b && b.p.y + B.t - pad < a.p.y + A.b;
}

function clusterize(f: FrameData, markers: UnitMarker[], myUnit: UnitId | null, prev: Cluster[]): Cluster[] {
  const pts = markers
    .map((m) => ({ m, p: f.points.get(`unit:${m.unitId}`) }))
    .filter((x) => x.p && x.p.visible && x.m.users.length > 0) as Pt[];
  const used = new Set<UnitId>();
  const out: Cluster[] = [];
  for (const c of prev) {
    if (c.members.length < 2) continue;
    const live = c.members.map((m) => pts.find((x) => x.m.unitId === m.unitId)).filter(Boolean) as Pt[];
    if (live.length !== c.members.length) continue;
    if (live.every((a) => live.some((b) => b !== a && touches(a, b, KEEP_PAD)))) {
      out.push({ key: c.key, anchor: c.anchor, members: live.map((x) => x.m) });
      live.forEach((x) => used.add(x.m.unitId));
    }
  }
  for (const a of pts) {
    if (used.has(a.m.unitId)) continue;
    const group = [a];
    for (let i = 0; i < group.length; i++) {
      for (const b of pts) {
        if (group.includes(b) || used.has(b.m.unitId)) continue;
        if (touches(group[i], b, JOIN_PAD)) group.push(b);
      }
    }
    if (group.length < 2) continue;
    const cx = group.reduce((s, g) => s + g.p.x, 0) / group.length;
    const cy = group.reduce((s, g) => s + g.p.y, 0) / group.length;
    let anchor = group.find((g) => g.m.unitId === myUnit) ?? group[0];
    let best = anchor.m.unitId === myUnit ? -1 : Infinity;
    for (const g of group) {
      if (best < 0) break;
      const d = Math.hypot(g.p.x - cx, g.p.y - cy);
      if (d < best) {
        best = d;
        anchor = g;
      }
    }
    const members = group.map((g) => g.m).sort((x, y) => x.unitId.localeCompare(y.unitId));
    group.forEach((g) => used.add(g.m.unitId));
    out.push({ key: members.map((m) => m.unitId).join("|"), anchor: anchor.m.unitId, members });
  }
  return out;
}

function Stem({ color, height, top }: { color: string; height: number; top: number }) {
  return <div style={{ position: "absolute", left: -1.5, top, width: 3, height, borderRadius: 2, background: `linear-gradient(${color}55, ${color})`, boxShadow: `0 0 6px ${color}99` }} />;
}

function Chip({ users, count, border, glow, countColor, children, size = 22 }: { users: PublicUser[]; count: number | string; border: string; glow?: string; countColor?: string; children?: ReactNode; size?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "2px 9px 2px 2px", borderRadius: 999, background: "rgba(20,18,44,0.92)", border: `1.5px solid ${border}`, boxShadow: glow ? `0 0 18px ${glow}` : undefined, whiteSpace: "nowrap", color: "#F4F2FF" }}>
      {users.slice(0, 3).map((u, i) => (
        <div key={u.id} style={{ marginLeft: i === 0 ? 0 : -7 }}>
          <Avatar spec={u.avatar} size={size} presence="none" />
        </div>
      ))}
      {children}
      <span style={{ marginLeft: 6, font: "700 12px/16px var(--font-mono)", color: countColor ?? "#F4F2FF" }}>{count}</span>
    </div>
  );
}

export interface GlobeMarkersProps {
  onPeek: (unitId: UnitId) => void;
}

function PlaceTag({ icon, label, lifted = false, count = 0 }: { icon: ReactNode; label: string; lifted?: boolean; count?: number }) {
  return (
    <>
      <div style={{ position: "absolute", left: -5, top: -5, width: 10, height: 10, borderRadius: "50%", background: "#FFFFFF", boxShadow: "0 0 0 3px rgba(20,18,44,0.55)" }} />
      <div style={{ position: "absolute", left: -1, top: -26, width: 2, height: 22, background: "#FFFFFF", opacity: 0.9 }} />
      <div style={{ position: "absolute", left: 0, top: -24, transform: `translate(-50%, -100%)${lifted ? " translateY(-3px)" : ""}`, transition: "transform 160ms ease-out", display: "flex", alignItems: "center", gap: 6, padding: count > 0 ? "4px 4px 4px 12px" : "6px 12px", borderRadius: 999, background: "#FFFFFF", color: "#14122B", font: "700 13px var(--font-display)", whiteSpace: "nowrap", boxShadow: count > 0 ? "0 6px 16px rgba(8,6,30,0.45), 0 0 14px rgba(182,255,59,0.45)" : "0 6px 16px rgba(8,6,30,0.45)" }}>
        {icon}
        {label}
        {count > 0 ? <span style={{ marginLeft: 4, minWidth: 22, height: 22, padding: "0 6px", borderRadius: 999, background: "#B6FF3B", color: "#0B0B1A", font: "700 12px/22px var(--font-mono)", textAlign: "center" }}>{count}</span> : null}
      </div>
    </>
  );
}

export function GlobeMarkers({ onPeek }: GlobeMarkersProps) {
  const globe = useGlobe();
  const { markers, travelers, myUnit } = useUnitMarkers();
  const allUsers = useWorld((s) => s.users);
  const me = useSession((s) => s.me);
  const level = useView((s) => s.level);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const clustersRef = useRef<Cluster[]>([]);
  const [hover, setHover] = useState<UnitId | null>(null);
  const markersRef = useRef(markers);
  markersRef.current = markers;

  const sheet = useUI((s) => s.sheet);
  const travelTarget = useUI((s) => s.travelTarget);
  const travelDest = useMemo(() => {
    if (me?.travel) return { unitId: me.travel.toUnit, name: me.travel.toName };
    if (sheet === "travel" && travelTarget) return { unitId: travelTarget.unitId, name: travelTarget.name };
    return null;
  }, [me?.travel, sheet, travelTarget]);

  useEffect(() => {
    if (!globe) return;
    const pts = markers.map((m) => ({ id: `unit:${m.unitId}`, lat: m.lat, lng: m.lng }));
    if (travelDest) {
      const c = unitCentre(travelDest.unitId);
      pts.push({ id: "travel-dest", lat: c.lat, lng: c.lng });
    }
    globe.setPoints(pts);
  }, [globe, markers, travelDest]);


  const previewTrips = useUI((s) => s.previewTrips);

  useEffect(() => {
    if (!globe) return;
    const trips: TripSpec[] = travelers
      .filter((u) => u.travel && u.id !== me?.id)
      .map((u) => {
        const t = u.travel!;
        return { id: t.id, from: unitCentre(t.fromUnit), to: unitCentre(t.toUnit), mode: t.mode, startedAt: t.startedAt, durationMs: t.durationMs, distanceKm: t.distanceKm };
      });
    const now = serverNow();
    const previews: TripSpec[] = previewTrips.map((p) => ({ id: p.id, from: unitCentre(p.fromUnit), to: unitCentre(p.toUnit), mode: p.mode, startedAt: now, durationMs: p.durationMs, distanceKm: p.distanceKm, loop: true }));
    globe.setTrips([...trips, ...previews, ...(me?.travel ? [{ id: me.travel.id, from: unitCentre(me.travel.fromUnit), to: unitCentre(me.travel.toUnit), mode: me.travel.mode, startedAt: me.travel.startedAt, durationMs: me.travel.durationMs, distanceKm: me.travel.distanceKm }] : [])]);
  }, [globe, travelers, me?.travel, me?.id, previewTrips]);

  useEffect(() => {
    let lastSig = "";
    return onGlobeFrame((f) => {
      const next = clusterize(f, markersRef.current, myUnit, clustersRef.current);
      const sig = next.map((c) => c.key).join("#");
      if (sig !== lastSig) {
        lastSig = sig;
        clustersRef.current = next;
        setClusters(next);
      }
    });
  }, [myUnit]);

  const clustered = useMemo(() => new Set(clusters.flatMap((c) => c.members.map((m) => m.unitId))), [clusters]);
  const myMarker = markers.find((m) => m.isMine) ?? null;

  const hoverMarker = hover ? markers.find((m) => m.unitId === hover) ?? null : null;
  const hoverKm = hoverMarker && myUnit ? Math.round(haversineKm(unitCentre(myUnit), unitCentre(hoverMarker.unitId))) : null;
  const hoverWorkers = hoverMarker?.office ? Object.values(allUsers).filter((u) => u.officeUnit === hoverMarker.unitId).length : 0;

  return (
    <>
      {travelDest ? (
        <Anchor id="travel-dest" zIndex={7}>
          <PlaceTag icon={<IconPlane size={14} strokeWidth={2.2} />} label={travelDest.name} />
        </Anchor>
      ) : null}
      {markers.map((m) => {
        if (clustered.has(m.unitId)) return null;
        const others = m.users.filter((u) => u.id !== me?.id);
        const onlineOthers = others.filter((u) => u.presence === "online");
        if (m.isMine && me) {
          return (
            <Anchor key={m.unitId} id={`unit:${m.unitId}`} zIndex={5} interactive>
              <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#FFFFFF", boxShadow: "0 0 0 2.5px rgba(20,18,44,0.55)" }} />
              <div style={{ position: "absolute", left: -1, top: -21, width: 2, height: 19, background: "#FFFFFF", opacity: 0.9 }} />
              <div style={{ position: "absolute", left: -16, top: -52, cursor: "pointer" }} onClick={() => onPeek(m.unitId)} onMouseEnter={() => setHover(m.unitId)} onMouseLeave={() => setHover(null)}>
                <Avatar spec={me.avatar} size={32} presence="online" you accent="#FFFFFF" dot={false} />
              </div>
              {others.length > 0 ? (
                <button aria-label={`${others.length} more people near you`} onClick={() => onPeek(m.unitId)} style={{ position: "absolute", left: 21, top: -46, padding: "2px 7px", borderRadius: 999, background: "rgba(20,18,44,0.92)", border: "1px solid rgba(182,255,59,0.6)", font: "700 11px/14px var(--font-mono)", color: "#B6FF3B", cursor: "pointer" }}>
                  +{others.length}
                </button>
              ) : null}
            </Anchor>
          );
        }
        if (m.destination) {
          // Leisure destinations use the same place tag as offices, with a palm icon.
          if (travelDest?.unitId === m.unitId) return null;
          const online = onlineOthers.length;
          return (
            <Anchor key={m.unitId} id={`unit:${m.unitId}`} zIndex={online > 0 ? 3 : 2}>
              <PlaceTag icon={<IconPalm size={15} strokeWidth={2.1} color="#0E9F6E" />} label={m.name} lifted={hover === m.unitId} count={online} />
              <button
                aria-label={online > 0 ? `${m.name}, ${online} online. Peek at this destination` : `${m.name}, nobody there`}
                onClick={() => onPeek(m.unitId)}
                onMouseEnter={() => setHover(m.unitId)}
                onMouseLeave={() => setHover(null)}
                style={{ position: "absolute", left: -60, top: -64, width: 120, height: 70, border: 0, padding: 0, background: "transparent", cursor: "pointer", pointerEvents: "auto" }}
              />
            </Anchor>
          );
        }
        if (m.office) {
          // Offices always show as the office tag. Offline people are parked in their unit,
          // so only people who are actually online count towards the badge.
          if (travelDest?.unitId === m.unitId) return null;
          const online = onlineOthers.length;
          return (
            <Anchor key={m.unitId} id={`unit:${m.unitId}`} zIndex={online > 0 ? 3 : 2}>
              <PlaceTag icon={<IconOffice size={14} strokeWidth={2.2} />} label={m.name} lifted={hover === m.unitId} count={online} />
              <button
                aria-label={online > 0 ? `${m.name} office, ${online} online. Peek at this office` : `${m.name} office, nobody here`}
                onClick={() => onPeek(m.unitId)}
                onMouseEnter={() => setHover(m.unitId)}
                onMouseLeave={() => setHover(null)}
                style={{ position: "absolute", left: -60, top: -64, width: 120, height: 70, border: 0, padding: 0, background: "transparent", cursor: "pointer", pointerEvents: "auto" }}
              />
            </Anchor>
          );
        }
        if (m.users.length === 0) return null;
        if (m.online === 0) {
          const n = m.users.length;
          return (
            <Anchor key={m.unitId} id={`unit:${m.unitId}`} zIndex={2} interactive>
              <div style={{ position: "absolute", left: -3, top: -3, width: 6, height: 6, borderRadius: "50%", background: "#FFFFFF", boxShadow: "0 0 0 2px rgba(20,18,44,0.55)" }} />
              <div style={{ position: "absolute", left: -1, top: -16, width: 2, height: 14, background: "#FFFFFF", opacity: 0.85 }} />
              <button
                aria-label={`${n} ${n === 1 ? "person" : "people"} here, everyone offline. Peek at this area`}
                onClick={() => onPeek(m.unitId)}
                onMouseEnter={() => setHover(m.unitId)}
                onMouseLeave={() => setHover(null)}
                style={{ position: "absolute", left: 0, top: -14, transform: `translate(-50%, -100%)${hover === m.unitId ? " translateY(-2px)" : ""}`, transition: "transform 160ms ease-out", minWidth: 24, height: 24, padding: "0 7px", borderRadius: 999, border: "1.5px solid rgba(255,255,255,0.7)", background: "rgba(20,18,44,0.92)", color: "#FFFFFF", font: "700 12px/20px var(--font-mono)", cursor: "pointer", pointerEvents: "auto", boxShadow: "0 4px 12px rgba(8,6,30,0.45)" }}
              >
                {n}
              </button>
            </Anchor>
          );
        }
        if (m.users.length === 1) {
          const u = m.users[0];
          return (
            <Anchor key={m.unitId} id={`unit:${m.unitId}`} zIndex={2} interactive>
              <div style={{ position: "absolute", left: -2.5, top: -2.5, width: 5, height: 5, borderRadius: "50%", background: "#B6FF3B" }} />
              <Stem color="#B6FF3B" height={12} top={-14} />
              <div style={{ position: "absolute", left: -12, top: -38, cursor: "pointer" }} onClick={() => onPeek(m.unitId)} onMouseEnter={() => setHover(m.unitId)} onMouseLeave={() => setHover(null)}>
                <Avatar spec={u.avatar} size={24} presence={u.presence} />
              </div>
            </Anchor>
          );
        }
        const featured = onlineOthers.length >= 3 || level !== "orbit";
        return (
          <Anchor key={m.unitId} id={`unit:${m.unitId}`} zIndex={3} interactive>
            {featured ? <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#B6FF3B", animation: "ping 1.8s ease-out infinite" }} /> : null}
            <div style={{ position: "absolute", left: featured ? -3 : -2.5, top: featured ? -3 : -2.5, width: featured ? 6 : 5, height: featured ? 6 : 5, borderRadius: "50%", background: "#B6FF3B", boxShadow: featured ? "0 0 10px #B6FF3B" : undefined }} />
            <Stem color="#B6FF3B" height={featured ? 14 : 12} top={featured ? -16 : -14} />
            <button
              aria-label={`${m.users.length} people, ${m.online} online. Peek at this area`}
              onClick={() => onPeek(m.unitId)}
              onMouseEnter={() => setHover(m.unitId)}
              onMouseLeave={() => setHover(null)}
              style={{ position: "absolute", left: 0, bottom: featured ? 16 : 14, transform: "translateX(-50%)", border: 0, background: "transparent", padding: 0, cursor: "pointer" }}
            >
              <Chip users={m.users} count={m.users.length} border={featured ? "#B6FF3B" : "rgba(182,255,59,0.6)"} glow={featured ? "rgba(182,255,59,0.45)" : undefined} countColor={featured ? "#B6FF3B" : "#F4F2FF"} size={featured ? 22 : 20} />
            </button>
          </Anchor>
        );
      })}
      {clusters.map((c) => {
        const users = c.members.flatMap((m) => m.users);
        const ordered = [...users].sort((a, b) => (a.id === me?.id ? -1 : b.id === me?.id ? 1 : 0) || (a.presence === "online" ? 0 : 1) - (b.presence === "online" ? 0 : 1));
        const online = users.filter((u) => u.presence === "online").length;
        return (
          <Anchor key={c.key} id={`unit:${c.anchor}`} zIndex={6}>
            <div style={{ position: "absolute", left: -5, top: -5, width: 10, height: 10, borderRadius: "50%", background: "#FFFFFF", boxShadow: "0 0 0 3px rgba(20,18,44,0.55)" }} />
            <div style={{ position: "absolute", left: -1, top: -26, width: 2, height: 22, background: "#FFFFFF", opacity: 0.9 }} />
            <button
              aria-label={`${users.length} people here, ${online} online`}
              onClick={() => onPeek(c.anchor)}
              onMouseEnter={() => setHover(c.anchor)}
              onMouseLeave={() => setHover(null)}
              style={{ position: "absolute", left: 0, top: -24, transform: `translate(-50%, -100%)${hover === c.anchor ? " translateY(-3px)" : ""}`, transition: "transform 160ms ease-out", display: "flex", alignItems: "center", gap: 8, padding: "4px 12px 4px 4px", borderRadius: 999, border: 0, background: "#FFFFFF", color: "#14122B", font: "700 13px var(--font-display)", whiteSpace: "nowrap", boxShadow: "0 6px 16px rgba(8,6,30,0.45)", cursor: "pointer", pointerEvents: "auto" }}
            >
              <span style={{ display: "flex" }}>
                {ordered.slice(0, 3).map((u, i) => (
                  <span key={u.id} style={{ marginLeft: i === 0 ? 0 : -8, borderRadius: "50%", boxShadow: "0 0 0 2px #FFFFFF", display: "flex" }}>
                    <Avatar spec={u.avatar} size={22} presence="none" />
                  </span>
                ))}
              </span>
              {users.length} people here
            </button>
          </Anchor>
        );
      })}
      {hoverMarker && !hoverMarker.isMine ? (
        <Anchor id={`unit:${hoverMarker.unitId}`} zIndex={10} offsetX={0} offsetY={0}>
          <div style={{ position: "absolute", left: 24, top: 8, width: 216, display: "flex", flexDirection: "column", gap: 10, padding: 14, borderRadius: 18, background: "rgba(20,18,44,0.94)", border: "1px solid rgba(182,255,59,0.45)", boxShadow: "0 0 30px rgba(182,255,59,0.18), 0 18px 50px rgba(0,0,0,0.55)", pointerEvents: "none" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span style={{ font: "700 14px var(--font-display)" }}>{hoverMarker.name}</span>
              {hoverKm !== null ? <span style={{ font: "12px var(--font-mono)", color: "#8A84BA" }}>{hoverKm.toLocaleString()} km</span> : null}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ font: "700 22px var(--font-display)", color: "#B6FF3B" }}>{hoverMarker.online}</span>
              <span style={{ color: "#BDB8E6" }}>{hoverMarker.office ? `online · ${hoverWorkers} ${hoverWorkers === 1 ? "works" : "work"} here` : hoverMarker.destination ? "online there right now" : `online of ${hoverMarker.users.length}`}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#FF3D9A" }}>Click to peek →</span>
          </div>
        </Anchor>
      ) : null}
      <TripsOverlay />
    </>
  );
}

function TripsOverlay() {
  const svgRef = useRef<SVGSVGElement>(null);
  const globe = useGlobe();
  const [tripIds, setTripIds] = useState<Array<{ id: string; mode: "car" | "flight"; mine: boolean; preview: boolean }>>([]);
  const me = useSession((s) => s.me);
  const previewTrips = useUI((s) => s.previewTrips);
  const spriteRefs = useRef(new Map<string, HTMLDivElement>());
  const pathRefs = useRef(new Map<string, SVGPathElement>());
  const trips = useUnitMarkers().travelers;

  useEffect(() => {
    const list = trips.filter((u) => u.travel && u.id !== me?.id).map((u) => ({ id: u.travel!.id, mode: u.travel!.mode, mine: false, preview: false }));
    for (const p of previewTrips) list.push({ id: p.id, mode: p.mode, mine: true, preview: true });
    if (me?.travel) list.push({ id: me.travel.id, mode: me.travel.mode, mine: true, preview: false });
    setTripIds(list);
  }, [trips, me?.travel, me?.id, previewTrips]);

  useEffect(() => {
    if (!globe) return;
    return globe.subscribe((f) => {
      for (const [id, path] of pathRefs.current) {
        const tf = f.trips.get(id);
        if (!tf) {
          path.setAttribute("d", "");
          continue;
        }
        let d = "";
        let pen = false;
        for (let i = 0; i < tf.n; i++) {
          const x = tf.path[i * 3];
          const y = tf.path[i * 3 + 1];
          const vis = tf.path[i * 3 + 2] > 0.5;
          if (!vis) {
            pen = false;
            continue;
          }
          d += (pen ? " L" : " M") + x.toFixed(1) + " " + y.toFixed(1);
          pen = true;
        }
        path.setAttribute("d", d);
      }
      for (const [id, el] of spriteRefs.current) {
        const tf = f.trips.get(id);
        if (!tf || !tf.vehicle.visible) {
          el.style.visibility = "hidden";
          continue;
        }
        el.style.visibility = "visible";
        el.style.transform = `translate3d(${tf.vehicle.x.toFixed(1)}px, ${tf.vehicle.y.toFixed(1)}px, 0) rotate(${tf.angle.toFixed(1)}deg)`;
      }
    });
  }, [globe]);

  return (
    <>
      <svg ref={svgRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible" }} aria-hidden>
        {tripIds.map((t) => {
          const car = t.mode === "car";
          const mineCar = t.mine && car;
          return (
            <path
              key={t.id}
              ref={(el) => {
                if (el) pathRefs.current.set(t.id, el);
                else pathRefs.current.delete(t.id);
              }}
              fill="none"
              stroke={mineCar ? "#FF7BBA" : car ? "#22E3FF" : "#FFFFFF"}
              strokeWidth={mineCar ? 3 : t.mine ? 2 : 1.6}
              strokeDasharray={mineCar ? "10 8" : t.mine ? "3 8" : "3 6"}
              strokeOpacity={t.mine ? 0.9 : 0.8}
              strokeLinecap="round"
              style={mineCar ? { filter: "drop-shadow(0 0 6px rgba(255,61,154,0.8))" } : undefined}
            >
              <animate attributeName="stroke-dashoffset" values={mineCar ? "0;-36" : "0;-18"} dur={mineCar ? "1.2s" : "1s"} repeatCount="indefinite" />
            </path>
          );
        })}
      </svg>
      {tripIds.filter((t) => !t.preview).map((t) => (
        <div
          key={t.id}
          ref={(el) => {
            if (el) spriteRefs.current.set(t.id, el);
            else spriteRefs.current.delete(t.id);
          }}
          style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, visibility: "hidden", willChange: "transform", zIndex: 6 }}
        >
          {t.mode === "flight" ? <PlaneSprite scale={t.mine ? 0.5 : 0.32} pink={t.mine} /> : <CarSprite scale={t.mine ? 0.36 : 0.22} pink={t.mine} />}
        </div>
      ))}
    </>
  );
}
