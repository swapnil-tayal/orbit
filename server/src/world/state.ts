import {
  CONFIG,
  EV,
  deskZoneId,
  destinationLayout,
  homeDeskIdFor,
  homeLayout,
  officeLayout,
  parseDeskId,
  parseSpaceId,
  spaceIdForDestination,
  spaceIdForHome,
  spaceIdForUnit,
  type DeskId,
  type DeskInfo,
  type MeUser,
  type Position,
  type Presence,
  type PublicUser,
  type SpaceId,
  type SpaceLayout,
  type SpaceSnapshot,
  type TravelState,
  type UnitId,
  type UserId,
  type WorldSnapshot,
  type ZoneDef,
  type ZoneId,
  type ZoneMembersMsg,
  type ZoneStateMsg,
  type UserUpdateMsg,
  type SpaceJoinMsg,
  type SpaceLeaveMsg,
  type PosBroadcast,
  type ScreenBroadcast,
  type SpeakingBroadcast,
} from "@orbit/shared";
import type { Repo, StoredUser } from "../db/repo.ts";
import { nullEmitter, spaceRoom, WORLD_ROOM, type Emitter } from "./emitter.ts";

export interface LiveUser {
  stored: StoredUser;
  presence: Presence;
  travel: TravelState | null;
  spaceId: SpaceId | null;
  pos: Position;
  seated: boolean;
  speaking: boolean;
  sharing: boolean;
  zoneId: ZoneId | null;
  socketId: string | null;
  offlineTimer: NodeJS.Timeout | null;
  homeTimer: NodeJS.Timeout | null;
  travelTimer: NodeJS.Timeout | null;
  lastPosAt: number;
  lastSpeakingAt: number;
  posDirty: boolean;
  startInOffice: boolean;
}

export interface LiveZone {
  def: ZoneDef;
  open: boolean;
  members: Set<UserId>;
}

export interface LiveSpace {
  id: SpaceId;
  kind: "office" | "dest" | "home";
  unitId: UnitId;
  destId: string | null;
  ownerId: UserId | null;
  name: string;
  layout: SpaceLayout;
  members: Set<UserId>;
  zones: Map<ZoneId, LiveZone>;
}

export class World {
  readonly users = new Map<UserId, LiveUser>();
  readonly spaces = new Map<SpaceId, LiveSpace>();
  emitter: Emitter = nullEmitter;

  constructor(readonly repo: Repo) {}

  now(): number {
    return Date.now();
  }

  loadAll(): void {
    for (const stored of this.repo.users.all()) {
      const live = this.makeLive(stored);
      this.users.set(stored.id, live);
    }
    for (const live of this.users.values()) {
      if (!live.stored.onboarded) continue;
      this.placeAtBase(live, false);
      live.presence = "offline";
    }
  }

  makeLive(stored: StoredUser): LiveUser {
    return {
      stored,
      presence: "offline",
      travel: null,
      spaceId: null,
      pos: { x: 0, y: 0, dir: 0, moving: false },
      seated: false,
      speaking: false,
      sharing: false,
      zoneId: null,
      socketId: null,
      offlineTimer: null,
      homeTimer: null,
      travelTimer: null,
      lastPosAt: 0,
      lastSpeakingAt: 0,
      posDirty: false,
      startInOffice: false,
    };
  }

  addUser(stored: StoredUser): LiveUser {
    const live = this.makeLive(stored);
    this.users.set(stored.id, live);
    return live;
  }

  publicUser(u: LiveUser): PublicUser {
    const s = u.stored;
    return {
      id: s.id,
      name: s.name,
      avatar: s.avatar,
      isBot: s.isBot,
      homeUnit: s.homeUnit,
      homeDeskId: s.homeDeskId,
      officeUnit: s.officeUnit,
      officeDeskId: s.officeDeskId,
      currentUnit: s.currentUnit,
      spaceId: u.spaceId,
      presence: u.presence,
      travel: u.travel,
      seated: u.seated,
    };
  }

  meUser(u: LiveUser): MeUser {
    return { ...this.publicUser(u), onboarded: u.stored.onboarded, lastMode: u.stored.lastMode };
  }

  broadcastUser(u: LiveUser, patch?: Partial<PublicUser>): void {
    const msg: UserUpdateMsg = { userId: u.stored.id, patch: patch ?? this.publicUser(u) };
    this.emitter.toWorld(EV.userUpdate, msg);
  }

  spaceName(space: LiveSpace): string {
    return space.name;
  }

