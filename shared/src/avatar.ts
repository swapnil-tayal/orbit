import type { AvatarSpec, BottomStyle, ExtraStyle, FaceStyle, FacialHair, GlassesStyle, HairStyle, HatStyle, JacketStyle, ShoeStyle, TopStyle } from "./types.ts";

export interface AvatarOption<T extends string> {
  value: T;
  label: string;
}

export const AVATAR_OPTIONS = {
  skins: [
    { value: "#F8DCC4", label: "Porcelain" },
    { value: "#F1D2B6", label: "Light" },
    { value: "#E0B08A", label: "Light medium" },
    { value: "#C68A62", label: "Medium" },
    { value: "#A06A48", label: "Medium deep" },
    { value: "#77492F", label: "Deep" },
    { value: "#553524", label: "Deepest" },
  ] as const satisfies readonly AvatarOption<string>[],
  hairColors: [
    { value: "#E8E6F0", label: "White" },
    { value: "#17120F", label: "Black" },
    { value: "#3A2517", label: "Dark brown" },
    { value: "#6A4629", label: "Brown" },
    { value: "#A5895B", label: "Sandy" },
    { value: "#FFC85C", label: "Blonde" },
    { value: "#8A3B2A", label: "Auburn" },
    { value: "#FF8A00", label: "Orange" },
    { value: "#FF3D9A", label: "Pink" },
    { value: "#9B5CFF", label: "Violet" },
    { value: "#22A0FF", label: "Blue" },
    { value: "#5FD35F", label: "Green" },
  ] as const satisfies readonly AvatarOption<string>[],
  clothingColors: [
    { value: "#F53B2B", label: "Red" },
    { value: "#FF8A3D", label: "Orange" },
    { value: "#FFD23F", label: "Yellow" },
    { value: "#6E7A2E", label: "Olive" },
    { value: "#2E9E4A", label: "Green" },
    { value: "#1D8A78", label: "Teal" },
    { value: "#22C1F5", label: "Sky" },
    { value: "#5B6CFF", label: "Blue" },
    { value: "#9B5CFF", label: "Violet" },
    { value: "#E52ED9", label: "Magenta" },
    { value: "#FF3D9A", label: "Pink" },
    { value: "#B36A3D", label: "Brown" },
    { value: "#E9CFAE", label: "Sand" },
    { value: "#FFFFFF", label: "White" },
    { value: "#8C8CA0", label: "Grey" },
    { value: "#2A2A36", label: "Black" },
  ] as const satisfies readonly AvatarOption<string>[],
  hairs: [
    { value: "short", label: "Short" },
    { value: "sidepart", label: "Side part" },
    { value: "buzz", label: "Buzz" },
    { value: "curly", label: "Curly" },
    { value: "afro", label: "Afro" },
    { value: "mohawk", label: "Mohawk" },
    { value: "bob", label: "Bob" },
    { value: "long", label: "Long" },
    { value: "ponytail", label: "Ponytail" },
    { value: "bun", label: "Bun" },
    { value: "braids", label: "Braids" },
    { value: "bald", label: "Bald" },
  ] as const satisfies readonly AvatarOption<HairStyle>[],
  faces: [
    { value: "smile", label: "Smile" },
    { value: "grin", label: "Grin" },
    { value: "laugh", label: "Laugh" },
    { value: "neutral", label: "Neutral" },
    { value: "wink", label: "Wink" },
    { value: "surprised", label: "Surprised" },
    { value: "sleepy", label: "Sleepy" },
  ] as const satisfies readonly AvatarOption<FaceStyle>[],
  facialHairs: [
    { value: "none", label: "None" },
    { value: "stubble", label: "Stubble" },
    { value: "moustache", label: "Moustache" },
    { value: "goatee", label: "Goatee" },
    { value: "beard", label: "Beard" },
  ] as const satisfies readonly AvatarOption<FacialHair>[],
  tops: [
    { value: "tee", label: "T-shirt" },
    { value: "shirt", label: "Shirt" },
    { value: "hoodie", label: "Hoodie" },
    { value: "tank", label: "Tank" },
    { value: "sweater", label: "Sweater" },
    { value: "turtleneck", label: "Turtleneck" },
  ] as const satisfies readonly AvatarOption<TopStyle>[],
  jackets: [
    { value: "none", label: "None" },
    { value: "blazer", label: "Blazer" },
    { value: "denim", label: "Denim" },
    { value: "puffer", label: "Puffer" },
    { value: "cardigan", label: "Cardigan" },
  ] as const satisfies readonly AvatarOption<JacketStyle>[],
  bottoms: [
    { value: "jeans", label: "Jeans" },
    { value: "chinos", label: "Chinos" },
    { value: "joggers", label: "Joggers" },
    { value: "shorts", label: "Shorts" },
    { value: "skirt", label: "Skirt" },
  ] as const satisfies readonly AvatarOption<BottomStyle>[],
  shoes: [
    { value: "sneakers", label: "Sneakers" },
    { value: "boots", label: "Boots" },
    { value: "loafers", label: "Loafers" },
    { value: "sandals", label: "Sandals" },
  ] as const satisfies readonly AvatarOption<ShoeStyle>[],
  hats: [
    { value: "none", label: "None" },
    { value: "cap", label: "Cap" },
    { value: "beanie", label: "Beanie" },
    { value: "bucket", label: "Bucket hat" },
    { value: "headband", label: "Headband" },
    { value: "headphones", label: "Headphones" },
    { value: "flowers", label: "Flower crown" },
    { value: "crown", label: "Crown" },
  ] as const satisfies readonly AvatarOption<HatStyle>[],
  glasses: [
    { value: "none", label: "None" },
    { value: "round", label: "Round" },
    { value: "square", label: "Square" },
    { value: "sunglasses", label: "Sunglasses" },
    { value: "visor", label: "Visor" },
  ] as const satisfies readonly AvatarOption<GlassesStyle>[],
  extras: [
    { value: "none", label: "None" },
    { value: "scarf", label: "Scarf" },
    { value: "necklace", label: "Necklace" },
    { value: "earrings", label: "Earrings" },
    { value: "mask", label: "Mask" },
    { value: "badge", label: "Badge" },
  ] as const satisfies readonly AvatarOption<ExtraStyle>[],
};

