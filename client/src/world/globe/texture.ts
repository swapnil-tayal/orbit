import { geoArea, geoBounds, geoEquirectangular, geoPath, type GeoProjection } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, Polygon } from "geojson";
import { COLORS } from "./constants.ts";

export interface LandPoly {
  feature: Feature<Polygon>;
  west: number;
  south: number;
  east: number;
  north: number;
}

export type LandSet = LandPoly[];

export interface LandBlob {
  lat: number;
  lng: number;
  radiusDeg: number;
  color: string;
  alpha: number;
}

export interface LngLatWindow {
  west: number;
  south: number;
  east: number;
  north: number;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

let land50Promise: Promise<LandSet> | null = null;
let land10Promise: Promise<LandSet> | null = null;
let texturePromise: Promise<HTMLCanvasElement> | null = null;
export const LAND_BLOBS: LandBlob[] = [];
export const OCEAN_BLOBS: LandBlob[] = [];

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function normalizeLand(input: Feature<Geometry> | FeatureCollection<Geometry>): LandSet {
  const features = input.type === "FeatureCollection" ? input.features : [input];
  const out: LandSet = [];
  for (const f of features) {
    if (!f.geometry) continue;
    const polys = f.geometry.type === "MultiPolygon" ? f.geometry.coordinates : f.geometry.type === "Polygon" ? [f.geometry.coordinates] : [];
    for (const coords of polys) {
      const poly: Feature<Polygon> = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: coords } };
      if (geoArea(poly) > 2 * Math.PI) for (const ring of coords) ring.reverse();
      const [[west, south], [east, north]] = geoBounds(poly);
      out.push({ feature: poly, west, south, east, north });
    }
  }
  return out;
}

export function loadLand50(): Promise<LandSet> {
  if (!land50Promise) {
    land50Promise = import("world-atlas/land-50m.json").then((m) => {
      const topo = m.default;
      return normalizeLand(feature(topo, topo.objects.land as never) as unknown as Feature<Geometry> | FeatureCollection<Geometry>);
    });
  }
  return land50Promise;
}

export function loadLand10(): Promise<LandSet> {
  if (!land10Promise) {
    land10Promise = import("world-atlas/land-10m.json").then((m) => {
      const topo = m.default;
      return normalizeLand(feature(topo, topo.objects.land as never) as unknown as Feature<Geometry> | FeatureCollection<Geometry>);
    });
  }
  return land10Promise;
}

function ensureBlobs(): void {
  if (LAND_BLOBS.length) return;
  const random = rng(1337);
  for (let i = 0; i < 26; i++) {
    OCEAN_BLOBS.push({ lng: random() * 360 - 180, lat: 90 - (0.15 + random() * 0.7) * 180, radiusDeg: ((120 + random() * 420) / 4096) * 360, color: "rgba(8,30,150,ALPHA)", alpha: 0.45 });
  }
  const push = (color: string, count: number, minR: number, maxR: number, alpha: number) => {
    for (let i = 0; i < count; i++) {
      LAND_BLOBS.push({ lng: random() * 360 - 180, lat: 90 - (0.08 + random() * 0.84) * 180, radiusDeg: ((minR + random() * (maxR - minR)) / 4096) * 360, color, alpha });
    }
  };
  push("rgba(185,210,75,ALPHA)", 90, 90, 300, 0.55);
  push("rgba(95,224,143,ALPHA)", 70, 80, 260, 0.5);
  push("rgba(168,177,186,ALPHA)", 40, 60, 200, 0.5);
}

function intersects(p: LandPoly, w: LngLatWindow): boolean {
  if (p.north < w.south || p.south > w.north) return false;
  if (p.west <= p.east) return !(p.east < w.west || p.west > w.east);
  return true;
}

export interface PaintOptions {
  projection: GeoProjection;
  width: number;
  height: number;
  pxPerDeg: number;
  glowPx: number;
  strokePx: number;
  includeOceanBlobs: boolean;
  window?: LngLatWindow;
}

export function paintEarth(ctx: Ctx, land: LandSet, o: PaintOptions): void {
  ensureBlobs();
  const c = ctx as CanvasRenderingContext2D;
  const path = geoPath(o.projection, c);
  const polys = o.window ? land.filter((p) => intersects(p, o.window!)) : land;
  const drawLand = () => {
    c.beginPath();
    for (const p of polys) path(p.feature as never);
  };
  const lngRef = o.window ? (o.window.west + o.window.east) / 2 : 0;
  const pTop = o.projection([lngRef, 90]);
  const pBot = o.projection([lngRef, -90]);
  const ocean = c.createLinearGradient(0, pTop ? pTop[1] : 0, 0, pBot ? pBot[1] : o.height);
  ocean.addColorStop(0, COLORS.oceanDeep);
  ocean.addColorStop(0.28, COLORS.ocean);
  ocean.addColorStop(0.72, COLORS.ocean);
  ocean.addColorStop(1, COLORS.oceanDeep);
  c.fillStyle = ocean;
  c.fillRect(0, 0, o.width, o.height);
  const blob = (b: LandBlob) => {
    const p = o.projection([b.lng, b.lat]);
    if (!p) return;
    const r = b.radiusDeg * o.pxPerDeg;
    if (p[0] + r < 0 || p[0] - r > o.width || p[1] + r < 0 || p[1] - r > o.height) return;
    const g = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], r);
    g.addColorStop(0, b.color.replace("ALPHA", String(b.alpha)));
    g.addColorStop(1, b.color.replace("ALPHA", "0"));
    c.fillStyle = g;
    c.fillRect(p[0] - r, p[1] - r, r * 2, r * 2);
  };
  if (o.includeOceanBlobs) for (const b of OCEAN_BLOBS) blob(b);

  c.save();
  c.shadowColor = COLORS.coastGlow;
  c.shadowBlur = o.glowPx;
  c.fillStyle = COLORS.land;
  drawLand();
  c.fill();
  c.restore();

  c.save();
  drawLand();
  c.clip();
  c.fillStyle = COLORS.land;
  c.fillRect(0, 0, o.width, o.height);
  for (const b of LAND_BLOBS) blob(b);
  const ice = o.projection([0, -60]);
  if (ice && ice[1] < o.height) {
    c.fillStyle = "rgba(221,235,255,0.9)";
    c.fillRect(0, ice[1], o.width, o.height - ice[1]);
  }
  c.restore();

  c.save();
  c.strokeStyle = COLORS.coast;
  c.lineWidth = o.strokePx;
  c.lineJoin = "round";
  drawLand();
  c.stroke();
  c.restore();
}

export function generateEarthTexture(width = 4096): Promise<HTMLCanvasElement> {
  if (texturePromise) return texturePromise;
  const height = width / 2;
  texturePromise = loadLand50().then((land) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    const projection = geoEquirectangular()
      .scale(width / (2 * Math.PI))
      .translate([width / 2, height / 2]);
    paintEarth(ctx, land, { projection, width, height, pxPerDeg: width / 360, glowPx: width / 200, strokePx: width / 5500, includeOceanBlobs: true });
    return canvas;
  });
  return texturePromise;
}
