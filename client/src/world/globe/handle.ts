import { useSyncExternalStore } from "react";
import type { GlobeScene } from "./GlobeScene.ts";

let current: GlobeScene | null = null;
const listeners = new Set<() => void>();

export function setGlobe(scene: GlobeScene | null): void {
  current = scene;
  for (const l of listeners) l();
}

export function getGlobe(): GlobeScene | null {
  return current;
}

export function useGlobe(): GlobeScene | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}
