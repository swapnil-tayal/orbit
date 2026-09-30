import { useMemo } from "react";
import { unitCentre, type DestinationInfo, type OfficeInfo, type PublicUser, type UnitId } from "@orbit/shared";
import { useWorld } from "../../state/world.ts";
import { useSession } from "../../state/session.ts";

export interface UnitMarker {
  unitId: UnitId;
  lat: number;
  lng: number;
  users: PublicUser[];
  online: number;
  isMine: boolean;
  destination: DestinationInfo | null;
  office: OfficeInfo | null;
  name: string;
}

export function useUnitMarkers(): { markers: UnitMarker[]; travelers: PublicUser[]; myUnit: UnitId | null } {
  const users = useWorld((s) => s.users);
  const offices = useWorld((s) => s.offices);
  const destinations = useWorld((s) => s.destinations);
  const me = useSession((s) => s.me);
  return useMemo(() => {
    const byUnit = new Map<UnitId, PublicUser[]>();
    const travelers: PublicUser[] = [];
    for (const u of Object.values(users)) {
      if (u.presence === "traveling" && u.travel) {
        travelers.push(u);
        continue;
      }
      if (!u.currentUnit) continue;
      const list = byUnit.get(u.currentUnit) ?? [];
      list.push(u);
      byUnit.set(u.currentUnit, list);
    }
    for (const d of destinations) if (!byUnit.has(d.unitId)) byUnit.set(d.unitId, []);
    for (const o of Object.values(offices)) if (!byUnit.has(o.unitId)) byUnit.set(o.unitId, []);
    const myUnit = me?.currentUnit ?? null;
    const markers: UnitMarker[] = [];
    for (const [unitId, list] of byUnit) {
      const sorted = [...list].sort((a, b) => {
        const ra = a.id === me?.id ? -1 : a.presence === "online" ? 0 : a.presence === "traveling" ? 1 : 2;
        const rb = b.id === me?.id ? -1 : b.presence === "online" ? 0 : b.presence === "traveling" ? 1 : 2;
        return ra - rb || a.name.localeCompare(b.name);
      });
      const c = unitCentre(unitId);
      const destination = destinations.find((d) => d.unitId === unitId) ?? null;
      markers.push({
        unitId,
        lat: c.lat,
        lng: c.lng,
        users: sorted,
        online: sorted.filter((u) => u.presence === "online").length,
        isMine: unitId === myUnit,
        destination,
        office: offices[unitId] ?? null,
        name: destination ? destination.name : (offices[unitId]?.name ?? (unitId === me?.homeUnit ? "Home" : "Home area")),
      });
    }
    return { markers, travelers, myUnit };
  }, [users, offices, destinations, me?.id, me?.currentUnit, me?.homeUnit]);
}
