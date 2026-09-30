declare module "world-atlas/*.json" {
  import type { Topology } from "topojson-specification";
  const topology: Topology;
  export default topology;
}

declare module "city-timezones" {
  export interface CityRecord {
    city: string;
    city_ascii: string;
    lat: number;
    lng: number;
    pop: number;
    country: string;
    iso2: string;
    iso3: string;
    province: string;
    timezone: string;
  }
  export const cityMapping: CityRecord[];
  export function lookupViaCity(city: string): CityRecord[];
  export function findFromCityStateProvince(query: string): CityRecord[];
}