  getSpace(spaceId: SpaceId): LiveSpace | null {
    const hit = this.spaces.get(spaceId);
    if (hit) return hit;
    const parsed = parseSpaceId(spaceId);
    if (!parsed) return null;
    if (parsed.kind === "office") {
      const office = this.repo.offices.get(parsed.unitId);
      if (!office) return null;
      const layout = officeLayout(parsed.unitId, office.rows);
      const space: LiveSpace = { id: spaceId, kind: "office", unitId: parsed.unitId, destId: null, ownerId: null, name: office.name, layout, members: new Set(), zones: new Map() };
      this.rebuildZones(space);
      this.spaces.set(spaceId, space);
      return space;
    }
    if (parsed.kind === "home") {
      const owner = this.users.get(parsed.userId);
      if (!owner || !owner.stored.homeUnit) return null;
      const layout = homeLayout(parsed.userId, owner.stored.homeUnit);
      const space: LiveSpace = { id: spaceId, kind: "home", unitId: owner.stored.homeUnit, destId: null, ownerId: parsed.userId, name: `${owner.stored.name}'s home`, layout, members: new Set(), zones: new Map() };
      this.rebuildZones(space);
      this.spaces.set(spaceId, space);
      return space;
    }
    const dest = this.repo.destinations.all().find((d) => d.id === parsed.destId);
    if (!dest) return null;
    const layout = destinationLayout(dest.id, dest.unitId);
    const space: LiveSpace = { id: spaceId, kind: "dest", unitId: dest.unitId, destId: dest.id, ownerId: null, name: dest.name, layout, members: new Set(), zones: new Map() };
    this.rebuildZones(space);
    this.spaces.set(spaceId, space);
    return space;
  }

  rebuildZones(space: LiveSpace): void {
    const old = space.zones;
    space.zones = new Map();
    for (const def of space.layout.zones) {
      const prev = old.get(def.id);
      space.zones.set(def.id, { def, open: prev ? prev.open : def.kind !== "desk", members: prev ? prev.members : new Set() });
    }
  }

  refreshOfficeLayout(unitId: UnitId): LiveSpace | null {
    const spaceId = spaceIdForUnit(unitId);
    const space = this.spaces.get(spaceId);
    if (!space) return this.getSpace(spaceId);
    const office = this.repo.offices.get(unitId);
    if (!office) return space;
    space.layout = officeLayout(unitId, office.rows);
    this.rebuildZones(space);
    return space;
  }

  deskFor(u: LiveUser, space: LiveSpace): { deskId: DeskId; idx: number } | null {
    const s = u.stored;
    if (space.kind === "home") return space.ownerId === s.id ? { deskId: homeDeskIdFor(s.id), idx: 0 } : null;
    if (space.kind !== "office") return null;
    if (s.officeUnit === space.unitId && s.officeDeskId) {
      const p = parseDeskId(s.officeDeskId);
      if (p) return { deskId: s.officeDeskId, idx: p.idx };
    }
    return null;
  }

  homePosition(u: LiveUser): { spaceId: SpaceId; pos: Position } | null {
    const s = u.stored;
    if (!s.homeUnit) return null;
    const spaceId = spaceIdForHome(s.id);
    const space = this.getSpace(spaceId);
    if (!space) return null;
    const seat = this.seatIn(space, 0);
    if (seat) return { spaceId, pos: { x: seat.x, y: seat.y, dir: 0, moving: false } };
    return { spaceId, pos: { x: space.layout.spawn.x, y: space.layout.spawn.y, dir: 0, moving: false } };
  }

  seatIn(space: LiveSpace, idx: number): { x: number; y: number } | null {
    const def = space.layout.desks.find((d) => d.idx === idx);
    return def ? { x: def.seatX, y: def.seatY } : null;
  }

  placeAtOfficeDesk(u: LiveUser, broadcast = true): boolean {
    const s = u.stored;
    if (!s.officeUnit) return false;
    const space = this.getSpace(spaceIdForUnit(s.officeUnit));
    if (!space) return false;
    const p = s.officeDeskId ? parseDeskId(s.officeDeskId) : null;
    const seat = (p ? this.seatIn(space, p.idx) : null) ?? { x: space.layout.spawn.x, y: space.layout.spawn.y };
    this.placeIn(u, space.id, { x: seat.x, y: seat.y, dir: 0, moving: false }, broadcast);
    return true;
  }

  /** Where someone belongs when they come online or go offline: home if they work from home, else their office. */
  placeAtBase(u: LiveUser, broadcast = true): void {
    if (u.stored.homeUnit) this.placeAtHome(u, broadcast);
    else this.placeAtOfficeDesk(u, broadcast);
  }

