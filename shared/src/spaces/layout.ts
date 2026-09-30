import type { UserId, DeskId, SpaceId, UnitId, ZoneId } from "../types.ts";
import { CONFIG } from "../config.ts";

export type Obstacle =
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "circle"; x: number; y: number; r: number }
  | { kind: "poly"; points: Array<[number, number]> };

export interface ZoneDef {
  id: ZoneId;
  kind: "desk" | "meeting" | "lounge" | "circle";
  x: number;
  y: number;
  r: number;
  ownerDeskId: DeskId | null;
  label: string;
}

export interface DeskDef {
  id: DeskId;
  idx: number;
  row: number;
  col: number;
  x: number;
  y: number;
  seatX: number;
  seatY: number;
  number: number;
}

export interface SpaceLayout {
  id: SpaceId;
  kind: "office" | "dest" | "home";
  unitId: UnitId;
  width: number;
  height: number;
  extraRowsShift: number;
  rows: number;
  spawn: { x: number; y: number; r: number };
  desks: DeskDef[];
  zones: ZoneDef[];
  obstacles: Obstacle[];
  walkArea: Obstacle[];
  ghostSlots: Array<{ idx: number; x: number; y: number }>;
}

export const OFFICE_GEOMETRY = {
  floor: { x: 230, y: 130, w: 980, h: 640, r: 28 },
  door: { y1: 590, y2: 690 },
  arrival: { x: 292, y: 640, r: 26 },
  deskCols: [520, 690, 860, 1030],
  deskRowY0: 225,
  deskRowPitch: 150,
  deskRing: 66,
  seatOffsetY: 16,
  desktop: { dx: -43, dy: -31, w: 86, h: 31 },
  aisleY: 584,
  meeting: { x: 350, y: 330, r: 92, tableR: 34, chairR: 11, chairRing: 56 },
  lounge: { x: 775, y: 690, r: 76 },
  visibleRows: 3,
} as const;

export const ISLAND_GEOMETRY = {
  arrival: { x: 216, y: 652, r: 22 },
  circles: [
    { key: "fire", label: "Fire circle", x: 700, y: 480, r: 110 },
    { key: "deck", label: "Deck", x: 935, y: 330, r: 100 },
    { key: "hammocks", label: "Hammocks", x: 1100, y: 560, r: 80 },
  ],
  palms: [
    [520, 320],
    [615, 296],
    [1060, 505],
    [1142, 505],
    [880, 650],
    [480, 515],
    [1150, 360],
  ] as Array<[number, number]>,
  jetty: { x: 210, y: 600, w: 230, h: 34, rotDeg: -18, cx: 325, cy: 617 },
} as const;

export function spaceIdForUnit(unitId: UnitId): SpaceId {
  return `office:${unitId}`;
}

export function spaceIdForDestination(destId: string): SpaceId {
  return `dest:${destId}`;
}

export function spaceIdForHome(userId: UserId): SpaceId {
  return `home:${userId}`;
}

export function homeDeskIdFor(userId: UserId): DeskId {
  return `home:${userId}#0`;
}

export function isHomeDeskId(deskId: DeskId | null | undefined): boolean {
  return !!deskId && deskId.startsWith("home:");
}

export function parseSpaceId(id: SpaceId): { kind: "office"; unitId: UnitId } | { kind: "dest"; destId: string } | { kind: "home"; userId: UserId } | null {
  if (id.startsWith("office:")) return { kind: "office", unitId: id.slice(7) };
  if (id.startsWith("home:")) return { kind: "home", userId: id.slice(5) };
  if (id.startsWith("dest:")) return { kind: "dest", destId: id.slice(5) };
  return null;
}

export function deskIdFor(unitId: UnitId, idx: number): DeskId {
  return `${unitId}#${idx}`;
}

export function parseDeskId(id: DeskId): { unitId: UnitId; idx: number } | null {
  const i = id.lastIndexOf("#");
  if (i < 0) return null;
  const idx = Number(id.slice(i + 1));
  if (!Number.isInteger(idx)) return null;
  return { unitId: id.slice(0, i), idx };
}

