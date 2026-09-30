import { CONFIG, EV, deskIdFor, deskZoneId, spaceIdForUnit, type DeskAck, type DeskId, type DeskUpdateMsg, type OfficeUpdateMsg, type UnitId } from "@orbit/shared";
import type { LiveUser, World } from "./state.ts";

export function ensureOffice(world: World, unitId: UnitId, name: string = CONFIG.office.name): void {
  const existing = world.repo.offices.get(unitId);
  if (existing) return;
  world.repo.db.transaction(() => {
    world.repo.offices.insert(unitId, name, CONFIG.office.initialRows, world.now());
    const count = CONFIG.office.initialRows * CONFIG.office.desksPerRow;
    for (let idx = 0; idx < count; idx++) world.repo.desks.insert(deskIdFor(unitId, idx), unitId, idx);
  });
  world.refreshOfficeLayout(unitId);
}

function broadcastDesk(world: World, deskId: DeskId, unitId: UnitId, ownerId: string | null): void {
  const msg: DeskUpdateMsg = { deskId, unitId, ownerId };
  world.emitter.toWorld(EV.deskUpdate, msg);
}

export function addDesk(world: World, unitId: UnitId): DeskAck {
  const office = world.repo.offices.get(unitId);
  if (!office) return { ok: false, code: "wrong_office" };
  const count = world.repo.desks.count(unitId);
  const per = CONFIG.office.desksPerRow;
  const nextRows = Math.ceil((count + 1) / per);
  if (nextRows > CONFIG.office.maxRows) return { ok: false, code: "office_full" };
  world.repo.db.transaction(() => {
    world.repo.desks.insert(deskIdFor(unitId, count), unitId, count);
    if (nextRows !== office.rows) world.repo.offices.setRows(unitId, nextRows);
  });
  world.refreshOfficeLayout(unitId);
  const desks = world.repo.desks.forOffice(unitId);
  const msg: OfficeUpdateMsg = { unitId, rows: nextRows, desks };
  world.emitter.toWorld(EV.officeUpdate, msg);
  return { ok: true, released: null, desks };
}

export function claimDesk(world: World, u: LiveUser, deskId: DeskId, role: "home" | "office"): DeskAck {
  const desk = world.repo.desks.get(deskId);
  if (!desk) return { ok: false, code: "unknown_desk" };
  const s = u.stored;
  if (role === "home") return { ok: false, code: "wrong_office" };
  if (s.homeUnit) return { ok: false, code: "works_from_home" };
  const previous = s.officeDeskId;
  if (previous === deskId) return { ok: true, released: null, desks: world.repo.desks.forOffice(desk.unitId) };
  let taken = false;
  world.repo.db.transaction(() => {
    if (!world.repo.desks.claim(deskId, s.id, world.now())) {
      taken = true;
      return;
    }
    if (previous) world.repo.desks.release(previous);
    s.officeUnit = desk.unitId;
    s.officeDeskId = deskId;
    world.repo.users.setOffice(s.id, desk.unitId, deskId);
  });
  if (taken) return { ok: false, code: "desk_taken" };
  afterDeskChange(world, u, previous, desk.unitId);
  broadcastDesk(world, deskId, desk.unitId, s.id);
  if (previous) broadcastDesk(world, previous, desk.unitId, null);
  world.broadcastUser(u);
  return { ok: true, released: previous, desks: world.repo.desks.forOffice(desk.unitId) };
}

export function releaseDesk(world: World, u: LiveUser, role: "home" | "office"): DeskAck {
  const s = u.stored;
  if (role === "home") return { ok: false, code: "no_desk" };
  const deskId = s.officeDeskId;
  if (!deskId) return { ok: false, code: "no_desk" };
  if (!s.homeUnit) return { ok: false, code: "office_required" };
  const desk = world.repo.desks.get(deskId);
  world.repo.db.transaction(() => {
    world.repo.desks.release(deskId);
    s.officeUnit = null;
    s.officeDeskId = null;
    world.repo.users.setOffice(s.id, null, null);
  });
  const unitId = desk?.unitId ?? s.homeUnit ?? "";
  afterDeskChange(world, u, deskId, unitId);
  broadcastDesk(world, deskId, unitId, null);
  world.broadcastUser(u);
  return { ok: true, released: deskId, desks: unitId ? world.repo.desks.forOffice(unitId) : [] };
}

function afterDeskChange(world: World, u: LiveUser, previous: DeskId | null, unitId: UnitId): void {
  const spaceId = spaceIdForUnit(unitId);
  const space = world.spaces.get(spaceId);
  if (!space) return;
  if (previous) {
    world.setZoneOpen(space, deskZoneId(previous), false, null, true);
  }
  if (u.spaceId === spaceId) {
    u.seated = false;
    world.updateSeated(u, space, true);
  }
}
