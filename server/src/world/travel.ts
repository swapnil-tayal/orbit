import {
  CONFIG,
  EV,
  canDrive,
  spaceIdForHome,
  spaceIdForUnit,
  travelDurationMs,
  type TravelAck,
  type TravelArrivedAllMsg,
  type TravelReq,
  type TravelStartedMsg,
  type TravelState,
  type UnitId,
} from "@orbit/shared";
import { randomUUID } from "node:crypto";
import { unitDistanceKm, unitsOnSameLandmass } from "./geo.ts";
import type { LiveUser, World } from "./state.ts";

export function resolveTarget(world: World, u: LiveUser, to: TravelReq["to"]): { unitId: UnitId; spaceId: string; name: string } | null {
  if ("destId" in to) {
    const dest = world.repo.destinations.all().find((d) => d.id === to.destId);
    if (!dest) return null;
    return { unitId: dest.unitId, spaceId: world.destinationSpaceId(dest.id), name: dest.name };
  }
  if ("homeOf" in to) {
    const owner = world.users.get(to.homeOf);
    if (!owner || !owner.stored.onboarded || !owner.stored.homeUnit) return null;
    const mine = owner.stored.id === u.stored.id;
    return { unitId: owner.stored.homeUnit, spaceId: spaceIdForHome(owner.stored.id), name: mine ? "Home" : `${owner.stored.name}'s home` };
  }
  const office = world.repo.offices.get(to.unitId);
  if (office) return { unitId: to.unitId, spaceId: spaceIdForUnit(to.unitId), name: office.name };
  if (u.stored.homeUnit === to.unitId) return { unitId: to.unitId, spaceId: spaceIdForHome(u.stored.id), name: "Home" };
  return null;
}

export function requestTravel(world: World, u: LiveUser, req: TravelReq): TravelAck {
  if (u.travel) return { ok: false, code: "already_traveling" };
  const target = resolveTarget(world, u, req.to);
  if (!target) return { ok: false, code: "unknown_destination" };
  const fromUnit = u.stored.currentUnit ?? u.stored.homeUnit ?? u.stored.officeUnit;
  if (!fromUnit) return { ok: false, code: "unknown_destination" };
  if (fromUnit === target.unitId) {
    if (u.spaceId === target.spaceId) return { ok: false, code: "same_unit" };
    const space = world.getSpace(target.spaceId);
    if (!space) return { ok: false, code: "unknown_destination" };
    world.placeIn(u, space.id, { x: space.layout.spawn.x, y: space.layout.spawn.y, dir: 0, moving: false }, true, "left", target.name);
    world.broadcastUser(u);
    return { ok: true, travel: null, moved: true };
  }
  const km = unitDistanceKm(fromUnit, target.unitId);
  if (req.mode === "car" && !canDrive(km, unitsOnSameLandmass(fromUnit, target.unitId))) return { ok: false, code: "car_not_possible" };
  const travel: TravelState = {
    id: randomUUID(),
    mode: req.mode,
    fromUnit,
    toUnit: target.unitId,
    toSpaceId: target.spaceId,
    toName: target.name,
    startedAt: world.now(),
    durationMs: travelDurationMs(req.mode, km),
    distanceKm: Math.round(km),
  };
  world.removeFromSpace(u, "travel", target.name, true);
  u.travel = travel;
  u.presence = "traveling";
  u.stored.lastMode = req.mode;
  world.repo.users.setLastMode(u.stored.id, req.mode);
  const started: TravelStartedMsg = { userId: u.stored.id, travel };
  world.emitter.toWorld(EV.travelStarted, started);
  world.broadcastUser(u);
  if (u.travelTimer) clearTimeout(u.travelTimer);
  u.travelTimer = setTimeout(() => arrive(world, u, travel.id), travel.durationMs + CONFIG.travel.serverFallbackMs);
  return { ok: true, travel };
}

export function arrive(world: World, u: LiveUser, travelId: string): boolean {
  const travel = u.travel;
  if (!travel || travel.id !== travelId) return false;
  if (world.now() < travel.startedAt + travel.durationMs - CONFIG.travel.arrivalToleranceMs) return false;
  if (u.travelTimer) {
    clearTimeout(u.travelTimer);
    u.travelTimer = null;
  }
  u.travel = null;
  u.presence = "online";
  u.stored.currentUnit = travel.toUnit;
  const space = world.getSpace(travel.toSpaceId);
  if (!space) {
    world.placeAtBase(u, true);
    world.broadcastUser(u);
    return true;
  }
  const jitter = () => (Math.random() - 0.5) * 30;
  const pos = { x: space.layout.spawn.x + jitter(), y: space.layout.spawn.y + jitter(), dir: 0, moving: false };
  world.placeIn(u, space.id, pos, true);
  const msg: TravelArrivedAllMsg = { userId: u.stored.id, spaceId: space.id, position: pos, toName: travel.toName };
  world.emitter.toWorld(EV.travelArrivedBroadcast, msg);
  world.broadcastUser(u);
  return true;
}
