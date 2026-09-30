import type { SpaceId, UserId } from "@orbit/shared";

export interface Emitter {
  toWorld(event: string, payload: unknown): void;
  toSpace(spaceId: SpaceId, event: string, payload: unknown): void;
  toSocket(socketId: string, event: string, payload: unknown): void;
  toUser(userId: UserId, event: string, payload: unknown): void;
  disconnectSocket(socketId: string): void;
  joinRoom(socketId: string, room: string): void;
  leaveRoom(socketId: string, room: string): void;
}

export const nullEmitter: Emitter = {
  toWorld: () => {},
  toSpace: () => {},
  toSocket: () => {},
  toUser: () => {},
  disconnectSocket: () => {},
  joinRoom: () => {},
  leaveRoom: () => {},
};

export function spaceRoom(spaceId: SpaceId): string {
  return `space:${spaceId}`;
}

export const WORLD_ROOM = "world";
