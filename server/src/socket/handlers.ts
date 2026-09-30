import type { Server, Socket } from "socket.io";
import {
  CONFIG,
  EV,
  type DeskAddReq,
  type DeskClaimReq,
  type DeskReleaseReq,
  type HelloAck,
  type HelloReq,
  type PosMsg,
  type ProfileUpdateReq,
  type RtcSignalIn,
  type RtcSignalMsg,
  type ScreenMsg,
  type SpeakingMsg,
  type TravelArrivedMsg,
  type TravelReq,
  type ZoneReq,
} from "@orbit/shared";
import type { Emitter } from "../world/emitter.ts";
import { spaceRoom, WORLD_ROOM } from "../world/emitter.ts";
import type { LiveUser, World } from "../world/state.ts";
import { arrive, requestTravel } from "../world/travel.ts";
import { addDesk, claimDesk, releaseDesk } from "../world/desks.ts";
import { sanitizeAvatar, sanitizeName } from "../http/routes.ts";
import { verifyToken, type AuthConfig } from "../http/auth.ts";

export function createEmitter(io: Server, world: World): Emitter {
  return {
    toWorld: (event, payload) => io.to(WORLD_ROOM).emit(event, payload),
    toSpace: (spaceId, event, payload) => io.to(spaceRoom(spaceId)).emit(event, payload),
    toSocket: (socketId, event, payload) => io.to(socketId).emit(event, payload),
    toUser: (userId, event, payload) => {
      const u = world.users.get(userId);
      if (u?.socketId) io.to(u.socketId).emit(event, payload);
    },
    disconnectSocket: (socketId) => io.sockets.sockets.get(socketId)?.disconnect(true),
    joinRoom: (socketId, room) => io.sockets.sockets.get(socketId)?.join(room),
    leaveRoom: (socketId, room) => io.sockets.sockets.get(socketId)?.leave(room),
  };
}

type Ack<T> = (res: T) => void;

export function attachHandlers(io: Server, world: World, auth: AuthConfig): void {
  io.use((socket, next) => {
    const token = (socket.handshake.auth as Record<string, unknown> | undefined)?.token;
    socket.data.userId = verifyToken(auth.secret, token);
    next();
  });
  io.on("connection", (socket: Socket) => {
    let user: LiveUser | null = null;
    const posMinGap = 1000 / CONFIG.rates.posPerSec;
    const speakMinGap = 1000 / CONFIG.rates.speakingPerSec;

    socket.on(EV.hello, (req: HelloReq, ack?: Ack<HelloAck>) => {
      const serverNow = world.now();
      const authed = socket.data.userId as string | null;
      if (!req || !authed) {
        ack?.({ ok: false, code: "bad_request", serverNow });
        return;
      }
      const live = world.users.get(authed);
      if (!live || !live.stored.onboarded) {
        ack?.({ ok: true, serverNow, onboarded: false, snapshot: null });
        return;
      }
      user = live;
      world.bindSocket(live, socket.id);
      ack?.({ ok: true, serverNow, onboarded: true, snapshot: world.snapshotFor(live) });
    });

    socket.on(EV.pos, (p: PosMsg) => {
      if (!user || !p) return;
      const now = world.now();
      if (now - user.lastPosAt < posMinGap) return;
      user.lastPosAt = now;
      if (typeof p.x !== "number" || typeof p.y !== "number" || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
      world.updatePos(user, { x: p.x, y: p.y, dir: Number(p.dir) || 0, moving: !!p.moving }, true);
    });

    socket.on(EV.zoneEnter, (req: ZoneReq, ack?: Ack<unknown>) => {
      if (!user || !req || typeof req.zoneId !== "string") {
        ack?.({ ok: false, code: "wrong_space" });
        return;
      }
      ack?.(world.enterZone(user, req.zoneId));
    });

    socket.on(EV.zoneLeave, (_req: ZoneReq, ack?: Ack<unknown>) => {
      if (!user) {
        ack?.({ ok: false, code: "wrong_space" });
        return;
      }
      world.leaveZone(user, true);
      ack?.({ ok: true, members: [] });
    });

    socket.on(EV.speaking, (m: SpeakingMsg) => {
      if (!user || !m) return;
      const now = world.now();
      if (now - user.lastSpeakingAt < speakMinGap) return;
      user.lastSpeakingAt = now;
      if (!user.zoneId && m.on) return;
      world.setSpeaking(user, !!m.on, true);
    });

    socket.on(EV.screen, (m: ScreenMsg) => {
      if (!user || !m) return;
      if (!user.zoneId && m.on) return;
      world.setSharing(user, !!m.on, true);
    });

    socket.on(EV.travelRequest, (req: TravelReq, ack?: Ack<unknown>) => {
      if (!user || !req || (req.mode !== "car" && req.mode !== "flight") || !req.to) {
        ack?.({ ok: false, code: "unknown_destination" });
        return;
      }
      ack?.(requestTravel(world, user, req));
    });

    socket.on(EV.travelArrived, (m: TravelArrivedMsg) => {
      if (!user || !m || typeof m.travelId !== "string") return;
      arrive(world, user, m.travelId);
    });

    socket.on(EV.deskClaim, (req: DeskClaimReq, ack?: Ack<unknown>) => {
      if (!user || !req || typeof req.deskId !== "string" || (req.role !== "home" && req.role !== "office")) {
        ack?.({ ok: false, code: "unknown_desk" });
        return;
      }
      ack?.(claimDesk(world, user, req.deskId, req.role));
    });

    socket.on(EV.deskRelease, (req: DeskReleaseReq, ack?: Ack<unknown>) => {
      if (!user || !req || (req.role !== "home" && req.role !== "office")) {
        ack?.({ ok: false, code: "no_desk" });
        return;
      }
      ack?.(releaseDesk(world, user, req.role));
    });

    socket.on(EV.deskAdd, (req: DeskAddReq, ack?: Ack<unknown>) => {
      if (!user || !req || typeof req.unitId !== "string") {
        ack?.({ ok: false, code: "wrong_office" });
        return;
      }
      ack?.(addDesk(world, req.unitId));
    });

    socket.on(EV.rtcSignal, (m: RtcSignalMsg) => {
      if (!user || !m || typeof m.to !== "string") return;
      const target = world.users.get(m.to);
      if (!target || !target.socketId || target.spaceId !== user.spaceId) return;
      const out: RtcSignalIn = { from: user.stored.id, description: m.description, candidate: m.candidate };
      io.to(target.socketId).emit(EV.rtcSignal, out);
    });

    socket.on(EV.profileUpdate, (req: ProfileUpdateReq, ack?: Ack<unknown>) => {
      if (!user || !req) {
        ack?.({ ok: false });
        return;
      }
      const name = req.name !== undefined ? sanitizeName(req.name) : user.stored.name;
      const avatar = req.avatar !== undefined ? sanitizeAvatar(req.avatar) : user.stored.avatar;
      if (!name || !avatar) {
        ack?.({ ok: false });
        return;
      }
      user.stored.name = name;
      user.stored.avatar = avatar;
      world.repo.users.setProfile(user.stored.id, name, avatar);
      world.broadcastUser(user);
      ack?.({ ok: true, user: world.meUser(user) });
    });

    socket.on(EV.bye, () => {
      if (!user) return;
      const u = user;
      user = null;
      u.socketId = null;
      world.goOffline(u);
    });

    socket.on("disconnect", () => {
      if (!user) return;
      world.onDisconnect(user, socket.id);
      user = null;
    });
  });
}
