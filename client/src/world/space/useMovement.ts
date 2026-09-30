import { useEffect, useMemo, useRef } from "react";
import { CONFIG, SPEED_UNITS_PER_S, buildWalkGrid, deskZoneId, isWalkable, type Position, type SpaceLayout, type ZoneDef, type ZoneId } from "@orbit/shared";
import { requestZoneEnter, requestZoneLeave, sendPos } from "../../net/socket.ts";
import { useSpace } from "../../state/space.ts";
import { findPath } from "./pathfinding.ts";

export interface MovementHandle {
  pos: React.MutableRefObject<Position>;
  path: React.MutableRefObject<Array<{ x: number; y: number }>>;
  walkTo(x: number, y: number): void;
  stop(): void;
  onFrame(cb: (pos: Position, dt: number) => void): () => void;
}

export interface MovementOptions {
  layout: SpaceLayout;
  initial: Position;
  myDeskId: string | null;
  enabled: boolean;
  onZoneEnter?: (zone: ZoneDef, members: string[]) => void;
  onZoneLeave?: (zone: ZoneDef) => void;
  onZoneRefused?: (zone: ZoneDef, code: string) => void;
}

const KEYS: Record<string, [number, number]> = {
  w: [0, -1],
  a: [-1, 0],
  s: [0, 1],
  d: [1, 0],
  arrowup: [0, -1],
  arrowleft: [-1, 0],
  arrowdown: [0, 1],
  arrowright: [1, 0],
};

