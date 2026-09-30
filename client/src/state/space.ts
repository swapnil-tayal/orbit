import { create } from "zustand";
import type { DeskInfo, Position, SpaceSnapshot, UserId, ZoneId, ZoneSnapshot } from "@orbit/shared";

interface SpaceState {
  snapshot: SpaceSnapshot | null;
  positions: Record<UserId, Position>;
  zones: Record<ZoneId, ZoneSnapshot>;
  speaking: Record<UserId, boolean>;
  sharing: Record<UserId, boolean>;
  myZone: ZoneId | null;
  setSnapshot(snapshot: SpaceSnapshot | null): void;
  memberJoined(userId: UserId, position: Position): void;
  memberLeft(userId: UserId): void;
  setPosition(userId: UserId, position: Position): void;
  setZoneOpen(zoneId: ZoneId, open: boolean): void;
  setZoneMembers(zoneId: ZoneId, members: UserId[]): void;
  setSpeaking(userId: UserId, on: boolean): void;
  setSharing(userId: UserId, on: boolean): void;
  setMyZone(zoneId: ZoneId | null): void;
  setDesks(desks: DeskInfo[], rows?: number): void;
}

export const useSpace = create<SpaceState>((set) => ({
  snapshot: null,
  positions: {},
  zones: {},
  speaking: {},
  sharing: {},
  myZone: null,
  setSnapshot: (snapshot) =>
    set({
      snapshot,
      positions: snapshot ? { ...snapshot.members } : {},
      zones: snapshot ? { ...snapshot.zones } : {},
      speaking: snapshot ? Object.fromEntries(snapshot.speaking.map((id) => [id, true])) : {},
      sharing: snapshot ? Object.fromEntries((snapshot.sharing ?? []).map((id) => [id, true])) : {},
      myZone: null,
    }),
  memberJoined: (userId, position) => set((s) => ({ positions: { ...s.positions, [userId]: position } })),
  memberLeft: (userId) =>
    set((s) => {
      const positions = { ...s.positions };
      delete positions[userId];
      const speaking = { ...s.speaking };
      delete speaking[userId];
      const sharing = { ...s.sharing };
      delete sharing[userId];
      return { positions, speaking, sharing };
    }),
  setPosition: (userId, position) => set((s) => ({ positions: { ...s.positions, [userId]: position } })),
  setZoneOpen: (zoneId, open) => set((s) => ({ zones: { ...s.zones, [zoneId]: { open, members: open ? (s.zones[zoneId]?.members ?? []) : [] } } })),
  setZoneMembers: (zoneId, members) => set((s) => ({ zones: { ...s.zones, [zoneId]: { open: s.zones[zoneId]?.open ?? true, members } } })),
  setSpeaking: (userId, on) => set((s) => ({ speaking: { ...s.speaking, [userId]: on } })),
  setSharing: (userId, on) =>
    set((s) => {
      const sharing = { ...s.sharing };
      if (on) sharing[userId] = true;
      else delete sharing[userId];
      return { sharing };
    }),
  setMyZone: (myZone) => set({ myZone }),
  setDesks: (desks, rows) => set((s) => (s.snapshot ? { snapshot: { ...s.snapshot, desks, rows: rows ?? s.snapshot.rows } } : {})),
}));
