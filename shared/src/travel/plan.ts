import type { LatLng, TravelMode, TravelState } from "../types.ts";
import { CONFIG } from "../config.ts";
import { bearingDeg, slerp } from "../geo/sphere.ts";

export function travelDurationMs(mode: TravelMode, km: number): number {
  const c = CONFIG.travel[mode];
  const s = Math.min(c.maxS, c.baseS + km / c.kmPerS);
  return Math.round(s) * 1000;
}

export function canDrive(km: number, sameLandmass: boolean): boolean {
  return sameLandmass && km <= CONFIG.travel.car.maxKm;
}

export function flightPeakKm(km: number): number {
  return Math.min(CONFIG.travel.flight.peakKmMax, CONFIG.travel.flight.peakFraction * km);
}

export function easeFraction(durationMs: number): number {
  return Math.min(CONFIG.travel.easeFractionMax, CONFIG.travel.easeMsMax / Math.max(1, durationMs));
}

export function tripProgress(t: number, a: number): number {
  const tt = t < 0 ? 0 : t > 1 ? 1 : t;
  if (a <= 0) return tt;
  const vmax = 1 / (1 - a);
  if (tt < a) return (vmax * tt * tt) / (2 * a);
  if (tt <= 1 - a) return vmax * (tt - a / 2);
  const r = 1 - tt;
  return 1 - (vmax * r * r) / (2 * a);
}

export interface VehicleState {
  t: number;
  s: number;
  ground: LatLng;
  altKm: number;
  headingDeg: number;
  done: boolean;
}

export function vehicleState(trip: TravelState, now: number, from: LatLng, to: LatLng): VehicleState {
  const t = (now - trip.startedAt) / trip.durationMs;
  const a = easeFraction(trip.durationMs);
  const s = tripProgress(t, a);
  const ground = slerp(from, to, s);
  const ahead = slerp(from, to, Math.min(1, s + 0.002));
  const headingDeg = s >= 0.998 ? bearingDeg(ground, to) : bearingDeg(ground, ahead);
  const altKm = trip.mode === "flight" ? flightPeakKm(trip.distanceKm) * Math.sin(Math.PI * s) : 0;
  return { t, s, ground, altKm, headingDeg, done: t >= 1 };
}
