import { create } from "zustand";
import type { UnitId } from "@orbit/shared";

export type Sheet = "none" | "travel" | "profile" | "people" | "deskMode" | "offices";
export type View = "globe" | "space";

export interface Toast {
  id: number;
  kind: "info" | "travel" | "error" | "space";
  text: string;
  accent?: string;
  avatarUserId?: string;
  ttl: number;
}

interface UIState {
  view: View;
  enterOnReady: boolean;
  sheet: Sheet;
  peekUnit: UnitId | null;
  focusUnit: UnitId | null;
  hoverUnit: UnitId | null;
  travelTarget: { unitId: UnitId; destId: string | null; homeOf: string | null; name: string } | null;
  previewTrips: Array<{ id: string; fromUnit: UnitId; toUnit: UnitId; mode: "car" | "flight"; distanceKm: number; durationMs: number }>;
  toasts: Toast[];
  kitMode: boolean;
  setPreviewTrips(trips: UIState["previewTrips"]): void;
  setView(view: View): void;
  setEnterOnReady(on: boolean): void;
  setSheet(sheet: Sheet): void;
  setPeekUnit(unit: UnitId | null): void;
  setFocusUnit(unit: UnitId | null): void;
  setHoverUnit(unit: UnitId | null): void;
  setTravelTarget(t: UIState["travelTarget"]): void;
  toast(t: Omit<Toast, "id" | "ttl"> & { ttl?: number }): void;
  dismissToast(id: number): void;
}

let toastSeq = 1;

export const useUI = create<UIState>((set) => ({
  view: "globe",
  enterOnReady: false,
  sheet: "none",
  peekUnit: null,
  focusUnit: null,
  hoverUnit: null,
  travelTarget: null,
  previewTrips: [],
  toasts: [],
  kitMode: window.location.hash === "#kit",
  setPreviewTrips: (previewTrips) => set({ previewTrips }),
  setView: (view) => set({ view }),
  setEnterOnReady: (enterOnReady) => set({ enterOnReady }),
  setSheet: (sheet) => set({ sheet }),
  setPeekUnit: (peekUnit) => set({ peekUnit }),
  setFocusUnit: (focusUnit) => set({ focusUnit }),
  setHoverUnit: (hoverUnit) => set({ hoverUnit }),
  setTravelTarget: (travelTarget) => set({ travelTarget }),
  toast: (t) => {
    const id = toastSeq++;
    const ttl = t.ttl ?? 3200;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id, ttl }] }));
    window.setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), ttl);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export function toast(text: string, kind: Toast["kind"] = "info", extra?: Partial<Toast>): void {
  useUI.getState().toast({ text, kind, ...extra });
}
