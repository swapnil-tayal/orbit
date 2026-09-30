import { create } from "zustand";
import type { DeskInfo, DestinationInfo, OfficeInfo, PublicUser, TravelState, UnitId, UserId } from "@orbit/shared";

interface WorldState {
  users: Record<UserId, PublicUser>;
  offices: Record<UnitId, OfficeInfo>;
  destinations: DestinationInfo[];
  desksByOffice: Record<UnitId, DeskInfo[]>;
  loaded: boolean;
  setAll(users: PublicUser[], offices: OfficeInfo[], destinations: DestinationInfo[]): void;
  upsertUser(user: PublicUser): void;
  patchUser(id: UserId, patch: Partial<PublicUser>): void;
  setTravel(id: UserId, travel: TravelState | null): void;
  setOfficeDesks(unitId: UnitId, desks: DeskInfo[], rows?: number): void;
  updateDesk(unitId: UnitId, deskId: string, ownerId: UserId | null): void;
}

export const useWorld = create<WorldState>((set) => ({
  users: {},
  offices: {},
  destinations: [],
  desksByOffice: {},
  loaded: false,
  setAll: (users, offices, destinations) =>
    set({
      users: Object.fromEntries(users.map((u) => [u.id, u])),
      offices: Object.fromEntries(offices.map((o) => [o.unitId, o])),
      destinations,
      loaded: true,
    }),
  upsertUser: (user) => set((s) => ({ users: { ...s.users, [user.id]: user } })),
  patchUser: (id, patch) =>
    set((s) => {
      const prev = s.users[id];
      if (!prev) {
        if (patch.id && patch.name && patch.avatar) return { users: { ...s.users, [id]: patch as PublicUser } };
        return {};
      }
      return { users: { ...s.users, [id]: { ...prev, ...patch } } };
    }),
  setTravel: (id, travel) =>
    set((s) => {
      const prev = s.users[id];
      if (!prev) return {};
      return { users: { ...s.users, [id]: { ...prev, travel, presence: travel ? "traveling" : prev.presence } } };
    }),
  setOfficeDesks: (unitId, desks, rows) =>
    set((s) => ({
      desksByOffice: { ...s.desksByOffice, [unitId]: desks },
      offices: rows !== undefined && s.offices[unitId] ? { ...s.offices, [unitId]: { ...s.offices[unitId], rows, deskCount: desks.length } } : s.offices,
    })),
  updateDesk: (unitId, deskId, ownerId) =>
    set((s) => {
      const list = s.desksByOffice[unitId];
      if (!list) return {};
      return { desksByOffice: { ...s.desksByOffice, [unitId]: list.map((d) => (d.id === deskId ? { ...d, ownerId } : d)) } };
    }),
}));

export function usersInUnit(users: Record<UserId, PublicUser>, unitId: UnitId): PublicUser[] {
  return Object.values(users).filter((u) => u.currentUnit === unitId);
}

export function residentsOfUnit(users: Record<UserId, PublicUser>, unitId: UnitId): PublicUser[] {
  return Object.values(users).filter((u) => u.homeUnit === unitId);
}
