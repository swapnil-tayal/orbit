import { useComm } from "../state/comm.ts";
import { sendScreen } from "../net/socket.ts";

let stream: MediaStream | null = null;
let pending: Promise<MediaStream | null> | null = null;
/** Bumped on release so a capture that resolves after leaving is stopped straight away. */
let generation = 0;
let screen: MediaStream | null = null;

export function hasMediaSupport(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof RTCPeerConnection !== "undefined";
}

export function hasScreenSupport(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getDisplayMedia && typeof RTCPeerConnection !== "undefined";
}

export function getLocalStream(): Promise<MediaStream | null> {
  if (stream) return Promise.resolve(stream);
  if (pending) return pending;
  if (!hasMediaSupport()) {
    useComm.getState().setMic("none");
    return Promise.resolve(null);
  }
  useComm.getState().setMic("pending");
  const gen = generation;
  pending = navigator.mediaDevices
    .getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false })
    .then((s) => {
      if (gen !== generation) {
        for (const t of s.getTracks()) t.stop();
        return null;
      }
      stream = s;
      useComm.getState().setMic("ready");
      const track = s.getAudioTracks()[0];
      if (track) track.enabled = !useComm.getState().muted;
      return s;
    })
    .catch(() => {
      useComm.getState().setMic("denied");
      return null;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function currentLocalStream(): MediaStream | null {
  return stream;
}

/** Stop capturing the microphone. Called whenever you are not in a conversation. */
export function releaseLocalStream(): void {
  generation++;
  if (stream) {
    for (const t of stream.getTracks()) t.stop();
    stream = null;
  }
  const mic = useComm.getState().mic;
  if (mic === "ready" || mic === "pending") useComm.getState().setMic("idle");
}

export function applyMute(muted: boolean): void {
  if (!stream) return;
  for (const t of stream.getAudioTracks()) t.enabled = !muted;
}

export type ScreenShareResult = "ok" | "cancelled" | "unsupported" | "failed";

export async function startScreenShare(): Promise<ScreenShareResult> {
  if (screen) return "ok";
  if (!hasScreenSupport()) return "unsupported";
  let s: MediaStream;
  try {
    const opts: DisplayMediaStreamOptions & { selfBrowserSurface?: string; surfaceSwitching?: string } = {
      video: { frameRate: { ideal: 15, max: 30 } },
      audio: false,
      selfBrowserSurface: "exclude",
      surfaceSwitching: "include",
    };
    s = await navigator.mediaDevices.getDisplayMedia(opts);
  } catch (e) {
    return e instanceof DOMException && e.name === "NotAllowedError" ? "cancelled" : "failed";
  }
  const track = s.getVideoTracks()[0];
  if (!track) {
    for (const t of s.getTracks()) t.stop();
    return "failed";
  }
  track.contentHint = "detail";
  track.addEventListener("ended", () => {
    if (screen === s) stopScreenShare();
  });
  screen = s;
  useComm.getState().setLocalScreen(s);
  sendScreen(true);
  return "ok";
}

export function stopScreenShare(): void {
  if (!screen) return;
  const s = screen;
  screen = null;
  for (const t of s.getTracks()) t.stop();
  useComm.getState().setLocalScreen(null);
  sendScreen(false);
}
