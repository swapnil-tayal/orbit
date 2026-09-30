import { Vector3 } from "three";
import { R } from "./constants.ts";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

export function toWorld(lat: number, lng: number, altKm = 0, out = new Vector3()): Vector3 {
  const phi = lat * DEG;
  const lambda = lng * DEG;
  const r = R + altKm;
  const c = Math.cos(phi);
  return out.set(r * c * Math.cos(lambda), r * Math.sin(phi), -r * c * Math.sin(lambda));
}

export function toLatLng(v: Vector3): { lat: number; lng: number } {
  const len = v.length() || 1;
  return { lat: Math.asin(Math.max(-1, Math.min(1, v.y / len))) * RAD, lng: Math.atan2(-v.z, v.x) * RAD };
}

export interface Frame {
  n: Vector3;
  east: Vector3;
  north: Vector3;
}

export function tangentFrame(lat: number, lng: number, out?: Frame): Frame {
  const f = out ?? { n: new Vector3(), east: new Vector3(), north: new Vector3() };
  toWorld(lat, lng, 0, f.n).normalize();
  const lambda = lng * DEG;
  f.east.set(-Math.sin(lambda), 0, -Math.cos(lambda));
  f.north.crossVectors(f.n, f.east).normalize();
  return f;
}

export function bearingToTangent(frame: Frame, bearingDeg: number, out = new Vector3()): Vector3 {
  const b = bearingDeg * DEG;
  return out.copy(frame.north).multiplyScalar(Math.cos(b)).addScaledVector(frame.east, Math.sin(b)).normalize();
}
