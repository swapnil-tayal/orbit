import { create } from "zustand";
import type { UnitId } from "@orbit/shared";
import type { Level } from "../world/globe/constants.ts";

interface ViewState {
  level: Level;
  zoomLog: number;
  centreUnit: UnitId | null;
  farSide: number;
  setLevel(level: Level): void;
  setZoomLog(v: number): void;
  setCentreUnit(u: UnitId | null): void;
  setFarSide(n: number): void;
}

export const useView = create<ViewState>((set) => ({
  level: "orbit",
  zoomLog: Math.log(12000),
  centreUnit: null,
  farSide: 0,
  setLevel: (level) => set({ level }),
  setZoomLog: (zoomLog) => set({ zoomLog }),
  setCentreUnit: (centreUnit) => set({ centreUnit }),
  setFarSide: (farSide) => set({ farSide }),
}));
