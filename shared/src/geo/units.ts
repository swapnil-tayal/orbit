import type { LatLng, UnitId } from "../types.ts";
import { BAND_COUNT, BAND_DEG, DEG, KM_PER_DEG, UNIT_KM } from "./constants.ts";

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

export function bandOf(lat: number): number {
  return clamp(Math.floor((lat + 90) / BAND_DEG), 0, BAND_COUNT - 1);
}

export function bandMidLat(band: number): number {
  return clamp(-90 + (band + 0.5) * BAND_DEG, -89.9, 89.9);
}

export function cellsInBand(band: number): number {
  return Math.max(1, Math.round((360 * Math.cos(bandMidLat(band) * DEG) * KM_PER_DEG) / UNIT_KM));
}

export function cellOf(band: number, lng: number): number {
  const n = cellsInBand(band);
  const l = ((lng + 180) % 360 + 360) % 360;
  return Math.min(n - 1, Math.floor(l / (360 / n)));
}

export function unitIdFor(lat: number, lng: number): UnitId {
  const band = bandOf(lat);
  return `${band}:${cellOf(band, lng)}`;
}

export function unitIdForLatLng(p: LatLng): UnitId {
  return unitIdFor(p.lat, p.lng);
}

export function parseUnit(id: UnitId): { band: number; cell: number } {
  const i = id.indexOf(":");
  const band = Number(id.slice(0, i));
  const cell = Number(id.slice(i + 1));
  return { band, cell };
}

export function isUnitId(id: unknown): id is UnitId {
  if (typeof id !== "string") return false;
  const m = /^(\d+):(\d+)$/.exec(id);
  if (!m) return false;
  const band = Number(m[1]);
  const cell = Number(m[2]);
  return band >= 0 && band < BAND_COUNT && cell >= 0 && cell < cellsInBand(band);
}

export function unitCentre(id: UnitId): LatLng {
  const { band, cell } = parseUnit(id);
  const n = cellsInBand(band);
  return { lat: bandMidLat(band), lng: -180 + (cell + 0.5) * (360 / n) };
}

export function unitBounds(id: UnitId): { south: number; north: number; west: number; east: number } {
  const { band, cell } = parseUnit(id);
  const n = cellsInBand(band);
  const w = 360 / n;
  return {
    south: -90 + band * BAND_DEG,
    north: Math.min(90, -90 + (band + 1) * BAND_DEG),
    west: -180 + cell * w,
    east: -180 + (cell + 1) * w,
  };
}

export function unitWidthKm(id: UnitId): number {
  const { band } = parseUnit(id);
  const n = cellsInBand(band);
  return (360 / n) * KM_PER_DEG * Math.cos(bandMidLat(band) * DEG);
}

export function unitsInWindow(centre: LatLng, latSpanDeg: number, lngSpanDeg: number): UnitId[] {
  const out: UnitId[] = [];
  const b0 = bandOf(centre.lat - latSpanDeg);
  const b1 = bandOf(centre.lat + latSpanDeg);
  for (let band = b0; band <= b1; band++) {
    const n = cellsInBand(band);
    const w = 360 / n;
    const cellsEachSide = Math.ceil(lngSpanDeg / w);
    const c0 = cellOf(band, centre.lng);
    for (let dc = -cellsEachSide; dc <= cellsEachSide; dc++) {
      const cell = ((c0 + dc) % n + n) % n;
      out.push(`${band}:${cell}`);
    }
  }
  return out;
}
