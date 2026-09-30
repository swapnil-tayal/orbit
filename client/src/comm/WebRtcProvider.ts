import type { RtcSignalIn } from "@orbit/shared";
import type { CommProvider, PeerInfo } from "./provider.ts";
import { applyMute, currentLocalStream, getLocalStream, releaseLocalStream } from "./media.ts";
import { RemoteAudio } from "./audioGraph.ts";
import { startVad, type VadHandle } from "./vad.ts";
import { useComm } from "../state/comm.ts";
import { onRtcSignal, sendRtcSignal, sendSpeaking } from "../net/socket.ts";

const ICE = [{ urls: "stun:stun.l.google.com:19302" }];

interface Peer {
  id: string;
  pc: RTCPeerConnection;
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
  audio: RemoteAudio | null;
  screenSender: RTCRtpSender | null;
  closed: boolean;
}

export class WebRtcProvider implements CommProvider {
  readonly kind = "webrtc" as const;
  private peers = new Map<string, Peer>();
  private zoneId: string | null = null;
  private screen: MediaStream | null = null;
  private unsubscribe: (() => void) | null = null;
  private vad: VadHandle | null = null;
  private lastSpeakingSent = false;

  constructor(private myId: string) {
    this.unsubscribe = onRtcSignal((m) => void this.onSignal(m));
  }

  async join(zoneId: string, peers: PeerInfo[]): Promise<void> {
    this.zoneId = zoneId;
    const stream = await getLocalStream();
    if (this.zoneId !== zoneId) return;
    if (stream && !this.vad) {
      this.vad = startVad(stream, (on) => {
        useComm.getState().setLocalSpeaking(on);
        if (on !== this.lastSpeakingSent) {
          this.lastSpeakingSent = on;
          sendSpeaking(on);
        }
      });
    }
    this.updatePeers(peers);
  }

  updatePeers(peers: PeerInfo[]): void {
    const comm = useComm.getState();
    const wanted = new Map(peers.filter((p) => p.id !== this.myId).map((p) => [p.id, p]));
    for (const [id, peer] of this.peers) {
      if (!wanted.has(id)) {
        this.removePeer(peer);
      }
    }
    for (const p of wanted.values()) {
      if (p.isBot) {
        if (comm.peers[p.id] !== "mock") comm.setPeer(p.id, "mock");
        continue;
      }
      if (!this.peers.has(p.id)) this.addPeer(p.id);
    }
    for (const id of Object.keys(comm.peers)) if (!wanted.has(id) && !this.peers.has(id)) comm.setPeer(id, null);
  }

  private addPeer(id: string): void {
    const pc = new RTCPeerConnection({ iceServers: ICE });
    const peer: Peer = { id, pc, polite: this.myId < id, makingOffer: false, ignoreOffer: false, audio: null, screenSender: null, closed: false };
    this.peers.set(id, peer);
    useComm.getState().setPeer(id, "connecting");
    const stream = currentLocalStream();
    if (stream) for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);
    else pc.addTransceiver("audio", { direction: "recvonly" });
    const screenTrack = this.screen?.getVideoTracks()[0];
    if (this.screen && screenTrack) peer.screenSender = pc.addTrack(screenTrack, this.screen);
    pc.onnegotiationneeded = async () => {
      try {
        peer.makingOffer = true;
        await pc.setLocalDescription();
        if (pc.localDescription) sendRtcSignal({ to: id, description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
      } catch {
        return;
      } finally {
        peer.makingOffer = false;
      }
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) sendRtcSignal({ to: id, candidate: e.candidate.toJSON() });
    };
    pc.ontrack = (e) => {
      const remote = e.streams[0] ?? new MediaStream([e.track]);
      if (e.track.kind === "video") {
        useComm.getState().setRemoteScreen(id, remote);
        return;
      }
      if (!peer.audio) {
        peer.audio = new RemoteAudio(remote);
        void peer.audio.fadeIn();
      }
    };
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState;
      const comm = useComm.getState();
      if (st === "connected") comm.setPeer(id, "connected");
      else if (st === "failed" || st === "disconnected") comm.setPeer(id, "failed");
      else if (st === "closed") comm.setPeer(id, null);
      if (st === "failed") {
        try {
          pc.restartIce();
        } catch {
          return;
        }
      }
    };
  }

  private removePeer(peer: Peer): void {
    if (peer.closed) return;
    peer.closed = true;
    this.peers.delete(peer.id);
    useComm.getState().setRemoteScreen(peer.id, null);
    const finish = () => {
      peer.audio?.dispose();
      peer.pc.close();
      useComm.getState().setPeer(peer.id, null);
    };
    if (peer.audio) void peer.audio.fadeOut().then(finish);
    else finish();
  }

  private async onSignal(m: RtcSignalIn): Promise<void> {
    const peer = this.peers.get(m.from);
    if (!peer || peer.closed) return;
    const pc = peer.pc;
    try {
      if (m.description) {
        const desc = m.description as RTCSessionDescriptionInit;
        const offerCollision = desc.type === "offer" && (peer.makingOffer || pc.signalingState !== "stable");
        peer.ignoreOffer = !peer.polite && offerCollision;
        if (peer.ignoreOffer) return;
        await pc.setRemoteDescription(desc);
        if (desc.type === "offer") {
          await pc.setLocalDescription();
          if (pc.localDescription) sendRtcSignal({ to: peer.id, description: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
        }
      } else if (m.candidate) {
        try {
          await pc.addIceCandidate(m.candidate as RTCIceCandidateInit);
        } catch (e) {
          if (!peer.ignoreOffer) throw e;
        }
      }
    } catch {
      return;
    }
  }

  leave(): void {
    this.zoneId = null;
    for (const peer of [...this.peers.values()]) this.removePeer(peer);
    useComm.getState().resetPeers();
    // The mic is only live while you are in a ring or zone.
    this.vad?.stop();
    this.vad = null;
    useComm.getState().setLocalSpeaking(false);
    releaseLocalStream();
    if (this.lastSpeakingSent) {
      this.lastSpeakingSent = false;
      sendSpeaking(false);
    }
  }

  setMuted(muted: boolean): void {
    applyMute(muted);
  }

  setScreen(stream: MediaStream | null): void {
    if (this.screen === stream) return;
    this.screen = stream;
    const track = stream?.getVideoTracks()[0] ?? null;
    for (const peer of this.peers.values()) {
      if (peer.closed) continue;
      if (peer.screenSender) {
        try {
          peer.pc.removeTrack(peer.screenSender);
        } catch {
          void 0;
        }
        peer.screenSender = null;
      }
      if (stream && track) peer.screenSender = peer.pc.addTrack(track, stream);
    }
  }

  dispose(): void {
    this.leave();
    this.vad?.stop();
    this.vad = null;
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  get currentZone(): string | null {
    return this.zoneId;
  }
}