export function deskZoneId(deskId: DeskId): ZoneId {
  return `desk:${deskId}`;
}

export function deskPosition(idx: number): { x: number; y: number; row: number; col: number } {
  const per = CONFIG.office.desksPerRow;
  const row = Math.floor(idx / per);
  const col = idx % per;
  return { x: OFFICE_GEOMETRY.deskCols[col], y: OFFICE_GEOMETRY.deskRowY0 + row * OFFICE_GEOMETRY.deskRowPitch, row, col };
}

export function deskSeat(idx: number): { x: number; y: number } {
  const p = deskPosition(idx);
  return { x: p.x, y: p.y + OFFICE_GEOMETRY.seatOffsetY };
}

export function officeExtraShift(rows: number): number {
  return Math.max(0, rows - OFFICE_GEOMETRY.visibleRows) * OFFICE_GEOMETRY.deskRowPitch;
}

export function officeLayout(unitId: UnitId, rows: number): SpaceLayout {
  const g = OFFICE_GEOMETRY;
  const shift = officeExtraShift(rows);
  const per = CONFIG.office.desksPerRow;
  const count = rows * per;
  const desks: DeskDef[] = [];
  for (let idx = 0; idx < count; idx++) {
    const p = deskPosition(idx);
    desks.push({ id: deskIdFor(unitId, idx), idx, row: p.row, col: p.col, x: p.x, y: p.y, seatX: p.x, seatY: p.y + g.seatOffsetY, number: idx + 1 });
  }
  const ghostSlots: Array<{ idx: number; x: number; y: number }> = [];
  if (rows < CONFIG.office.maxRows) {
    for (let c = 0; c < per; c++) {
      const idx = count + c;
      const p = deskPosition(idx);
      ghostSlots.push({ idx, x: p.x, y: p.y });
    }
  }
  const zones: ZoneDef[] = [
    { id: `meet:${unitId}`, kind: "meeting", x: g.meeting.x, y: g.meeting.y, r: g.meeting.r, ownerDeskId: null, label: "Meeting area" },
    { id: `lounge:${unitId}`, kind: "lounge", x: g.lounge.x, y: g.lounge.y + shift, r: g.lounge.r, ownerDeskId: null, label: "Lounge" },
    ...desks.map<ZoneDef>((d) => ({ id: deskZoneId(d.id), kind: "desk", x: d.x, y: d.y, r: g.deskRing, ownerDeskId: d.id, label: "Desk" })),
  ];
  const obstacles: Obstacle[] = [
    ...desks.map<Obstacle>((d) => ({ kind: "rect", x: d.x + g.desktop.dx, y: d.y + g.desktop.dy, w: g.desktop.w, h: g.desktop.h })),
    { kind: "circle", x: g.meeting.x, y: g.meeting.y, r: g.meeting.tableR + 4 },
    { kind: "rect", x: 715, y: 720 + shift, w: 120, h: 30 },
    { kind: "circle", x: 725, y: 668 + shift, r: 16 },
    { kind: "circle", x: 825, y: 668 + shift, r: 16 },
    { kind: "circle", x: 775, y: 682 + shift, r: 15 },
    { kind: "rect", x: 367, y: 722 + shift, w: 252, h: 32 },
    { kind: "rect", x: 920, y: 734 + shift, w: 150, h: 20 },
    { kind: "circle", x: 958, y: 690 + shift, r: 24 },
    { kind: "circle", x: 1042, y: 686 + shift, r: 24 },
    { kind: "circle", x: 1000, y: 708 + shift, r: 10 },
    { kind: "rect", x: 1138, y: 266, w: 58, h: 40 },
    { kind: "circle", x: 1182, y: 338, r: 14 },
    { kind: "rect", x: 1174, y: 370, w: 22, h: 118 },
    { kind: "rect", x: 1124, y: 144, w: 72, h: 104 },
    { kind: "circle", x: 262, y: 162, r: 18 },
    { kind: "circle", x: 1178, y: 738 + shift, r: 18 },
  ];
  const inset = 12;
  const walkArea: Obstacle[] = [{ kind: "rect", x: g.floor.x + inset, y: g.floor.y + inset, w: g.floor.w - inset * 2, h: g.floor.h + shift - inset * 2 }];
  return {
    id: spaceIdForUnit(unitId),
    kind: "office",
    unitId,
    width: 1440,
    height: 900 + shift,
    extraRowsShift: shift,
    rows,
    spawn: { x: g.arrival.x, y: g.arrival.y + shift, r: g.arrival.r },
    desks,
    zones,
    obstacles,
    walkArea,
    ghostSlots,
  };
}

