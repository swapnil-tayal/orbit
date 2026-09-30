import { describe, expect, it } from "vitest";
import { buildWalkGrid, deskIdFor, destinationLayout, homeDeskIdFor, homeLayout, isWalkable, officeLayout, parseDeskId, spaceIdForHome, zonesOverlap } from "../src/spaces/layout.ts";
import { canDrive, tripProgress, travelDurationMs } from "../src/travel/plan.ts";

describe("office layout", () => {
  it("never overlaps rings", () => {
    for (const rows of [1, 2, 3, 6]) {
      const l = officeLayout("268:541", rows);
      expect(zonesOverlap(l.zones)).toEqual([]);
      expect(l.desks.length).toBe(rows * 4);
    }
  });

  it("grows the floor for extra rows", () => {
    expect(officeLayout("1:1", 3).height).toBe(900);
    expect(officeLayout("1:1", 4).height).toBe(1050);
  });

  it("walks the aisle and blocks desks", () => {
    const l = officeLayout("1:1", 2);
    expect(isWalkable(l, l.spawn.x, l.spawn.y)).toBe(true);
    expect(isWalkable(l, 605, 598)).toBe(true);
    expect(isWalkable(l, 690, 205)).toBe(false);
    expect(isWalkable(l, 100, 100)).toBe(false);
    const g = buildWalkGrid(l);
    expect(g.cells.reduce((a, b) => a + b, 0)).toBeGreaterThan(500);
  });

  it("parses desk ids", () => {
    const id = deskIdFor("268:541", 5);
    expect(parseDeskId(id)).toEqual({ unitId: "268:541", idx: 5 });
  });
});

describe("home layout", () => {
  it("has one owned desk, a sofa ring and walkable seat and door", () => {
    const l = homeLayout("u_test", "250:500");
    expect(l.id).toBe(spaceIdForHome("u_test"));
    expect(l.desks).toHaveLength(1);
    expect(l.desks[0].id).toBe(homeDeskIdFor("u_test"));
    expect(l.zones.map((z) => z.kind).sort()).toEqual(["desk", "lounge"]);
    expect(zonesOverlap(l.zones)).toEqual([]);
    expect(isWalkable(l, l.spawn.x, l.spawn.y)).toBe(true);
    expect(isWalkable(l, l.desks[0].seatX, l.desks[0].seatY)).toBe(true);
    expect(isWalkable(l, 870, 372)).toBe(true);
    expect(isWalkable(l, 100, 100)).toBe(false);
  });
});

describe("destination layout", () => {
  it("has circles, a jetty spawn and no desks", () => {
    const l = destinationLayout("andaman", "227:600");
    expect(l.zones.length).toBe(3);
    expect(zonesOverlap(l.zones)).toEqual([]);
    expect(isWalkable(l, l.spawn.x, l.spawn.y)).toBe(true);
    expect(isWalkable(l, 700, 400)).toBe(true);
    expect(isWalkable(l, 100, 100)).toBe(false);
  });
});

describe("travel", () => {
  it("matches the design duration table", () => {
    expect(travelDurationMs("car", 938)).toBe(20000);
    expect(travelDurationMs("flight", 938)).toBe(5000);
    expect(travelDurationMs("car", 250)).toBe(8000);
    expect(travelDurationMs("flight", 2631)).toBe(6000);
    expect(travelDurationMs("flight", 12000)).toBe(12000);
    expect(travelDurationMs("car", 1500)).toBe(29000);
  });

  it("only drives on the same landmass under 1500 km", () => {
    expect(canDrive(938, true)).toBe(true);
    expect(canDrive(2631, true)).toBe(false);
    expect(canDrive(500, false)).toBe(false);
  });

  it("eases progress with a trapezoid", () => {
    expect(tripProgress(0, 0.25)).toBe(0);
    expect(tripProgress(1, 0.25)).toBeCloseTo(1, 6);
    expect(tripProgress(0.5, 0.25)).toBeCloseTo(0.5, 6);
    expect(tripProgress(0.1, 0.25)).toBeLessThan(0.1);
  });
});
