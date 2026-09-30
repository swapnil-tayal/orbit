import { normalizeAvatar, type AvatarSpec, type DeskId, type DeskInfo, type DestinationInfo, type OfficeInfo, type TravelMode, type UnitId, type UserId } from "@orbit/shared";
import type { Db, Row } from "./driver.ts";

export interface StoredUser {
  id: UserId;
  name: string;
  isBot: boolean;
  avatar: AvatarSpec;
  homeUnit: UnitId | null;
  homeDeskId: DeskId | null;
  officeUnit: UnitId | null;
  officeDeskId: DeskId | null;
  currentUnit: UnitId | null;
  spaceId: string | null;
  posX: number | null;
  posY: number | null;
  onboarded: boolean;
  lastMode: TravelMode | null;
  createdAt: number;
  lastSeenAt: number;
}

function rowToUser(r: Row): StoredUser {
  return {
    id: String(r.id),
    name: String(r.name),
    isBot: Number(r.is_bot) === 1,
    avatar: normalizeAvatar(JSON.parse(String(r.avatar_json))),
    homeUnit: (r.home_unit as string | null) ?? null,
    homeDeskId: (r.home_desk_id as string | null) ?? null,
    officeUnit: (r.office_unit as string | null) ?? null,
    officeDeskId: (r.office_desk_id as string | null) ?? null,
    currentUnit: (r.current_unit as string | null) ?? null,
    spaceId: (r.space_id as string | null) ?? null,
    posX: r.pos_x == null ? null : Number(r.pos_x),
    posY: r.pos_y == null ? null : Number(r.pos_y),
    onboarded: Number(r.onboarded) === 1,
    lastMode: (r.last_mode as TravelMode | null) ?? null,
    createdAt: Number(r.created_at),
    lastSeenAt: Number(r.last_seen_at),
  };
}

function rowToDesk(r: Row): DeskInfo {
  return { id: String(r.id), unitId: String(r.unit_id), idx: Number(r.idx), ownerId: (r.owner_id as string | null) ?? null };
}

