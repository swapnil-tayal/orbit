import { createLandIndex, type LandIndex } from "@orbit/shared";

let promise: Promise<LandIndex> | null = null;
let cached: LandIndex | null = null;

export function loadLand(): Promise<LandIndex> {
  if (!promise) {
    promise = import("world-atlas/land-110m.json").then((m) => {
      cached = createLandIndex(m.default);
      return cached;
    });
  }
  return promise;
}

export function landSync(): LandIndex | null {
  return cached;
}