  rehome(u: LiveUser): void {
    const spaceId = spaceIdForHome(u.stored.id);
    const space = this.spaces.get(spaceId);
    if (space) {
      const ids = [...space.members];
      for (const id of ids) {
        const m = this.users.get(id);
        if (m) this.removeFromSpace(m, "left", undefined, true);
      }
      this.spaces.delete(spaceId);
      for (const id of ids) {
        const m = this.users.get(id);
        if (m && m.stored.id !== u.stored.id) this.placeAtBase(m, true);
      }
    }
    if (!u.travel) this.placeAtBase(u, true);
  }

  placeAtHome(u: LiveUser, broadcast = true): void {
    const home = this.homePosition(u);
    if (!home) return;
    u.stored.currentUnit = u.stored.homeUnit;
    this.placeIn(u, home.spaceId, home.pos, broadcast);
  }

  placeIn(u: LiveUser, spaceId: SpaceId, pos: Position, broadcast = true, leaveReason: SpaceLeaveMsg["reason"] = "left", toName?: string): void {
    const target = this.getSpace(spaceId);
    if (!target) return;
    if (u.spaceId && u.spaceId !== spaceId) this.removeFromSpace(u, leaveReason, toName, broadcast);
    u.spaceId = spaceId;
    u.stored.spaceId = spaceId;
    u.stored.currentUnit = target.unitId;
    u.pos = { ...pos };
    u.seated = false;
    target.members.add(u.stored.id);
    if (u.socketId) this.emitter.joinRoom(u.socketId, spaceRoom(spaceId));
    this.repo.users.setLocation(u.stored.id, target.unitId, spaceId, pos.x, pos.y);
    if (broadcast) {
      const msg: SpaceJoinMsg = { user: this.publicUser(u), position: u.pos };
      this.emitter.toSpace(spaceId, EV.spaceJoin, msg);
      if (u.socketId) this.emitter.toSocket(u.socketId, EV.spaceSnapshot, this.spaceSnapshot(target));
    }
    this.updateSeated(u, target, broadcast);
  }

  removeFromSpace(u: LiveUser, reason: SpaceLeaveMsg["reason"], toName?: string, broadcast = true): void {
    if (!u.spaceId) return;
    const space = this.spaces.get(u.spaceId);
    this.leaveZone(u, broadcast);
    if (space) {
      space.members.delete(u.stored.id);
      if (u.seated) this.setSeated(u, space, false, broadcast);
      if (broadcast) {
        const msg: SpaceLeaveMsg = { userId: u.stored.id, reason, toName };
        this.emitter.toSpace(space.id, EV.spaceLeave, msg);
      }
    }
    if (u.socketId) this.emitter.leaveRoom(u.socketId, spaceRoom(u.spaceId));
    u.spaceId = null;
    u.stored.spaceId = null;
  }

  spaceSnapshot(space: LiveSpace): SpaceSnapshot {
    const members: Record<UserId, Position> = {};
    const speaking: UserId[] = [];
    const sharing: UserId[] = [];
    for (const id of space.members) {
      const m = this.users.get(id);
      if (!m) continue;
      members[id] = m.pos;
      if (m.speaking) speaking.push(id);
      if (m.sharing) sharing.push(id);
    }
    const zones: SpaceSnapshot["zones"] = {};
    for (const [zid, z] of space.zones) zones[zid] = { open: z.open, members: [...z.members] };
    const desks: DeskInfo[] = space.kind === "office" ? this.repo.desks.forOffice(space.unitId) : space.kind === "home" && space.ownerId ? [{ id: homeDeskIdFor(space.ownerId), unitId: space.unitId, idx: 0, ownerId: space.ownerId }] : [];
    return {
      id: space.id,
      kind: space.kind,
      unitId: space.unitId,
      destId: space.destId,
      ownerId: space.ownerId,
      rows: space.layout.rows,
      desks,
      members,
      zones,
      speaking,
      sharing,
    };
  }

  snapshotFor(u: LiveUser): WorldSnapshot {
    const users = [...this.users.values()].filter((x) => x.stored.onboarded).map((x) => this.publicUser(x));
    const space = u.spaceId ? this.spaces.get(u.spaceId) : null;
    return {
      serverNow: this.now(),
      me: this.meUser(u),
      users,
      space: space ? this.spaceSnapshot(space) : null,
      offices: this.repo.offices.all(),
      destinations: this.repo.destinations.all(),
    };
  }