function cubic(p0: [number, number], p1: [number, number], p2: [number, number], p3: [number, number], t: number): [number, number] {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
}

export function islandPolygon(): Array<[number, number]> {
  const segs: Array<[[number, number], [number, number], [number, number], [number, number]]> = [
    [[420, 430], [430, 300], [600, 200], [800, 210]],
    [[800, 210], [1000, 220], [1180, 300], [1200, 450]],
    [[1200, 450], [1220, 600], [1080, 720], [860, 730]],
    [[860, 730], [640, 740], [440, 680], [420, 560]],
  ];
  const pts: Array<[number, number]> = [];
  for (const [a, b, c, d] of segs) for (let i = 0; i < 12; i++) pts.push(cubic(a, b, c, d, i / 12));
  pts.push([420, 560]);
  return pts;
}

export function jettyPolygon(): Array<[number, number]> {
  const j = ISLAND_GEOMETRY.jetty;
  const a = (j.rotDeg * Math.PI) / 180;
  const cs = Math.cos(a);
  const sn = Math.sin(a);
  const corners: Array<[number, number]> = [
    [j.x, j.y],
    [j.x + j.w, j.y],
    [j.x + j.w, j.y + j.h],
    [j.x, j.y + j.h],
  ];
  return corners.map(([x, y]) => {
    const dx = x - j.cx;
    const dy = y - j.cy;
    return [j.cx + dx * cs - dy * sn, j.cy + dx * sn + dy * cs];
  });
}

export const HOME_GEOMETRY = {
  floor: { x: 330, y: 170, w: 780, h: 560, r: 28 },
  door: { y1: 540, y2: 640 },
  arrival: { x: 382, y: 590, r: 26 },
  desk: { x: 520, y: 300 },
  sofaZone: { x: 870, y: 372, r: 110 },
} as const;

export function homeLayout(userId: UserId, unitId: UnitId): SpaceLayout {
  const h = HOME_GEOMETRY;
  const deskId = homeDeskIdFor(userId);
  const desk: DeskDef = { id: deskId, idx: 0, row: 0, col: 0, x: h.desk.x, y: h.desk.y, seatX: h.desk.x, seatY: h.desk.y + OFFICE_GEOMETRY.seatOffsetY, number: 1 };
  const zones: ZoneDef[] = [
    { id: deskZoneId(deskId), kind: "desk", x: h.desk.x, y: h.desk.y, r: OFFICE_GEOMETRY.deskRing, ownerDeskId: deskId, label: "Desk" },
    { id: `lounge:${spaceIdForHome(userId)}`, kind: "lounge", x: h.sofaZone.x, y: h.sofaZone.y, r: h.sofaZone.r, ownerDeskId: null, label: "Sofa" },
  ];
  const d = OFFICE_GEOMETRY.desktop;
  const obstacles: Obstacle[] = [
    { kind: "rect", x: h.desk.x + d.dx, y: h.desk.y + d.dy, w: d.w, h: d.h },
    { kind: "rect", x: 440, y: 184, w: 160, h: 16 },
    { kind: "circle", x: 362, y: 202, r: 18 },
    { kind: "circle", x: 1078, y: 202, r: 18 },
    { kind: "rect", x: 790, y: 180, w: 160, h: 26 },
    { kind: "rect", x: 825, y: 305, w: 90, h: 40 },
    { kind: "circle", x: 748, y: 322, r: 20 },
    { kind: "rect", x: 770, y: 400, w: 200, h: 46 },
    { kind: "rect", x: 350, y: 664, w: 42, h: 52 },
    { kind: "rect", x: 400, y: 690, w: 220, h: 26 },
    { kind: "circle", x: 510, y: 600, r: 30 },
    { kind: "circle", x: 464, y: 600, r: 12 },
    { kind: "circle", x: 556, y: 600, r: 12 },
    { kind: "rect", x: 940, y: 574, w: 150, h: 142 },
    { kind: "rect", x: 900, y: 576, w: 30, h: 24 },
  ];
  const inset = 12;
  return {
    id: spaceIdForHome(userId),
    kind: "home",
    unitId,
    width: 1440,
    height: 900,
    extraRowsShift: 0,
    rows: 1,
    spawn: { x: h.arrival.x, y: h.arrival.y, r: h.arrival.r },
    desks: [desk],
    zones,
    obstacles,
    walkArea: [
      { kind: "rect", x: h.floor.x + inset, y: h.floor.y + inset, w: h.floor.w - inset * 2, h: h.floor.h - inset * 2 },
      { kind: "circle", x: h.arrival.x, y: h.arrival.y, r: h.arrival.r + 10 },
    ],
    ghostSlots: [],
  };
}