export function useMovement(opts: MovementOptions): MovementHandle {
  const { layout, initial, myDeskId, enabled } = opts;
  const grid = useMemo(() => buildWalkGrid(layout), [layout]);
  const pos = useRef<Position>({ ...initial });
  const path = useRef<Array<{ x: number; y: number }>>([]);
  const keys = useRef(new Set<string>());
  const vel = useRef({ x: 0, y: 0 });
  const listeners = useRef(new Set<(pos: Position, dt: number) => void>());
  const zoneRef = useRef<ZoneId | null>(null);
  const pendingZone = useRef<ZoneId | null>(null);
  const lastSent = useRef(0);
  const wasMoving = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    pos.current = { ...initial };
    path.current = [];
  }, [layout.id]);

  useEffect(() => {
    if (!enabled) return;
    const down = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      const k = e.key.toLowerCase();
      if (KEYS[k]) {
        keys.current.add(k);
        path.current = [];
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      keys.current.clear();
    };
  }, [enabled]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const speed = SPEED_UNITS_PER_S;
    const accel = speed / (CONFIG.movement.easeInMs / 1000);
    const avoidR = CONFIG.movement.avoidRadiusM * CONFIG.movement.unitsPerMetre;
    const myZoneDesk = myDeskId ? deskZoneId(myDeskId) : null;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      const p = pos.current;
      let dx = 0;
      let dy = 0;
      for (const k of keys.current) {
        const d = KEYS[k];
        if (d) {
          dx += d[0];
          dy += d[1];
        }
      }
      if (dx === 0 && dy === 0 && path.current.length) {
        const target = path.current[0];
        const tx = target.x - p.x;
        const ty = target.y - p.y;
        const dist = Math.hypot(tx, ty);
        if (dist < 6) {
          path.current.shift();
          if (!path.current.length) {
            p.x = target.x;
            p.y = target.y;
          }
        } else {
          dx = tx / dist;
          dy = ty / dist;
        }
      }
      const len = Math.hypot(dx, dy);
      if (len > 0) {
        dx /= len;
        dy /= len;
        vel.current.x = approach(vel.current.x, dx * speed, accel * dt);
        vel.current.y = approach(vel.current.y, dy * speed, accel * dt);
      } else {
        vel.current.x = approach(vel.current.x, 0, accel * dt * 2);
        vel.current.y = approach(vel.current.y, 0, accel * dt * 2);
      }
      const moving = Math.hypot(vel.current.x, vel.current.y) > 2;
      if (moving) {
        const nx = p.x + vel.current.x * dt;
        const ny = p.y + vel.current.y * dt;
        if (isWalkable(layout, nx, ny)) {
          p.x = nx;
          p.y = ny;
        } else if (isWalkable(layout, nx, p.y)) {
          p.x = nx;
          vel.current.y = 0;
        } else if (isWalkable(layout, p.x, ny)) {
          p.y = ny;
          vel.current.x = 0;
        } else {
          vel.current.x = 0;
          vel.current.y = 0;
          path.current = [];
        }
        p.dir = Math.atan2(vel.current.y, vel.current.x);
        const others = useSpace.getState().positions;
        for (const [id, o] of Object.entries(others)) {
          if (id === "me") continue;
          const ox = p.x - o.x;
          const oy = p.y - o.y;
          const d = Math.hypot(ox, oy);
          if (d > 0.01 && d < avoidR) {
            const push = (avoidR - d) * 0.5;
            const cx = p.x + (ox / d) * push;
            const cy = p.y + (oy / d) * push;
            if (isWalkable(layout, cx, cy)) {
              p.x = cx;
              p.y = cy;
            }
          }
        }
      }
      p.moving = moving;
      const sendGap = 1000 / CONFIG.movement.posRateHz;
      if (moving && now - lastSent.current > sendGap) {
        lastSent.current = now;
        sendPos({ x: p.x, y: p.y, dir: p.dir, moving: true });
      } else if (!moving && wasMoving.current) {
        lastSent.current = now;
        sendPos({ x: p.x, y: p.y, dir: p.dir, moving: false });
      }
      wasMoving.current = moving;

      const zones = useSpace.getState().zones;
      const current = zoneRef.current;
      if (current) {
        const def = layout.zones.find((z) => z.id === current);
        const open = zones[current]?.open ?? def?.kind !== "desk";
        const d = def ? Math.hypot(p.x - def.x, p.y - def.y) : Infinity;
        if (!def || !open || d > def.r * CONFIG.zones.exitFactor) {
          zoneRef.current = null;
          useSpace.getState().setMyZone(null);
          if (open) requestZoneLeave(current);
          if (def) optsRef.current.onZoneLeave?.(def);
        }
      }
      if (!zoneRef.current && !pendingZone.current) {
        let best: ZoneDef | null = null;
        let bestD = Infinity;
        for (const z of layout.zones) {
          if (z.id === myZoneDesk) continue;
          const open = zones[z.id]?.open ?? z.kind !== "desk";
          if (!open) continue;
          const d = Math.hypot(p.x - z.x, p.y - z.y);
          if (d <= z.r && d < bestD) {
            best = z;
            bestD = d;
          }
        }
        if (best) {
          const target = best;
          pendingZone.current = target.id;
          void requestZoneEnter(target.id).then((ack) => {
            pendingZone.current = null;
            if (ack.ok) {
              zoneRef.current = target.id;
              useSpace.getState().setMyZone(target.id);
              optsRef.current.onZoneEnter?.(target, ack.members);
            } else {
              optsRef.current.onZoneRefused?.(target, ack.code);
              window.setTimeout(() => {
                if (zoneRef.current === null) pendingZone.current = null;
              }, 1500);
              pendingZone.current = "cooldown";
            }
          });
        }
      }
      for (const cb of listeners.current) cb(p, dt);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (zoneRef.current) {
        requestZoneLeave(zoneRef.current);
        zoneRef.current = null;
        useSpace.getState().setMyZone(null);
      }
    };
  }, [layout, myDeskId]);

  return useMemo<MovementHandle>(
    () => ({
      pos,
      path,
      walkTo: (x, y) => {
        const p = pos.current;
        const route = findPath(grid, { x: p.x, y: p.y }, { x, y });
        path.current = route ?? [];
      },
      stop: () => {
        path.current = [];
        keys.current.clear();
      },
      onFrame: (cb) => {
        listeners.current.add(cb);
        return () => listeners.current.delete(cb);
      },
    }),
    [grid],
  );
}

function approach(v: number, target: number, maxDelta: number): number {
  if (v < target) return Math.min(target, v + maxDelta);
  if (v > target) return Math.max(target, v - maxDelta);
  return v;
}