  updatePos(u: LiveUser, pos: Position, broadcast = true): void {
    if (!u.spaceId) return;
    const space = this.spaces.get(u.spaceId);
    if (!space) return;
    const x = Math.max(0, Math.min(space.layout.width, pos.x));
    const y = Math.max(0, Math.min(space.layout.height, pos.y));
    u.pos = { x, y, dir: pos.dir ?? 0, moving: !!pos.moving };
    u.posDirty = true;
    if (broadcast) {
      const msg: PosBroadcast = { userId: u.stored.id, ...u.pos };
      this.emitter.toSpace(space.id, EV.pos, msg);
    }
    this.updateSeated(u, space, broadcast);
  }

  flushPositions(): void {
    for (const u of this.users.values()) {
      if (!u.posDirty) continue;
      u.posDirty = false;
      this.repo.users.setPosition(u.stored.id, u.pos.x, u.pos.y);
    }
  }

  updateSeated(u: LiveUser, space: LiveSpace, broadcast = true): void {
    const desk = this.deskFor(u, space);
    if (!desk) {
      if (u.seated) this.setSeated(u, space, false, broadcast);
      return;
    }
    const seat = this.seatIn(space, desk.idx);
    if (!seat) return;
    const d = Math.hypot(u.pos.x - seat.x, u.pos.y - seat.y);
    const online = u.presence === "online";
    if (!u.seated && online && d < CONFIG.movement.seatedEnterUnits) this.setSeated(u, space, true, broadcast);
    else if (u.seated && (!online || d > CONFIG.movement.seatedExitUnits)) this.setSeated(u, space, false, broadcast);
  }

  setSeated(u: LiveUser, space: LiveSpace, seated: boolean, broadcast = true): void {
    if (u.seated === seated) return;
    u.seated = seated;
    const desk = this.deskFor(u, space);
    if (desk) {
      const zid = deskZoneId(desk.deskId);
      this.setZoneOpen(space, zid, seated, u, broadcast);
    }
    if (broadcast) this.broadcastUser(u, { seated });
  }

  setZoneOpen(space: LiveSpace, zoneId: ZoneId, open: boolean, owner: LiveUser | null, broadcast = true): void {
    const zone = space.zones.get(zoneId);
    if (!zone || zone.open === open) return;
    zone.open = open;
    if (open) {
      if (owner) {
        this.leaveZone(owner, broadcast);
        owner.zoneId = zoneId;
        zone.members.add(owner.stored.id);
      }
      if (broadcast) {
        const st: ZoneStateMsg = { zoneId, open: true };
        this.emitter.toSpace(space.id, EV.zoneState, st);
        this.broadcastZoneMembers(space, zone);
      }
      return;
    }
    for (const id of zone.members) {
      const m = this.users.get(id);
      if (m) m.zoneId = null;
    }
    zone.members.clear();
    if (broadcast) {
      const st: ZoneStateMsg = { zoneId, open: false };
      this.emitter.toSpace(space.id, EV.zoneState, st);
      const msg: ZoneMembersMsg = { zoneId, members: [], reason: "owner_left" };
      this.emitter.toSpace(space.id, EV.zoneMembers, msg);
    }
  }

  broadcastZoneMembers(space: LiveSpace, zone: LiveZone): void {
    const msg: ZoneMembersMsg = { zoneId: zone.def.id, members: [...zone.members] };
    this.emitter.toSpace(space.id, EV.zoneMembers, msg);
  }

  enterZone(u: LiveUser, zoneId: ZoneId): { ok: true; members: UserId[] } | { ok: false; code: "closed" | "wrong_space" | "too_far" | "unknown_zone" } {
    if (!u.spaceId) return { ok: false, code: "wrong_space" };
    const space = this.spaces.get(u.spaceId);
    if (!space) return { ok: false, code: "wrong_space" };
    const zone = space.zones.get(zoneId);
    if (!zone) return { ok: false, code: "unknown_zone" };
    if (!zone.open) return { ok: false, code: "closed" };
    const d = Math.hypot(u.pos.x - zone.def.x, u.pos.y - zone.def.y);
    if (d > zone.def.r * 2) return { ok: false, code: "too_far" };
    if (u.zoneId === zoneId) return { ok: true, members: [...zone.members] };
    this.leaveZone(u, true);
    u.zoneId = zoneId;
    zone.members.add(u.stored.id);
    this.broadcastZoneMembers(space, zone);
    return { ok: true, members: [...zone.members] };
  }

  leaveZone(u: LiveUser, broadcast = true): void {
    if (!u.zoneId || !u.spaceId) {
      u.zoneId = null;
      return;
    }
    const space = this.spaces.get(u.spaceId);
    const zone = space?.zones.get(u.zoneId);
    u.zoneId = null;
    if (!space || !zone) return;
    zone.members.delete(u.stored.id);
    if (u.speaking) this.setSpeaking(u, false, broadcast);
    if (u.sharing) this.setSharing(u, false, broadcast);
    if (broadcast) this.broadcastZoneMembers(space, zone);
  }

