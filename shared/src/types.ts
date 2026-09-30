export type UnitId = string;
export type SpaceId = string;
export type DeskId = string;
export type ZoneId = string;
export type UserId = string;

export type HairStyle = "short" | "sidepart" | "buzz" | "curly" | "afro" | "mohawk" | "bob" | "long" | "ponytail" | "bun" | "braids" | "bald";
export type FacialHair = "none" | "stubble" | "moustache" | "goatee" | "beard";
export type TopStyle = "tee" | "shirt" | "hoodie" | "tank" | "sweater" | "turtleneck";
export type JacketStyle = "none" | "blazer" | "denim" | "puffer" | "cardigan";
export type BottomStyle = "jeans" | "chinos" | "joggers" | "shorts" | "skirt";
export type ShoeStyle = "sneakers" | "boots" | "loafers" | "sandals";
export type HatStyle = "none" | "cap" | "beanie" | "bucket" | "headband" | "headphones" | "flowers" | "crown";
export type GlassesStyle = "none" | "round" | "square" | "sunglasses" | "visor";
export type FaceStyle = "smile" | "grin" | "neutral" | "wink" | "laugh" | "surprised" | "sleepy";
export type ExtraStyle = "none" | "scarf" | "necklace" | "earrings" | "mask" | "badge";

export interface AvatarSpec {
  skin: string;
  hair: HairStyle;
  hairColor: string;
  facialHair: FacialHair;
  face: FaceStyle;
  top: TopStyle;
  topColor: string;
  jacket: JacketStyle;
  jacketColor: string;
  bottom: BottomStyle;
  bottomColor: string;
  shoes: ShoeStyle;
  shoesColor: string;
  hat: HatStyle;
  hatColor: string;
  glasses: GlassesStyle;
  extra: ExtraStyle;
  extraColor: string;
}

export type Presence = "online" | "traveling" | "offline";
export type TravelMode = "car" | "flight";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface TravelState {
  id: string;
  mode: TravelMode;
  fromUnit: UnitId;
  toUnit: UnitId;
  toSpaceId: SpaceId;
  toName: string;
  startedAt: number;
  durationMs: number;
  distanceKm: number;
}

export interface Position {
  x: number;
  y: number;
  dir: number;
  moving: boolean;
}

export interface PublicUser {
  id: UserId;
  name: string;
  avatar: AvatarSpec;
  isBot: boolean;
  homeUnit: UnitId | null;
  homeDeskId: DeskId | null;
  officeUnit: UnitId | null;
  officeDeskId: DeskId | null;
  currentUnit: UnitId | null;
  spaceId: SpaceId | null;
  presence: Presence;
  travel: TravelState | null;
  seated: boolean;
}

export interface MeUser extends PublicUser {
  onboarded: boolean;
  lastMode: TravelMode | null;
}

export interface DeskInfo {
  id: DeskId;
  unitId: UnitId;
  idx: number;
  ownerId: UserId | null;
}

export interface OfficeInfo {
  unitId: UnitId;
  name: string;
  rows: number;
  deskCount: number;
}

export interface DestinationInfo {
  id: string;
  name: string;
  unitId: UnitId;
  template: "island";
}

export interface ZoneSnapshot {
  open: boolean;
  members: UserId[];
}

export interface SpaceSnapshot {
  id: SpaceId;
  kind: "office" | "dest" | "home";
  unitId: UnitId;
  destId: string | null;
  ownerId: UserId | null;
  rows: number;
  desks: DeskInfo[];
  members: Record<UserId, Position>;
  zones: Record<ZoneId, ZoneSnapshot>;
  speaking: UserId[];
  sharing: UserId[];
}

export interface WorldSnapshot {
  serverNow: number;
  me: MeUser;
  users: PublicUser[];
  space: SpaceSnapshot | null;
  offices: OfficeInfo[];
  destinations: DestinationInfo[];
}

export interface UnitSummary {
  unitId: UnitId;
  office: OfficeInfo | null;
  destination: DestinationInfo | null;
  people: PublicUser[];
  tz: string | null;
}