export function createRepo(db: Db) {
  const q = {
    userGet: db.prepare("SELECT * FROM users WHERE id = ?"),
    userAll: db.prepare("SELECT * FROM users ORDER BY created_at"),
    userCountHumans: db.prepare("SELECT COUNT(*) AS n FROM users WHERE is_bot = 0"),
    userInsert: db.prepare(
      "INSERT INTO users (id, name, is_bot, avatar_json, home_unit, home_desk_id, office_unit, office_desk_id, current_unit, space_id, pos_x, pos_y, onboarded, last_mode, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ),
    userProfile: db.prepare("UPDATE users SET name = ?, avatar_json = ? WHERE id = ?"),
    userByGoogle: db.prepare("SELECT id FROM users WHERE google_sub = ?"),
    userGoogleOf: db.prepare("SELECT google_sub FROM users WHERE id = ?"),
    userSetGoogle: db.prepare("UPDATE users SET google_sub = ?, email = ? WHERE id = ?"),
    userHome: db.prepare("UPDATE users SET home_unit = ?, home_desk_id = ? WHERE id = ?"),
    userOffice: db.prepare("UPDATE users SET office_unit = ?, office_desk_id = ? WHERE id = ?"),
    userOnboarded: db.prepare("UPDATE users SET onboarded = 1 WHERE id = ?"),
    userLocation: db.prepare("UPDATE users SET current_unit = ?, space_id = ?, pos_x = ?, pos_y = ? WHERE id = ?"),
    userPosition: db.prepare("UPDATE users SET pos_x = ?, pos_y = ? WHERE id = ?"),
    userSeen: db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?"),
    userLastMode: db.prepare("UPDATE users SET last_mode = ? WHERE id = ?"),
    userDelete: db.prepare("DELETE FROM users WHERE id = ?"),
    userBotIds: db.prepare("SELECT id FROM users WHERE is_bot = 1"),
    officeUnitsWithoutHumans: db.prepare("SELECT unit_id FROM offices o WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.is_bot = 0 AND (u.home_unit = o.unit_id OR u.office_unit = o.unit_id))"),
    officeDelete: db.prepare("DELETE FROM offices WHERE unit_id = ?"),
    deskReleaseByOwner: db.prepare("UPDATE desks SET owner_id = NULL, claimed_at = NULL WHERE owner_id = ?"),
    deskDeleteForOffice: db.prepare("DELETE FROM desks WHERE unit_id = ?"),
    officeGet: db.prepare("SELECT * FROM offices WHERE unit_id = ?"),
    officeAll: db.prepare("SELECT o.*, (SELECT COUNT(*) FROM desks d WHERE d.unit_id = o.unit_id) AS desk_count FROM offices o"),
    officeInsert: db.prepare("INSERT INTO offices (unit_id, name, rows, created_at) VALUES (?, ?, ?, ?)"),
    officeRows: db.prepare("UPDATE offices SET rows = ? WHERE unit_id = ?"),
    officeName: db.prepare("UPDATE offices SET name = ? WHERE unit_id = ?"),
    deskGet: db.prepare("SELECT * FROM desks WHERE id = ?"),
    deskForOffice: db.prepare("SELECT * FROM desks WHERE unit_id = ? ORDER BY idx"),
    deskInsert: db.prepare("INSERT OR IGNORE INTO desks (id, unit_id, idx) VALUES (?, ?, ?)"),
    deskClaim: db.prepare("UPDATE desks SET owner_id = ?, claimed_at = ? WHERE id = ? AND owner_id IS NULL"),
    deskRelease: db.prepare("UPDATE desks SET owner_id = NULL, claimed_at = NULL WHERE id = ?"),
    deskCount: db.prepare("SELECT COUNT(*) AS n FROM desks WHERE unit_id = ?"),
    deskFirstFree: db.prepare("SELECT * FROM desks WHERE unit_id = ? AND owner_id IS NULL ORDER BY idx LIMIT 1"),
    destAll: db.prepare("SELECT * FROM destinations ORDER BY name"),
    destUpsert: db.prepare("INSERT OR REPLACE INTO destinations (id, name, unit_id, template) VALUES (?, ?, ?, ?)"),
    destDelete: db.prepare("DELETE FROM destinations WHERE id = ?"),
  };

  return {
    db,
    users: {
      get: (id: UserId): StoredUser | null => {
        const r = q.userGet.get(id);
        return r ? rowToUser(r) : null;
      },
      all: (): StoredUser[] => q.userAll.all().map(rowToUser),
      countHumans: (): number => Number(q.userCountHumans.get()?.n ?? 0),
      insert: (u: StoredUser): void => {
        q.userInsert.run(
          u.id,
          u.name,
          u.isBot ? 1 : 0,
          JSON.stringify(u.avatar),
          u.homeUnit,
          u.homeDeskId,
          u.officeUnit,
          u.officeDeskId,
          u.currentUnit,
          u.spaceId,
          u.posX,
          u.posY,
          u.onboarded ? 1 : 0,
          u.lastMode,
          u.createdAt,
          u.lastSeenAt,
        );
      },
      setProfile: (id: UserId, name: string, avatar: AvatarSpec): void => {
        q.userProfile.run(name, JSON.stringify(avatar), id);
      },
      setHome: (id: UserId, homeUnit: UnitId | null, homeDeskId: DeskId | null): void => {
        q.userHome.run(homeUnit, homeDeskId, id);
      },
      setOffice: (id: UserId, officeUnit: UnitId | null, officeDeskId: DeskId | null): void => {
        q.userOffice.run(officeUnit, officeDeskId, id);
      },
      setOnboarded: (id: UserId): void => {
        q.userOnboarded.run(id);
      },
      byGoogleSub: (sub: string): UserId | null => {
        const r = q.userByGoogle.get(sub);
        return r ? String(r.id) : null;
      },
      googleSubOf: (id: UserId): string | null => {
        const r = q.userGoogleOf.get(id);
        return r && r.google_sub != null ? String(r.google_sub) : null;
      },
      setGoogle: (id: UserId, sub: string, email: string | null): void => {
        q.userSetGoogle.run(sub, email, id);
      },
      setLocation: (id: UserId, currentUnit: UnitId | null, spaceId: string | null, x: number, y: number): void => {
        q.userLocation.run(currentUnit, spaceId, x, y, id);
      },
      setPosition: (id: UserId, x: number, y: number): void => {
        q.userPosition.run(x, y, id);
      },
      touch: (id: UserId, ts: number): void => {
        q.userSeen.run(ts, id);
      },
      setLastMode: (id: UserId, mode: TravelMode): void => {
        q.userLastMode.run(mode, id);
      },
      delete: (id: UserId): void => {
        q.userDelete.run(id);
      },
      botIds: (): UserId[] => q.userBotIds.all().map((r) => String(r.id)),
    },
    offices: {
      get: (unitId: UnitId): OfficeInfo | null => {
        const r = q.officeGet.get(unitId);
        if (!r) return null;
        const n = Number(q.deskCount.get(unitId)?.n ?? 0);
        return { unitId: String(r.unit_id), name: String(r.name), rows: Number(r.rows), deskCount: n };
      },
      all: (): OfficeInfo[] =>
        q.officeAll.all().map((r) => ({ unitId: String(r.unit_id), name: String(r.name), rows: Number(r.rows), deskCount: Number(r.desk_count) })),
      insert: (unitId: UnitId, name: string, rows: number, now: number): void => {
        q.officeInsert.run(unitId, name, rows, now);
      },
      setRows: (unitId: UnitId, rows: number): void => {
        q.officeRows.run(rows, unitId);
      },
      setName: (unitId: UnitId, name: string): void => {
        q.officeName.run(name, unitId);
      },
      unitsWithoutHumans: (): UnitId[] => q.officeUnitsWithoutHumans.all().map((r) => String(r.unit_id)),
      delete: (unitId: UnitId): void => {
        q.officeDelete.run(unitId);
      },
    },
    desks: {
      get: (id: DeskId): DeskInfo | null => {
        const r = q.deskGet.get(id);
        return r ? rowToDesk(r) : null;
      },
      forOffice: (unitId: UnitId): DeskInfo[] => q.deskForOffice.all(unitId).map(rowToDesk),
      insert: (id: DeskId, unitId: UnitId, idx: number): void => {
        q.deskInsert.run(id, unitId, idx);
      },
      claim: (id: DeskId, ownerId: UserId, now: number): boolean => q.deskClaim.run(ownerId, now, id).changes === 1,
      release: (id: DeskId): void => {
        q.deskRelease.run(id);
      },
      count: (unitId: UnitId): number => Number(q.deskCount.get(unitId)?.n ?? 0),
      firstFree: (unitId: UnitId): DeskInfo | null => {
        const r = q.deskFirstFree.get(unitId);
        return r ? rowToDesk(r) : null;
      },
      releaseByOwner: (ownerId: UserId): void => {
        q.deskReleaseByOwner.run(ownerId);
      },
      deleteForOffice: (unitId: UnitId): void => {
        q.deskDeleteForOffice.run(unitId);
      },
    },
    destinations: {
      all: (): DestinationInfo[] =>
        q.destAll.all().map((r) => ({ id: String(r.id), name: String(r.name), unitId: String(r.unit_id), template: "island" as const })),
      upsert: (d: DestinationInfo): void => {
        q.destUpsert.run(d.id, d.name, d.unitId, d.template);
      },
      delete: (id: string): void => {
        q.destDelete.run(id);
      },
    },
  };
}

export type Repo = ReturnType<typeof createRepo>;