  setSpeaking(u: LiveUser, on: boolean, broadcast = true): void {
    if (u.speaking === on) return;
    u.speaking = on;
    if (broadcast && u.spaceId) {
      const msg: SpeakingBroadcast = { userId: u.stored.id, on };
      this.emitter.toSpace(u.spaceId, EV.speaking, msg);
    }
  }

  setSharing(u: LiveUser, on: boolean, broadcast = true): void {
    if (u.sharing === on) return;
    u.sharing = on;
    if (broadcast && u.spaceId) {
      const msg: ScreenBroadcast = { userId: u.stored.id, on };
      this.emitter.toSpace(u.spaceId, EV.screen, msg);
    }
  }

  bindSocket(u: LiveUser, socketId: string): void {
    if (u.socketId && u.socketId !== socketId) {
      this.emitter.toSocket(u.socketId, EV.sessionReplaced, {});
      this.emitter.disconnectSocket(u.socketId);
    }
    u.socketId = socketId;
    if (u.offlineTimer) {
      clearTimeout(u.offlineTimer);
      u.offlineTimer = null;
    }
    const pendingHome = !!u.homeTimer;
    if (u.homeTimer) {
      clearTimeout(u.homeTimer);
      u.homeTimer = null;
    }
    this.emitter.joinRoom(socketId, WORLD_ROOM);
    const wasOffline = u.presence === "offline";
    const space = u.spaceId ? this.spaces.get(u.spaceId) : null;
    if (!space || (wasOffline && !pendingHome)) {
      u.presence = "online";
      const toOffice = u.startInOffice;
      u.startInOffice = false;
      if (!toOffice || !this.placeAtOfficeDesk(u, true)) this.placeAtBase(u, true);
    } else {
      u.presence = "online";
      this.emitter.joinRoom(socketId, spaceRoom(space.id));
      if (wasOffline) {
        const msg: SpaceJoinMsg = { user: this.publicUser(u), position: u.pos };
        this.emitter.toSpace(space.id, EV.spaceJoin, msg);
      }
      this.emitter.toSocket(socketId, EV.spaceSnapshot, this.spaceSnapshot(space));
      this.updateSeated(u, space, true);
    }
    u.stored.lastSeenAt = this.now();
    this.repo.users.touch(u.stored.id, u.stored.lastSeenAt);
    this.broadcastUser(u);
  }

  onDisconnect(u: LiveUser, socketId: string): void {
    if (u.socketId !== socketId) return;
    u.socketId = null;
    this.leaveZone(u, true);
    if (u.offlineTimer) clearTimeout(u.offlineTimer);
    u.offlineTimer = setTimeout(() => this.goOffline(u), CONFIG.presence.offlineGraceMs);
  }

  goOffline(u: LiveUser): void {
    if (u.offlineTimer) {
      clearTimeout(u.offlineTimer);
      u.offlineTimer = null;
    }
    if (u.travelTimer) {
      clearTimeout(u.travelTimer);
      u.travelTimer = null;
    }
    const wasTraveling = !!u.travel;
    u.travel = null;
    u.presence = "offline";
    u.speaking = false;
    u.sharing = false;
    this.leaveZone(u, true);
    if (u.spaceId) {
      const space = this.spaces.get(u.spaceId);
      if (space && u.seated) this.setSeated(u, space, false, true);
    }
    u.stored.lastSeenAt = this.now();
    this.repo.users.touch(u.stored.id, u.stored.lastSeenAt);
    if (CONFIG.presence.returnHomeOnOffline) {
      if (wasTraveling || !u.spaceId) this.returnHome(u);
      else {
        if (u.homeTimer) clearTimeout(u.homeTimer);
        u.homeTimer = setTimeout(() => this.returnHome(u), CONFIG.presence.offlineGraceMs);
      }
    }
    this.broadcastUser(u);
  }

  returnHome(u: LiveUser): void {
    if (u.homeTimer) {
      clearTimeout(u.homeTimer);
      u.homeTimer = null;
    }
    if (u.presence !== "offline") return;
    if (u.spaceId) this.removeFromSpace(u, "offline", undefined, true);
    this.placeAtBase(u, true);
    this.broadcastUser(u);
  }

  usersInUnit(unitId: UnitId): LiveUser[] {
    return [...this.users.values()].filter((u) => u.stored.onboarded && u.stored.currentUnit === unitId);
  }

  destinationSpaceId(destId: string): SpaceId {
    return spaceIdForDestination(destId);
  }
}
