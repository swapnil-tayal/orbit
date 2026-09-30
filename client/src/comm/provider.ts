export interface PeerInfo {
  id: string;
  isBot: boolean;
}

export interface CommProvider {
  readonly kind: "webrtc" | "mock";
  join(zoneId: string, peers: PeerInfo[]): Promise<void>;
  updatePeers(peers: PeerInfo[]): void;
  leave(): void;
  setMuted(muted: boolean): void;
  setScreen(stream: MediaStream | null): void;
  dispose(): void;
}