export function destinationLayout(destId: string, unitId: UnitId): SpaceLayout {
  const g = ISLAND_GEOMETRY;
  const zones: ZoneDef[] = g.circles.map<ZoneDef>((c) => ({ id: `circle:${destId}:${c.key}`, kind: "circle", x: c.x, y: c.y, r: c.r, ownerDeskId: null, label: c.label }));
  const obstacles: Obstacle[] = [
    ...g.palms.map<Obstacle>(([x, y]) => ({ kind: "circle", x, y, r: 12 })),
    { kind: "circle", x: 700, y: 480, r: 24 },
    { kind: "rect", x: 870, y: 280, w: 130, h: 6 },
  ];
  const pad = g.arrival;
  return {
    id: spaceIdForDestination(destId),
    kind: "dest",
    unitId,
    width: 1440,
    height: 900,
    extraRowsShift: 0,
    rows: 0,
    spawn: { x: pad.x, y: pad.y, r: pad.r },
    desks: [],
    zones,
    obstacles,
    walkArea: [
      { kind: "poly", points: islandPolygon() },
      { kind: "poly", points: jettyPolygon() },
      { kind: "circle", x: pad.x, y: pad.y, r: pad.r + 10 },
    ],
    ghostSlots: [],
  };
}

export function pointInPoly(points: Array<[number, number]>, x: number, y: number): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

export function pointInObstacle(o: Obstacle, x: number, y: number, pad = 0): boolean {
  if (o.kind === "rect") return x >= o.x - pad && x <= o.x + o.w + pad && y >= o.y - pad && y <= o.y + o.h + pad;
  if (o.kind === "circle") {
    const dx = x - o.x;
    const dy = y - o.y;
    return dx * dx + dy * dy <= (o.r + pad) * (o.r + pad);
  }
  return pointInPoly(o.points, x, y);
}

export function isWalkable(layout: SpaceLayout, x: number, y: number, radius = 14): boolean {
  let inside = false;
  for (const a of layout.walkArea) {
    if (pointInObstacle(a, x, y, -radius)) {
      inside = true;
      break;
    }
  }
  if (!inside) return false;
  for (const o of layout.obstacles) if (pointInObstacle(o, x, y, radius)) return false;
  return true;
}

export interface WalkGrid {
  cell: number;
  cols: number;
  rows: number;
  cells: Uint8Array;
}

export function buildWalkGrid(layout: SpaceLayout, cell = CONFIG.movement.gridCell): WalkGrid {
  const cols = Math.ceil(layout.width / cell);
  const rows = Math.ceil(layout.height / cell);
  const cells = new Uint8Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cell + cell / 2;
      const y = r * cell + cell / 2;
      cells[r * cols + c] = isWalkable(layout, x, y) ? 1 : 0;
    }
  }
  return { cell, cols, rows, cells };
}

export function zonesOverlap(zones: ZoneDef[]): Array<[ZoneId, ZoneId]> {
  const out: Array<[ZoneId, ZoneId]> = [];
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = zones[i];
      const b = zones[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < a.r + b.r) out.push([a.id, b.id]);
    }
  }
  return out;
}
