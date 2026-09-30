import { BOTS, ISLAND_GEOMETRY, OFFICE_GEOMETRY, SPEED_UNITS_PER_S, deskSeat, spaceIdForUnit, type BotDef, type Position } from "@orbit/shared";
import type { LiveUser, World } from "../world/state.ts";
import { requestTravel } from "../world/travel.ts";

interface BotRuntime {
  def: BotDef;
  live: LiveUser;
  path: Array<{ x: number; y: number }>;
  onArrive: (() => void) | null;
  nextActionAt: number;
  talkUntil: number;
  nextTalkAt: number;
  phase: "home" | "away" | "traveling";
}

const MEETING_SPOTS: Array<{ x: number; y: number }> = [
  { x: 378, y: 281 },
  { x: 294, y: 330 },
  { x: 406, y: 330 },
  { x: 322, y: 378 },
];

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class BotSimulator {
  private bots: BotRuntime[] = [];
  private moveTimer: NodeJS.Timeout | null = null;
  private thinkTimer: NodeJS.Timeout | null = null;

  constructor(private world: World) {}

  start(): void {
    const now = this.world.now();
    let meetingSlot = 0;
    for (const def of BOTS) {
      const live = this.world.users.get(def.id);
      if (!live) continue;
      const rt: BotRuntime = { def, live, path: [], onArrive: null, nextActionAt: now + rand(5000, 15000), talkUntil: 0, nextTalkAt: now + rand(2000, 8000), phase: "home" };
      live.presence = def.role === "offline" ? "offline" : "online";
      if (def.role === "meeting") {
        const spot = MEETING_SPOTS[meetingSlot++ % MEETING_SPOTS.length];
        const spaceId = spaceIdForUnit(live.stored.homeUnit ?? "");
        this.world.placeIn(live, spaceId, { x: spot.x, y: spot.y, dir: 0, moving: false }, true);
        this.world.enterZone(live, `meet:${live.stored.homeUnit}`);
      } else if (def.role === "circle" && def.circle) {
        const dest = this.world.repo.destinations.all().find((d) => d.id === def.circle?.destId);
        const circle = ISLAND_GEOMETRY.circles.find((c) => c.key === def.circle?.key);
        if (dest && circle) {
          const spaceId = this.world.destinationSpaceId(dest.id);
          const pos = { x: circle.x - 30, y: circle.y - 10, dir: 0, moving: false };
          this.world.placeIn(live, spaceId, pos, true);
          live.stored.currentUnit = dest.unitId;
          this.world.enterZone(live, `circle:${dest.id}:${circle.key}`);
        }
      } else {
        if (!this.world.placeAtOfficeDesk(live, true)) this.world.placeAtHome(live, true);
        if (def.role === "traveler") rt.nextActionAt = now + rand(15000, 30000);
        if (def.role === "walker") rt.nextActionAt = now + rand(40000, 70000);
      }
      this.world.broadcastUser(live);
      this.bots.push(rt);
    }
    this.moveTimer = setInterval(() => this.tickMove(), 100);
    this.thinkTimer = setInterval(() => this.tickThink(), 1000);
  }

  stop(): void {
    if (this.moveTimer) clearInterval(this.moveTimer);
    if (this.thinkTimer) clearInterval(this.thinkTimer);
  }

  private tickMove(): void {
    const dt = 0.1;
    for (const b of this.bots) {
      if (b.path.length === 0) continue;
      const target = b.path[0];
      const p = b.live.pos;
      const dx = target.x - p.x;
      const dy = target.y - p.y;
      const dist = Math.hypot(dx, dy);
      const step = SPEED_UNITS_PER_S * dt;
      if (dist <= step) {
        b.path.shift();
        const moving = b.path.length > 0;
        this.world.updatePos(b.live, { x: target.x, y: target.y, dir: Math.atan2(dy, dx), moving }, true);
        if (!moving && b.onArrive) {
          const cb = b.onArrive;
          b.onArrive = null;
          cb();
        }
      } else {
        this.world.updatePos(b.live, { x: p.x + (dx / dist) * step, y: p.y + (dy / dist) * step, dir: Math.atan2(dy, dx), moving: true }, true);
      }
    }
  }

  private tickThink(): void {
    const now = this.world.now();
    for (const b of this.bots) {
      this.think(b, now);
      this.talk(b, now);
    }
  }

  private zoneMemberCount(b: BotRuntime): number {
    if (!b.live.zoneId || !b.live.spaceId) return 0;
    const space = this.world.spaces.get(b.live.spaceId);
    return space?.zones.get(b.live.zoneId)?.members.size ?? 0;
  }

  private talk(b: BotRuntime, now: number): void {
    if (!b.def.talkative || b.live.presence !== "online") return;
    const together = this.zoneMemberCount(b) >= 2;
    if (b.live.speaking) {
      if (now >= b.talkUntil || !together) {
        this.world.setSpeaking(b.live, false, true);
        b.nextTalkAt = now + rand(4000, 14000);
      }
      return;
    }
    if (together && now >= b.nextTalkAt) {
      this.world.setSpeaking(b.live, true, true);
      b.talkUntil = now + rand(2000, 6000);
    }
  }

  private think(b: BotRuntime, now: number): void {
    if (now < b.nextActionAt || b.path.length > 0 || b.live.travel) return;
    const home = b.live.stored.homeUnit;
    if (!home) return;
    if (b.def.role === "walker") {
      const seatIdx = b.def.homeDeskIdx;
      const seat = deskSeat(seatIdx);
      if (b.phase === "home") {
        const corridorY = seat.y + 49;
        b.path = [
          { x: seat.x, y: corridorY },
          { x: 440, y: corridorY },
          { x: 420, y: OFFICE_GEOMETRY.meeting.y + 10 },
        ];
        b.onArrive = () => {
          this.world.enterZone(b.live, `meet:${home}`);
          b.phase = "away";
          b.nextActionAt = this.world.now() + rand(25000, 40000);
        };
      } else {
        const corridorY = seat.y + 49;
        this.world.leaveZone(b.live, true);
        b.path = [
          { x: 440, y: corridorY },
          { x: seat.x, y: corridorY },
          { x: seat.x, y: seat.y },
        ];
        b.onArrive = () => {
          b.phase = "home";
          b.nextActionAt = this.world.now() + rand(50000, 90000);
        };
      }
      b.nextActionAt = now + 120000;
      return;
    }
    if (b.def.role === "traveler" && b.def.travelTo) {
      if (b.phase === "home") {
        const res = requestTravel(this.world, b.live, { mode: "flight", to: { destId: b.def.travelTo.destId } });
        if (res.ok) {
          b.phase = "traveling";
          this.waitArrival(b, () => {
            const circle = ISLAND_GEOMETRY.circles[0];
            b.path = [
              { x: 430, y: 578 },
              { x: 560, y: 525 },
              { x: circle.x + 60, y: circle.y + 40 },
            ];
            b.onArrive = () => {
              this.world.enterZone(b.live, `circle:${b.def.travelTo?.destId}:${circle.key}`);
              b.phase = "away";
              b.nextActionAt = this.world.now() + rand(30000, 45000);
            };
          });
        } else b.nextActionAt = now + 20000;
      } else if (b.phase === "away") {
        this.world.leaveZone(b.live, true);
        const res = requestTravel(this.world, b.live, { mode: "flight", to: { unitId: home } });
        if (res.ok) {
          b.phase = "traveling";
          this.waitArrival(b, () => {
            const seat = deskSeat(b.def.homeDeskIdx);
            b.path = [
              { x: 430, y: 612 },
              { x: seat.x, y: seat.y + 49 },
              { x: seat.x, y: seat.y },
            ];
            b.onArrive = () => {
              b.phase = "home";
              b.nextActionAt = this.world.now() + rand(40000, 70000);
            };
          });
        } else b.nextActionAt = now + 20000;
      }
      b.nextActionAt = now + 120000;
    }
  }

  private waitArrival(b: BotRuntime, then: () => void): void {
    const check = () => {
      if (b.live.travel) {
        setTimeout(check, 500);
        return;
      }
      then();
    };
    setTimeout(check, 500);
  }

  positionOf(id: string): Position | null {
    const b = this.bots.find((x) => x.def.id === id);
    return b ? b.live.pos : null;
  }
}
