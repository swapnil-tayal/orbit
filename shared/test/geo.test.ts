import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { bandOf, cellsInBand, haversineKm, isUnitId, slerp, unitBounds, unitCentre, unitIdFor, unitWidthKm } from "../src/geo/index.ts";
import { createLandIndex } from "../src/geo/land.ts";
import { PLACES } from "../src/mock/cast.ts";

const require = createRequire(import.meta.url);
const land110 = JSON.parse(readFileSync(require.resolve("world-atlas/land-110m.json"), "utf8"));

describe("unit grid", () => {
  it("round-trips a point through its unit centre", () => {
    const id = unitIdFor(30.73, 76.78);
    expect(isUnitId(id)).toBe(true);
    const c = unitCentre(id);
    expect(unitIdFor(c.lat, c.lng)).toBe(id);
    const b = unitBounds(id);
    expect(c.lat).toBeGreaterThan(b.south);
    expect(c.lat).toBeLessThan(b.north);
    expect(c.lng).toBeGreaterThan(b.west);
    expect(c.lng).toBeLessThan(b.east);
  });

  it("keeps cells near 50 km wide", () => {
    for (const lat of [0, 30, 60, 80]) {
      const id = unitIdFor(lat, 10);
      const w = unitWidthKm(id);
      expect(w).toBeGreaterThan(40);
      expect(w).toBeLessThan(60);
    }
  });

  it("handles the antimeridian and poles", () => {
    expect(isUnitId(unitIdFor(0, 180))).toBe(true);
    expect(isUnitId(unitIdFor(0, -180))).toBe(true);
    expect(unitIdFor(0, 180)).toBe(unitIdFor(0, -180));
    expect(isUnitId(unitIdFor(90, 0))).toBe(true);
    expect(isUnitId(unitIdFor(-90, 0))).toBe(true);
    expect(cellsInBand(bandOf(89.9))).toBeGreaterThanOrEqual(1);
  });

  it("rejects malformed ids", () => {
    expect(isUnitId("abc")).toBe(false);
    expect(isUnitId("9999:1")).toBe(false);
    expect(isUnitId("200:999999")).toBe(false);
  });
});

describe("sphere", () => {
  it("measures known distances", () => {
    const km = haversineKm(PLACES.chandigarh, PLACES.office);
    expect(km).toBeGreaterThan(900);
    expect(km).toBeLessThan(1000);
  });

  it("slerps along the great circle", () => {
    const mid = slerp(PLACES.chandigarh, PLACES.office, 0.5);
    const d1 = haversineKm(PLACES.chandigarh, mid);
    const d2 = haversineKm(mid, PLACES.office);
    expect(Math.abs(d1 - d2)).toBeLessThan(1);
  });
});

describe("land", () => {
  const land = createLandIndex(land110);

  it("classifies land and water", () => {
    expect(land.isLand(PLACES.chandigarh.lat, PLACES.chandigarh.lng)).toBe(true);
    expect(land.isLand(PLACES.office.lat, PLACES.office.lng)).toBe(true);
    expect(land.isLand(0, -30)).toBe(false);
    expect(land.isLand(-75, 0)).toBe(true);
    expect(land.isHabitable(-75, 0)).toBe(false);
  });

  it("puts Indian cities on one landmass and Britain on another", () => {
    const a = land.landmassIndex(PLACES.chandigarh.lat, PLACES.chandigarh.lng);
    const b = land.landmassIndex(PLACES.office.lat, PLACES.office.lng);
    const uk = land.landmassIndex(52.5, -1.5);
    expect(a).toBe(b);
    expect(uk).toBeGreaterThanOrEqual(0);
    expect(uk).not.toBe(a);
  });
});
