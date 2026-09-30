import { Router, type Request, type Response } from "express";
import { CONFIG, homeDeskIdFor, isUnitId, normalizeAvatar, type AvatarSpec, type UnitSummary } from "@orbit/shared";
import type { World } from "../world/state.ts";
import { requireSelf, type AuthConfig } from "./auth.ts";
import type { StoredUser } from "../db/repo.ts";
import { addDesk, claimDesk, ensureOffice, releaseDesk } from "../world/desks.ts";
import { unitIsHabitable } from "../world/geo.ts";

export function sanitizeAvatar(input: unknown): AvatarSpec | null {
  if (!input || typeof input !== "object") return null;
  return normalizeAvatar(input);
}

export function sanitizeName(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const n = input.trim().replace(/\s+/g, " ").slice(0, 24);
  return n.length >= 1 ? n : null;
}

function isUserId(id: unknown): id is string {
  return typeof id === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(id);
}

export function createRoutes(world: World, auth: AuthConfig): Router {
  const self = requireSelf(auth);
  const r = Router();

  r.get("/time", (_req, res) => {
    res.json({ serverNow: world.now() });
  });

  r.get("/world", (_req, res) => {
    const users = [...world.users.values()].filter((u) => u.stored.onboarded).map((u) => world.publicUser(u));
    res.json({ serverNow: world.now(), users, offices: world.repo.offices.all(), destinations: world.repo.destinations.all(), maxUsers: CONFIG.maxUsers });
  });

  r.get("/destinations", (_req, res) => {
    res.json({ destinations: world.repo.destinations.all() });
  });

  r.get("/users/:id", self, (req, res) => {
    const live = world.users.get(String(req.params.id));
    res.json({ user: live ? world.meUser(live) : null });
  });

  r.post("/users/:id/setup", self, (req: Request, res: Response) => {
    const id = req.params.id;
    if (!isUserId(id)) {
      res.status(400).json({ error: "bad_id" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = sanitizeName(body.name);
    const avatar = sanitizeAvatar(body.avatar);
    // Work from home: a home unit. Work from an office: one of the admin offices, no home.
    const homeUnit = isUnitId(body.homeUnit) ? body.homeUnit : null;
    const officeUnit = !homeUnit && isUnitId(body.officeUnit) ? body.officeUnit : null;
    if (!name || !avatar || (!homeUnit && !officeUnit)) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    if (homeUnit && !unitIsHabitable(homeUnit)) {
      res.status(400).json({ error: "not_habitable" });
      return;
    }
    if (officeUnit && !world.repo.offices.get(officeUnit)) {
      res.status(400).json({ error: "no_office" });
      return;
    }
    let live = world.users.get(id);
    if (!live) {
      if (world.repo.users.countHumans() >= CONFIG.maxUsers) {
        res.status(403).json({ error: "world_full" });
        return;
      }
      const now = world.now();
      const stored: StoredUser = {
        id,
        name,
        isBot: false,
        avatar,
        homeUnit: null,
        homeDeskId: null,
        officeUnit: null,
        officeDeskId: null,
        currentUnit: null,
        spaceId: null,
        posX: null,
        posY: null,
        onboarded: false,
        lastMode: null,
        createdAt: now,
        lastSeenAt: now,
      };
      world.repo.users.insert(stored);
      live = world.addUser(stored);
    } else {
      live.stored.name = name;
      live.stored.avatar = avatar;
      world.repo.users.setProfile(id, name, avatar);
    }
    const s = live.stored;
    if (homeUnit) {
      if (s.homeUnit !== homeUnit || s.homeDeskId !== homeDeskIdFor(id)) {
        s.homeUnit = homeUnit;
        s.homeDeskId = homeDeskIdFor(id);
        world.repo.users.setHome(id, homeUnit, s.homeDeskId);
      }
      if (s.officeUnit || s.officeDeskId) {
        if (s.officeDeskId) world.repo.desks.release(s.officeDeskId);
        s.officeUnit = null;
        s.officeDeskId = null;
        world.repo.users.setOffice(id, null, null);
      }
    } else if (officeUnit) {
      if (s.homeUnit) {
        s.homeUnit = null;
        s.homeDeskId = null;
        world.repo.users.setHome(id, null, null);
      }
      if (s.officeUnit !== officeUnit) {
        if (s.officeDeskId) world.repo.desks.release(s.officeDeskId);
        s.officeUnit = officeUnit;
        s.officeDeskId = null;
        world.repo.users.setOffice(id, officeUnit, null);
      }
    }
    res.json({ user: world.meUser(live), office: null, desks: [] });
  });

  r.post("/users/:id/complete", self, (req, res) => {
    const live = world.users.get(String(req.params.id));
    if (!live || (!live.stored.homeUnit && !live.stored.officeUnit)) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (live.stored.homeUnit && live.stored.homeDeskId !== homeDeskIdFor(live.stored.id)) {
      live.stored.homeDeskId = homeDeskIdFor(live.stored.id);
      world.repo.users.setHome(live.stored.id, live.stored.homeUnit, live.stored.homeDeskId);
    }
    if (typeof body.officeDeskId === "string") {
      const officeClaim = claimDesk(world, live, body.officeDeskId, "office");
      if (!officeClaim.ok) {
        res.status(409).json({ error: officeClaim.code, stage: "office" });
        return;
      }
    }
    if (!live.stored.homeUnit && !live.stored.officeDeskId) {
      res.status(400).json({ error: "desk_required" });
      return;
    }
    if (!live.stored.onboarded) {
      live.stored.onboarded = true;
      world.repo.users.setOnboarded(live.stored.id);
    }
    live.startInOffice = typeof body.officeDeskId === "string" && !!live.stored.officeDeskId;
    if (live.presence === "offline") world.placeAtBase(live, true);
    world.broadcastUser(live);
    res.json({ user: world.meUser(live) });
  });

  r.patch("/users/:id", self, (req, res) => {
    const live = world.users.get(String(req.params.id));
    if (!live) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const name = body.name !== undefined ? sanitizeName(body.name) : live.stored.name;
    const avatar = body.avatar !== undefined ? sanitizeAvatar(body.avatar) : live.stored.avatar;
    if (!name || !avatar) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    live.stored.name = name;
    live.stored.avatar = avatar;
    world.repo.users.setProfile(live.stored.id, name, avatar);
    if (body.homeUnit !== undefined) {
      const homeUnit = body.homeUnit;
      if (!live.stored.homeUnit) {
        res.status(400).json({ error: "no_home" });
        return;
      }
      if (!isUnitId(homeUnit) || !unitIsHabitable(homeUnit)) {
        res.status(400).json({ error: "not_habitable" });
        return;
      }
      if (homeUnit !== live.stored.homeUnit) {
        live.stored.homeUnit = homeUnit;
        live.stored.homeDeskId = homeDeskIdFor(live.stored.id);
        world.repo.users.setHome(live.stored.id, homeUnit, live.stored.homeDeskId);
        world.rehome(live);
      }
    }
    world.broadcastUser(live);
    res.json({ user: world.meUser(live) });
  });

  r.get("/offices/:unitId", (req, res) => {
    const unitId = String(req.params.unitId);
    const office = world.repo.offices.get(unitId);
    if (!office) {
      res.status(404).json({ error: "no_office" });
      return;
    }
    const space = world.getSpace(`office:${unitId}`);
    res.json({ office, desks: world.repo.desks.forOffice(unitId), rows: office.rows, height: space?.layout.height ?? 900, people: world.usersInUnit(unitId).map((u) => world.publicUser(u)) });
  });

  r.get("/units/:unitId", (req, res) => {
    const unitId = String(req.params.unitId);
    if (!isUnitId(unitId)) {
      res.status(400).json({ error: "bad_unit" });
      return;
    }
    const summary: UnitSummary = {
      unitId,
      office: world.repo.offices.get(unitId),
      destination: world.repo.destinations.all().find((d) => d.unitId === unitId) ?? null,
      people: world.usersInUnit(unitId).map((u) => world.publicUser(u)),
      tz: null,
    };
    res.json({ ...summary, habitable: unitIsHabitable(unitId), residents: [...world.users.values()].filter((u) => u.stored.onboarded && u.stored.homeUnit === unitId).map((u) => world.publicUser(u)) });
  });

  return r;
}
