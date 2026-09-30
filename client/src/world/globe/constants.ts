import { CONFIG } from "@orbit/shared";

export const R = CONFIG.geo.earthRadiusKm;
export const KM_PER_DEG = CONFIG.geo.kmPerDeg;
export const VFOV = CONFIG.globe.vfovDeg;
export const H_MIN = CONFIG.globe.hMinKm;
export const H_ORBIT = CONFIG.globe.levels.orbit;
export const LOG_H_MIN = Math.log(H_MIN);
export const LOG_H_ORBIT = Math.log(H_ORBIT);

export type Level = "orbit" | "region" | "area" | "unit";

export const LEVEL_BOUNDS = { orbitRegion: 4900, regionArea: 894, areaUnit: 141 };

export function levelFor(h: number, prev?: Level): Level {
  const hyst = 0.1;
  const b = LEVEL_BOUNDS;
  const up = (v: number) => v * (1 + hyst);
  const down = (v: number) => v * (1 - hyst);
  if (prev === "orbit") return h > down(b.orbitRegion) ? "orbit" : levelFor(h);
  if (prev === "region") return h > up(b.orbitRegion) ? "orbit" : h > down(b.regionArea) ? "region" : levelFor(h);
  if (prev === "area") return h > up(b.regionArea) ? levelFor(h) : h > down(b.areaUnit) ? "area" : "unit";
  if (prev === "unit") return h > up(b.areaUnit) ? levelFor(h) : "unit";
  if (h > b.orbitRegion) return "orbit";
  if (h > b.regionArea) return "region";
  if (h > b.areaUnit) return "area";
  return "unit";
}

export const LEVEL_H: Record<Level, number> = { orbit: H_ORBIT, region: CONFIG.globe.levels.region, area: CONFIG.globe.levels.area, unit: H_MIN };

const TILT_STOPS: Array<[number, number]> = [
  [Math.log(12000), 0],
  [Math.log(2000), 16],
  [Math.log(400), 38],
  [Math.log(45), 55],
];

export function tiltFor(h: number): number {
  const l = Math.log(Math.max(1, h));
  if (l >= TILT_STOPS[0][0]) return TILT_STOPS[0][1];
  if (l <= TILT_STOPS[TILT_STOPS.length - 1][0]) return TILT_STOPS[TILT_STOPS.length - 1][1];
  for (let i = 0; i < TILT_STOPS.length - 1; i++) {
    const [la, ta] = TILT_STOPS[i];
    const [lb, tb] = TILT_STOPS[i + 1];
    if (l <= la && l >= lb) {
      const t = (la - l) / (la - lb);
      return ta + (tb - ta) * t;
    }
  }
  return 0;
}

export const COLORS = {
  cyan: 0x22e3ff,
  pink: 0xff3d9a,
  lime: 0xb6ff3b,
  yellow: 0xffd23f,
  violet: 0x9b5cff,
  ocean: "#1440D8",
  oceanDeep: "#0C2AA6",
  land: "#27C46F",
  landLight: "#5FE08F",
  landYellow: "#B9D24B",
  landGrey: "#A8B1BA",
  ice: "#DDEBFF",
  coast: "rgba(170,255,210,0.4)",
  coastGlow: "rgba(110,240,255,0.85)",
};

export const EASE_CAMERA = [0.22, 0.8, 0.2, 1] as const;
