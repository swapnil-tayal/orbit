import type { LatLng } from "../types.ts";
import { DEG, EARTH_RADIUS_KM, RAD } from "./constants.ts";

export type Vec3 = [number, number, number];

export function toVec(lat: number, lng: number): Vec3 {
  const phi = lat * DEG;
  const lambda = lng * DEG;
  const c = Math.cos(phi);
  return [c * Math.cos(lambda), Math.sin(phi), -c * Math.sin(lambda)];
}

export function fromVec(v: Vec3): LatLng {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  const x = v[0] / len;
  const y = v[1] / len;
  const z = v[2] / len;
  return { lat: Math.asin(Math.max(-1, Math.min(1, y))) * RAD, lng: Math.atan2(-z, x) * RAD };
}

export function normalizeLng(lng: number): number {
  let l = ((lng + 180) % 360 + 360) % 360 - 180;
  if (l === -180) l = 180;
  return l;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = (b.lat - a.lat) * DEG;
  const dLng = (b.lng - a.lng) * DEG;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h = s1 * s1 + Math.cos(a.lat * DEG) * Math.cos(b.lat * DEG) * s2 * s2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingDeg(a: LatLng, b: LatLng): number {
  const phi1 = a.lat * DEG;
  const phi2 = b.lat * DEG;
  const dl = (b.lng - a.lng) * DEG;
  const y = Math.sin(dl) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dl);
  return ((Math.atan2(y, x) * RAD) + 360) % 360;
}

export function slerpVec(a: Vec3, b: Vec3, t: number): Vec3 {
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  const so = Math.sin(omega);
  if (so < 1e-6) {
    if (dot > 0) return [a[0], a[1], a[2]];
    const axis: Vec3 = Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const perp = cross(a, axis);
    const pl = Math.hypot(perp[0], perp[1], perp[2]) || 1;
    const p: Vec3 = [perp[0] / pl, perp[1] / pl, perp[2] / pl];
    const ang = Math.PI * t;
    return [
      a[0] * Math.cos(ang) + p[0] * Math.sin(ang),
      a[1] * Math.cos(ang) + p[1] * Math.sin(ang),
      a[2] * Math.cos(ang) + p[2] * Math.sin(ang),
    ];
  }
  const wa = Math.sin((1 - t) * omega) / so;
  const wb = Math.sin(t * omega) / so;
  return [a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb];
}

export function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

export function slerp(a: LatLng, b: LatLng, t: number): LatLng {
  return fromVec(slerpVec(toVec(a.lat, a.lng), toVec(b.lat, b.lng), t));
}

export function samplePath(a: LatLng, b: LatLng, n: number): LatLng[] {
  const va = toVec(a.lat, a.lng);
  const vb = toVec(b.lat, b.lng);
  const out: LatLng[] = [];
  for (let i = 0; i <= n; i++) out.push(fromVec(slerpVec(va, vb, i / n)));
  return out;
}

export function midpoint(a: LatLng, b: LatLng): LatLng {
  return slerp(a, b, 0.5);
}
