import type { LatLng, UnitId } from "./types.ts";
import { unitIdFor } from "./geo/units.ts";

/**
 * Offices are defined at admin level. People never search for an office;
 * they pick one of these. For now the list is hard-coded here and seeded
 * into the database on server start (server/src/seed/seed.ts).
 */
export interface OfficeDef {
  id: string;
  name: string;
  country: string;
  tz: string;
  at: LatLng;
}

export const OFFICES: OfficeDef[] = [
  { id: "copenhagen", name: "Copenhagen", country: "Denmark", tz: "Europe/Copenhagen", at: { lat: 55.6761, lng: 12.5683 } },
  { id: "santiago", name: "Santiago", country: "Chile", tz: "America/Santiago", at: { lat: -33.4489, lng: -70.6693 } },
  { id: "hyderabad", name: "Hyderabad", country: "India", tz: "Asia/Kolkata", at: { lat: 17.385, lng: 78.487 } },
  { id: "sf-bay-area", name: "San Francisco Bay Area", country: "USA", tz: "America/Los_Angeles", at: { lat: 37.5, lng: -122.0 } },
];

export function officeUnitId(o: OfficeDef): UnitId {
  return unitIdFor(o.at.lat, o.at.lng);
}

export function officeForUnit(unitId: UnitId): OfficeDef | null {
  return OFFICES.find((o) => officeUnitId(o) === unitId) ?? null;
}
