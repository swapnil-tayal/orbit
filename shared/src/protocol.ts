import type {
  AvatarSpec,
  DeskId,
  DeskInfo,
  Position,
  PublicUser,
  SpaceId,
  SpaceSnapshot,
  TravelMode,
  TravelState,
  UnitId,
  UserId,
  WorldSnapshot,
  ZoneId,
} from "./types.ts";

export const EV = {
  hello: "hello",
  pos: "pos",
  zoneEnter: "zone:enter",
  zoneLeave: "zone:leave",
  speaking: "speaking",
  screen: "screen",
  travelRequest: "travel:request",
  travelArrived: "travel:arrived",
  deskClaim: "desk:claim",
  deskRelease: "desk:release",
  deskAdd: "desk:add",
  rtcSignal: "rtc:signal",
  profileUpdate: "profile:update",
  bye: "bye",
  userUpdate: "user:update",
  travelStarted: "travel:started",
  travelArrivedBroadcast: "travel:arrived:all",
  spaceSnapshot: "space:snapshot",
  spaceJoin: "space:join",
  spaceLeave: "space:leave",
  zoneState: "zone:state",
  zoneMembers: "zone:members",
  deskUpdate: "desk:update",
  officeUpdate: "office:update",
  sessionReplaced: "session:replaced",
  toast: "toast",
} as const;

export interface HelloReq {
  userId: UserId;
  clientNow: number;
}

export type HelloAck =
  | { ok: true; serverNow: number; onboarded: true; snapshot: WorldSnapshot }
  | { ok: true; serverNow: number; onboarded: false; snapshot: null }
  | { ok: false; code: "world_full" | "bad_request"; serverNow: number };

export interface PosMsg extends Position {}

export interface ZoneReq {
  zoneId: ZoneId;
}

export type ZoneAck = { ok: true; members: UserId[] } | { ok: false; code: "closed" | "wrong_space" | "too_far" | "unknown_zone" };

export interface SpeakingMsg {
  on: boolean;
}

export interface ScreenMsg {
  on: boolean;
}

export interface TravelReq {
  mode: TravelMode;
  to: { unitId: UnitId } | { destId: string } | { homeOf: UserId };
}

export type TravelAck =
  | { ok: true; travel: TravelState }
  | { ok: true; travel: null; moved: true }
  | { ok: false; code: "car_not_possible" | "already_traveling" | "same_unit" | "unknown_destination" | "not_habitable" };

export interface TravelArrivedMsg {
  travelId: string;
}

export interface DeskClaimReq {
  deskId: DeskId;
  role: "home" | "office";
}

export interface DeskReleaseReq {
  role: "home" | "office";
}

export interface DeskAddReq {
  unitId: UnitId;
}

export type DeskAck = { ok: true; released: DeskId | null; desks: DeskInfo[] } | { ok: false; code: "desk_taken" | "office_full" | "wrong_office" | "unknown_desk" | "no_desk" | "works_from_home" | "office_required" };

export interface RtcSignalMsg {
  to: UserId;
  description?: { type: string; sdp?: string };
  candidate?: unknown;
}

export interface RtcSignalIn {
  from: UserId;
  description?: { type: string; sdp?: string };
  candidate?: unknown;
}

export interface ProfileUpdateReq {
  name?: string;
  avatar?: AvatarSpec;
}

export interface UserUpdateMsg {
  userId: UserId;
  patch: Partial<PublicUser>;
}

export interface TravelStartedMsg {
  userId: UserId;
  travel: TravelState;
}

export interface TravelArrivedAllMsg {
  userId: UserId;
  spaceId: SpaceId;
  position: Position;
  toName: string;
}

export interface SpaceJoinMsg {
  user: PublicUser;
  position: Position;
}

export interface SpaceLeaveMsg {
  userId: UserId;
  reason: "left" | "travel" | "offline";
  toName?: string;
}

export interface PosBroadcast extends Position {
  userId: UserId;
}

export interface ZoneStateMsg {
  zoneId: ZoneId;
  open: boolean;
}

export interface ZoneMembersMsg {
  zoneId: ZoneId;
  members: UserId[];
  reason?: "owner_left";
}

export interface DeskUpdateMsg {
  deskId: DeskId;
  unitId: UnitId;
  ownerId: UserId | null;
}

export interface OfficeUpdateMsg {
  unitId: UnitId;
  rows: number;
  desks: DeskInfo[];
}

export interface SpeakingBroadcast {
  userId: UserId;
  on: boolean;
}

export interface ScreenBroadcast {
  userId: UserId;
  on: boolean;
}

export interface ToastMsg {
  kind: "info" | "travel" | "error";
  text: string;
}

export type SpaceSnapshotMsg = SpaceSnapshot;
