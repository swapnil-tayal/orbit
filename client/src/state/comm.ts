import { create } from "zustand";

export type MicState = "idle" | "pending" | "ready" | "denied" | "none";
export type PeerState = "connecting" | "connected" | "failed" | "mock";
export type Conversation = "idle" | "entering" | "active" | "leaving";

interface CommState {
  mic: MicState;
  muted: boolean;
  conversation: Conversation;
  peers: Record<string, PeerState>;
  localSpeaking: boolean;
  localScreen: MediaStream | null;
  remoteScreens: Record<string, MediaStream>;
  setMic(mic: MicState): void;
  setMuted(muted: boolean): void;
  setConversation(c: Conversation): void;
  setPeer(id: string, state: PeerState | null): void;
  resetPeers(): void;
  setLocalSpeaking(on: boolean): void;
  setLocalScreen(stream: MediaStream | null): void;
  setRemoteScreen(id: string, stream: MediaStream | null): void;
}

export const useComm = create<CommState>((set) => ({
  mic: "idle",
  muted: false,
  conversation: "idle",
  peers: {},
  localSpeaking: false,
  localScreen: null,
  remoteScreens: {},
  setMic: (mic) => set({ mic }),
  setMuted: (muted) => set({ muted }),
  setConversation: (conversation) => set({ conversation }),
  setPeer: (id, state) =>
    set((s) => {
      const peers = { ...s.peers };
      if (state === null) delete peers[id];
      else peers[id] = state;
      return { peers };
    }),
  resetPeers: () => set({ peers: {}, remoteScreens: {} }),
  setLocalSpeaking: (localSpeaking) => set({ localSpeaking }),
  setLocalScreen: (localScreen) => set({ localScreen }),
  setRemoteScreen: (id, stream) =>
    set((s) => {
      if ((s.remoteScreens[id] ?? null) === stream) return {};
      const remoteScreens = { ...s.remoteScreens };
      if (stream === null) delete remoteScreens[id];
      else remoteScreens[id] = stream;
      return { remoteScreens };
    }),
}));
