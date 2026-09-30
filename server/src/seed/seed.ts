import { BOTS, DESTINATIONS, OFFICES, deskIdFor, homeDeskIdFor, isHomeDeskId, unitIdFor } from "@orbit/shared";
import type { Repo, StoredUser } from "../db/repo.ts";
import type { World } from "../world/state.ts";
import { ensureOffice } from "../world/desks.ts";

export function seed(repo: Repo, world: World, botsEnabled: boolean): void {
  const wanted = new Set(DESTINATIONS.map((d) => d.id));
  for (const d of repo.destinations.all()) if (!wanted.has(d.id)) repo.destinations.delete(d.id);
  for (const d of DESTINATIONS) {
    repo.destinations.upsert({ id: d.id, name: d.name, unitId: unitIdFor(d.at.lat, d.at.lng), template: d.template });
  }
  const keep = new Set(OFFICES.map((o) => unitIdFor(o.at.lat, o.at.lng)));
  migrateHomes(repo);
  if (botsEnabled) seedBots(repo, world);
  else purgeBots(repo);
  purgeOffices(repo, keep);
  for (const o of OFFICES) {
    const unitId = unitIdFor(o.at.lat, o.at.lng);
    ensureOffice(world, unitId, o.name);
    repo.offices.setName(unitId, o.name);
  }
}

function migrateHomes(repo: Repo): void {
  repo.db.transaction(() => {
    for (const u of repo.users.all()) {
      if (!u.homeUnit) continue;
      if (u.homeDeskId && !isHomeDeskId(u.homeDeskId)) repo.desks.release(u.homeDeskId);
      if (u.homeDeskId !== homeDeskIdFor(u.id)) repo.users.setHome(u.id, u.homeUnit, homeDeskIdFor(u.id));
    }
  });
}

function purgeBots(repo: Repo): void {
  repo.db.transaction(() => {
    for (const id of repo.users.botIds()) {
      repo.desks.releaseByOwner(id);
      repo.users.delete(id);
    }
  });
}

function purgeOffices(repo: Repo, keep: Set<string>): void {
  const used = new Set(repo.users.all().map((u) => u.officeUnit).filter((x): x is string => !!x));
  repo.db.transaction(() => {
    for (const o of repo.offices.all()) {
      if (keep.has(o.unitId) || used.has(o.unitId)) continue;
      repo.desks.deleteForOffice(o.unitId);
      repo.offices.delete(o.unitId);
    }
  });
}

function seedBots(repo: Repo, world: World): void {
  const now = Date.now();
  for (const b of BOTS) {
    const homeUnit = unitIdFor(b.home.lat, b.home.lng);
    ensureOffice(world, homeUnit);
    const rowsNeeded = Math.floor(b.homeDeskIdx / 4) + 1;
    const office = repo.offices.get(homeUnit);
    if (office && office.rows < rowsNeeded) {
      repo.db.transaction(() => {
        const count = repo.desks.count(homeUnit);
        for (let idx = count; idx < rowsNeeded * 4; idx++) repo.desks.insert(deskIdFor(homeUnit, idx), homeUnit, idx);
        repo.offices.setRows(homeUnit, rowsNeeded);
      });
      world.refreshOfficeLayout(homeUnit);
    }
    const deskId = deskIdFor(homeUnit, b.homeDeskIdx);
    if (!repo.users.get(b.id)) {
      const stored: StoredUser = {
        id: b.id,
        name: b.name,
        isBot: true,
        avatar: b.avatar,
        homeUnit,
        homeDeskId: homeDeskIdFor(b.id),
        officeUnit: homeUnit,
        officeDeskId: deskId,
        currentUnit: homeUnit,
        spaceId: `office:${homeUnit}`,
        posX: null,
        posY: null,
        onboarded: true,
        lastMode: null,
        createdAt: now,
        lastSeenAt: now,
      };
      repo.users.insert(stored);
    }
    const desk = repo.desks.get(deskId);
    if (desk && desk.ownerId === null) repo.desks.claim(deskId, b.id, now);
    repo.users.setOffice(b.id, homeUnit, deskId);
  }
}
