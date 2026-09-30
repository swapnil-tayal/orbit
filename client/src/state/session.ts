import { create } from "zustand";
import type { AvatarSpec, DeskId, MeUser, UnitId } from "@orbit/shared";
import { DEFAULT_AVATAR } from "@orbit/shared";

export type AppStatus = "booting" | "landing" | "onboarding" | "world";
export type OnboardingStep = "mode" | "location" | "office" | "avatar" | "desk";
export type WorkMode = "home" | "office";

export interface OnboardingDraft {
  step: OnboardingStep;
  workMode: WorkMode | null;
  name: string;
  avatar: AvatarSpec;
  homeUnit: UnitId | null;
  deskId: DeskId | null;
  officeUnit: UnitId | null;
  officeDeskId: DeskId | null;
}

interface SessionState {
  userId: string;
  status: AppStatus;
  me: MeUser | null;
  connected: boolean;
  serverOffset: number;
  draft: OnboardingDraft;
  setStatus(status: AppStatus): void;
  setMe(me: MeUser | null): void;
  setConnected(connected: boolean): void;
  setServerOffset(offset: number): void;
  patchDraft(patch: Partial<OnboardingDraft>): void;
  resetDraft(): void;
}

const emptyDraft = (): OnboardingDraft => ({ step: "mode", workMode: null, name: "", avatar: { ...DEFAULT_AVATAR }, homeUnit: null, deskId: null, officeUnit: null, officeDeskId: null });

export const useSession = create<SessionState>((set) => ({
  userId: "",
  status: "booting",
  me: null,
  connected: false,
  serverOffset: 0,
  draft: emptyDraft(),
  setStatus: (status) => set({ status }),
  setMe: (me) => set({ me }),
  setConnected: (connected) => set({ connected }),
  setServerOffset: (serverOffset) => set({ serverOffset }),
  patchDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  resetDraft: () => set({ draft: emptyDraft() }),
}));

export function serverNow(): number {
  return Date.now() + useSession.getState().serverOffset;
}
