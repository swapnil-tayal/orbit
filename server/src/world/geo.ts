import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { createLandIndex, haversineKm, unitCentre, unitIdFor, type LandIndex, type LatLng, type UnitId } from "@orbit/shared";

const require = createRequire(import.meta.url);

let index: LandIndex | null = null;

export function land(): LandIndex {
  if (!index) {
    const topo = JSON.parse(readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"));
    index = createLandIndex(topo);
  }
  return index;
}

export function unitIsHabitable(unitId: UnitId): boolean {
  const c = unitCentre(unitId);
  return land().isHabitable(c.lat, c.lng);
}

export function unitsOnSameLandmass(a: UnitId, b: UnitId): boolean {
  const ca = unitCentre(a);
  const cb = unitCentre(b);
  const ia = land().landmassIndex(ca.lat, ca.lng);
  const ib = land().landmassIndex(cb.lat, cb.lng);
  return ia >= 0 && ia === ib;
}

export function unitDistanceKm(a: UnitId, b: UnitId): number {
  return haversineKm(unitCentre(a), unitCentre(b));
}

export function unitFor(p: LatLng): UnitId {
  return unitIdFor(p.lat, p.lng);
}