export const DEFAULT_AVATAR: AvatarSpec = {
  skin: "#C68A62",
  hair: "short",
  hairColor: "#17120F",
  facialHair: "none",
  face: "smile",
  top: "tee",
  topColor: "#FF3D9A",
  jacket: "none",
  jacketColor: "#2A2A36",
  bottom: "jeans",
  bottomColor: "#2A2A36",
  shoes: "sneakers",
  shoesColor: "#FFFFFF",
  hat: "none",
  hatColor: "#F53B2B",
  glasses: "none",
  extra: "none",
  extraColor: "#FFD23F",
};

const HEX = /^#[0-9a-fA-F]{6}$/;

function pickHex(v: unknown, fallback: string): string {
  return typeof v === "string" && HEX.test(v) ? v : fallback;
}

function pickEnum<T extends string>(list: readonly AvatarOption<T>[], v: unknown, fallback: T): T {
  return list.some((o) => o.value === v) ? (v as T) : fallback;
}

export function normalizeAvatar(input: unknown): AvatarSpec {
  const a = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const d = DEFAULT_AVATAR;
  const legacyAcc = a.acc;
  const o = AVATAR_OPTIONS;
  return {
    skin: pickHex(a.skin, d.skin),
    hair: pickEnum(o.hairs, a.hair, d.hair),
    hairColor: pickHex(a.hairColor, d.hairColor),
    facialHair: pickEnum(o.facialHairs, a.facialHair, d.facialHair),
    face: pickEnum(o.faces, a.face, d.face),
    top: pickEnum(o.tops, a.top, d.top),
    topColor: pickHex(a.topColor ?? a.outfit, d.topColor),
    jacket: pickEnum(o.jackets, a.jacket, d.jacket),
    jacketColor: pickHex(a.jacketColor, d.jacketColor),
    bottom: pickEnum(o.bottoms, a.bottom, d.bottom),
    bottomColor: pickHex(a.bottomColor, d.bottomColor),
    shoes: pickEnum(o.shoes, a.shoes, d.shoes),
    shoesColor: pickHex(a.shoesColor, d.shoesColor),
    hat: pickEnum(o.hats, a.hat ?? (legacyAcc === "headphones" ? "headphones" : undefined), d.hat),
    hatColor: pickHex(a.hatColor, d.hatColor),
    glasses: pickEnum(o.glasses, a.glasses ?? (legacyAcc === "glasses" ? "square" : undefined), d.glasses),
    extra: pickEnum(o.extras, a.extra, d.extra),
    extraColor: pickHex(a.extraColor, d.extraColor),
  };
}

export function randomAvatar(rand: () => number = Math.random): AvatarSpec {
  const pick = <T extends string>(list: readonly AvatarOption<T>[]): T => list[Math.floor(rand() * list.length)].value;
  const maybe = <T extends string>(list: readonly AvatarOption<T>[], p: number): T => (rand() < p ? pick(list) : list[0].value);
  const o = AVATAR_OPTIONS;
  return {
    skin: pick(o.skins),
    hair: pick(o.hairs),
    hairColor: pick(o.hairColors),
    facialHair: "none",
    face: pick(o.faces),
    top: pick(o.tops),
    topColor: pick(o.clothingColors),
    jacket: maybe(o.jackets, 0.4),
    jacketColor: pick(o.clothingColors),
    bottom: pick(o.bottoms),
    bottomColor: pick(o.clothingColors),
    shoes: pick(o.shoes),
    shoesColor: pick(o.clothingColors),
    hat: maybe(o.hats, 0.35),
    hatColor: pick(o.clothingColors),
    glasses: maybe(o.glasses, 0.35),
    extra: maybe(o.extras, 0.3),
    extraColor: pick(o.clothingColors),
  };
}
