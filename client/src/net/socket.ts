import { io, type Socket } from "socket.io-client";
import {
  EV,
  type DeskAck,
  type DeskAddReq,
  type DeskClaimReq,
  type DeskReleaseReq,
  type DeskUpdateMsg,
  type HelloAck,
  type HelloReq,
  type OfficeUpdateMsg,
  type PosBroadcast,
  type PosMsg,
  type Position,
  type ProfileUpdateReq,
  type RtcSignalIn,
  type RtcSignalMsg,
  type ScreenBroadcast,
  type SpaceJoinMsg,
  type SpaceLeaveMsg,
  type SpaceSnapshot,
  type SpeakingBroadcast,
  type TravelAck,
  type TravelArrivedAllMsg,
  type TravelReq,
  type TravelStartedMsg,
  type UserUpdateMsg,
  type WorldSnapshot,
  type ZoneAck,
  type ZoneId,
  type ZoneMembersMsg,
  type ZoneStateMsg,
  type MeUser,
} from "@orbit/shared";
import { getToken } from "./identity.ts";
import { API_BASE, TUNNEL_HEADERS } from "./config.ts";
import { useSession } from "../state/session.ts";
import { useWorld } from "../state/world.ts";
import { useSpace } from "../state/space.ts";
import { useComm } from "../state/comm.ts";
import { toast } from "../state/ui.ts";

type Listener<T> = (msg: T) => void;

const rtcListeners = new Set<Listener<RtcSignalIn>>();
const spaceListeners = new Set<Listener<SpaceSnapshot | null>>();
const arrivalListeners = new Set<Listener<TravelArrivedAllMsg>>();
const zoneEjectListeners = new Set<Listener<ZoneMembersMsg>>();

let socket: Socket | null = null;

export function onRtcSignal(fn: Listener<RtcSignalIn>): () => void {
  rtcListeners.add(fn);
  return () => rtcListeners.delete(fn);
}

export function onSpaceSnapshot(fn: Listener<SpaceSnapshot | null>): () => void {
  spaceListeners.add(fn);
  return () => spaceListeners.delete(fn);
}

export function onArrival(fn: Listener<TravelArrivedAllMsg>): () => void {
  arrivalListeners.add(fn);
  return () => arrivalListeners.delete(fn);
}

export function onZoneMembers(fn: Listener<ZoneMembersMsg>): () => void {
  zoneEjectListeners.add(fn);
  return () => zoneEjectListeners.delete(fn);
}

function applySnapshot(snapshot: WorldSnapshot): void {
  const session = useSession.getState();
  session.setMe(snapshot.me);
  useWorld.getState().setAll(snapshot.users, snapshot.offices, snapshot.destinations);
  if (snapshot.space) useWorld.getState().setOfficeDesks(snapshot.space.unitId, snapshot.space.desks, snapshot.space.rows);
  useSpace.getState().setSnapshot(snapshot.space);
  for (const fn of spaceListeners) fn(snapshot.space);
}

export function sayHello(): Promise<HelloAck> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ ok: false, code: "bad_request", serverNow: Date.now() });
      return;
    }
    const sentAt = Date.now();
    const req: HelloReq = { userId: useSession.getState().userId, clientNow: sentAt };
    socket.emit(EV.hello, req, (ack: HelloAck) => {
      const rtt = Date.now() - sentAt;
      useSession.getState().setServerOffset(ack.serverNow - (sentAt + rtt / 2));
      if (ack.ok && ack.onboarded) {
        applySnapshot(ack.snapshot);
        useSession.getState().setStatus("world");
      }
      resolve(ack);
    });
  });
}

export function reconnectSocket(): void {
  if (!socket) {
    connectSocket();
    return;
  }
  socket.disconnect();
  socket.connect();
}

