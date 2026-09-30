import type { CommProvider, PeerInfo } from "./provider.ts";
import { useComm } from "../state/comm.ts";

export class MockProvider implements CommProvider {
  readonly kind = "mock" as const;
  private peers = new Map<string, PeerInfo>();

  async join(_zoneId: string, peers: PeerInfo[]): Promise<void> {
    if (useComm.getState().mic === "idle") useComm.getState().setMic("none");
    this.updatePeers(peers);
  }

  updatePeers(peers: PeerInfo[]): void {
    const comm = useComm.getState();
    const next = new Set(peers.map((p) => p.id));
    for (const id of this.peers.keys()) if (!next.has(id)) {
      this.peers.delete(id);
      comm.setPeer(id, null);
    }
    for (const p of peers) {
      if (!this.peers.has(p.id)) {
        this.peers.set(p.id, p);
        comm.setPeer(p.id, "mock");
      }
    }
  }

  leave(): void {
    this.peers.clear();
    useComm.getState().resetPeers();
  }

  setMuted(): void {}

  setScreen(): void {}

  dispose(): void {
    this.leave();
  }
}
