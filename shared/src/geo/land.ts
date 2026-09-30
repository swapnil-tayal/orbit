import { feature } from "topojson-client";
import { geoBounds, geoContains } from "d3-geo";
import type { Topology, GeometryCollection, MultiPolygon as TMultiPolygon } from "topojson-specification";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import { CONFIG } from "../config.ts";

export interface LandIndex {
  isLand(lat: number, lng: number): boolean;
  landmassIndex(lat: number, lng: number): number;
  isHabitable(lat: number, lng: number): boolean;
  polygonCount: number;
}

interface IndexedPolygon {
  feature: Feature<Polygon>;
  south: number;
  north: number;
  west: number;
  east: number;
}

function inBounds(p: IndexedPolygon, lat: number, lng: number): boolean {
  if (lat < p.south || lat > p.north) return false;
  if (p.west <= p.east) return lng >= p.west && lng <= p.east;
  return lng >= p.west || lng <= p.east;
}

export function createLandIndex(topology: Topology): LandIndex {
  const object = (topology.objects as Record<string, GeometryCollection | TMultiPolygon>)["land"];
  const result = feature(topology, object as never) as unknown as Feature<MultiPolygon | Polygon> | FeatureCollection<MultiPolygon | Polygon>;
  const features = result.type === "FeatureCollection" ? result.features : [result];
  const polys: IndexedPolygon[] = [];
  const coordsList: Polygon["coordinates"][] = [];
  for (const f of features) {
    if (!f.geometry) continue;
    if (f.geometry.type === "MultiPolygon") coordsList.push(...f.geometry.coordinates);
    else coordsList.push(f.geometry.coordinates);
  }
  for (const coords of coordsList) {
    const f: Feature<Polygon> = { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: coords } };
    const [[west, south], [east, north]] = geoBounds(f);
    polys.push({ feature: f, south, north, west, east });
  }
  polys.sort((a, b) => (b.north - b.south) * Math.abs(b.east - b.west) - (a.north - a.south) * Math.abs(a.east - a.west));
  const cache = new Map<string, number>();
  const key = (lat: number, lng: number) => `${Math.round(lat * 20)}:${Math.round(lng * 20)}`;

  const landmassIndex = (lat: number, lng: number): number => {
    const k = key(lat, lng);
    const hit = cache.get(k);
    if (hit !== undefined) return hit;
    let found = -1;
    for (let i = 0; i < polys.length; i++) {
      const p = polys[i];
      if (!inBounds(p, lat, lng)) continue;
      if (geoContains(p.feature, [lng, lat])) {
        found = i;
        break;
      }
    }
    cache.set(k, found);
    return found;
  };

  return {
    polygonCount: polys.length,
    landmassIndex,
    isLand: (lat, lng) => landmassIndex(lat, lng) >= 0,
    isHabitable: (lat, lng) => lat > CONFIG.geo.minHabitableLat && landmassIndex(lat, lng) >= 0,
  };
}