export function connectSocket(): Socket {
  if (socket) return socket;
  const url = API_BASE || (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:3001` : undefined);
  const opts = { transports: ["websocket", "polling"], reconnectionDelayMax: 4000, extraHeaders: TUNNEL_HEADERS, auth: (cb: (data: object) => void) => cb({ token: getToken() }) };
  socket = url ? io(url, opts) : io(opts);
  const s = socket;

  s.on("connect", () => {
    useSession.getState().setConnected(true);
    void sayHello();
  });
  s.on("disconnect", () => {
    useSession.getState().setConnected(false);
  });
  s.on(EV.userUpdate, (m: UserUpdateMsg) => {
    const world = useWorld.getState();
    if ("id" in m.patch && m.patch.id) world.upsertUser(m.patch as never);
    else world.patchUser(m.userId, m.patch);
    const me = useSession.getState().me;
    if (me && me.id === m.userId) useSession.getState().setMe({ ...me, ...(m.patch as Partial<MeUser>) });
  });
  s.on(EV.travelStarted, (m: TravelStartedMsg) => {
    useWorld.getState().setTravel(m.userId, m.travel);
  });
  s.on(EV.travelArrivedBroadcast, (m: TravelArrivedAllMsg) => {
    useWorld.getState().setTravel(m.userId, null);
    for (const fn of arrivalListeners) fn(m);
  });
  s.on(EV.spaceSnapshot, (snap: SpaceSnapshot) => {
    useWorld.getState().setOfficeDesks(snap.unitId, snap.desks, snap.rows);
    useSpace.getState().setSnapshot(snap);
    for (const fn of spaceListeners) fn(snap);
  });
  s.on(EV.spaceJoin, (m: SpaceJoinMsg) => {
    useWorld.getState().upsertUser(m.user);
    useSpace.getState().memberJoined(m.user.id, m.position);
  });
  s.on(EV.spaceLeave, (m: SpaceLeaveMsg) => {
    useSpace.getState().memberLeft(m.userId);
    if (m.reason === "travel" && m.toName && m.userId !== useSession.getState().userId) {
      const name = useWorld.getState().users[m.userId]?.name ?? "Someone";
      toast(`${name} left for ${m.toName}`, "travel");
    }
  });
  s.on(EV.pos, (m: PosBroadcast) => {
    if (m.userId === useSession.getState().userId) return;
    useSpace.getState().setPosition(m.userId, { x: m.x, y: m.y, dir: m.dir, moving: m.moving });
  });
  s.on(EV.zoneState, (m: ZoneStateMsg) => {
    useSpace.getState().setZoneOpen(m.zoneId, m.open);
  });
  s.on(EV.zoneMembers, (m: ZoneMembersMsg) => {
    useSpace.getState().setZoneMembers(m.zoneId, m.members);
    for (const fn of zoneEjectListeners) fn(m);
  });
  s.on(EV.speaking, (m: SpeakingBroadcast) => {
    useSpace.getState().setSpeaking(m.userId, m.on);
  });
  s.on(EV.screen, (m: ScreenBroadcast) => {
    useSpace.getState().setSharing(m.userId, m.on);
    if (!m.on) useComm.getState().setRemoteScreen(m.userId, null);
  });
  s.on(EV.deskUpdate, (m: DeskUpdateMsg) => {
    useWorld.getState().updateDesk(m.unitId, m.deskId, m.ownerId);
    const snap = useSpace.getState().snapshot;
    if (snap && snap.unitId === m.unitId) useSpace.getState().setDesks(snap.desks.map((d) => (d.id === m.deskId ? { ...d, ownerId: m.ownerId } : d)));
  });
  s.on(EV.officeUpdate, (m: OfficeUpdateMsg) => {
    useWorld.getState().setOfficeDesks(m.unitId, m.desks, m.rows);
    const snap = useSpace.getState().snapshot;
    if (snap && snap.unitId === m.unitId) useSpace.getState().setDesks(m.desks, m.rows);
  });
  s.on(EV.rtcSignal, (m: RtcSignalIn) => {
    for (const fn of rtcListeners) fn(m);
  });
  s.on(EV.sessionReplaced, () => {
    toast("Opened in another tab. This one is now offline.", "error", { ttl: 60000 });
    s.disconnect();
  });
  s.on(EV.toast, (m: { kind: "info" | "travel" | "error"; text: string }) => toast(m.text, m.kind));

  window.addEventListener("pagehide", () => {
    if (s.connected) s.emit(EV.bye);
  });
  return s;
}

export function sendPos(p: Position): void {
  const msg: PosMsg = p;
  socket?.volatile.emit(EV.pos, msg);
}

export function sendSpeaking(on: boolean): void {
  socket?.emit(EV.speaking, { on });
}

export function sendScreen(on: boolean): void {
  socket?.emit(EV.screen, { on });
}

export function requestZoneEnter(zoneId: ZoneId): Promise<ZoneAck> {
  return new Promise((resolve) => {
    if (!socket) return resolve({ ok: false, code: "wrong_space" });
    socket.emit(EV.zoneEnter, { zoneId }, (ack: ZoneAck) => resolve(ack));
  });
}

export function requestZoneLeave(zoneId: ZoneId): void {
  socket?.emit(EV.zoneLeave, { zoneId }, () => {});
}

export function requestTravel(req: TravelReq): Promise<TravelAck> {
  return new Promise((resolve) => {
    if (!socket) return resolve({ ok: false, code: "unknown_destination" });
    socket.emit(EV.travelRequest, req, (ack: TravelAck) => resolve(ack));
  });
}

export function sendArrived(travelId: string): void {
  socket?.emit(EV.travelArrived, { travelId });
}

export function requestDeskClaim(req: DeskClaimReq): Promise<DeskAck> {
  return new Promise((resolve) => {
    if (!socket) return resolve({ ok: false, code: "unknown_desk" });
    socket.emit(EV.deskClaim, req, (ack: DeskAck) => resolve(ack));
  });
}

export function requestDeskRelease(req: DeskReleaseReq): Promise<DeskAck> {
  return new Promise((resolve) => {
    if (!socket) return resolve({ ok: false, code: "no_desk" });
    socket.emit(EV.deskRelease, req, (ack: DeskAck) => resolve(ack));
  });
}

export function requestDeskAdd(req: DeskAddReq): Promise<DeskAck> {
  return new Promise((resolve) => {
    if (!socket) return resolve({ ok: false, code: "wrong_office" });
    socket.emit(EV.deskAdd, req, (ack: DeskAck) => resolve(ack));
  });
}

export function sendRtcSignal(msg: RtcSignalMsg): void {
  socket?.emit(EV.rtcSignal, msg);
}

export function updateProfile(req: ProfileUpdateReq): Promise<{ ok: boolean; user?: MeUser }> {
  return new Promise((resolve) => {
    if (!socket) return resolve({ ok: false });
    socket.emit(EV.profileUpdate, req, (ack: { ok: boolean; user?: MeUser }) => resolve(ack));
  });
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
