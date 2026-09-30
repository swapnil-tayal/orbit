import type { AvatarSpec } from "../types.ts";
import { normalizeAvatar } from "../avatar.ts";

export interface BotDef {
  id: string;
  name: string;
  avatar: AvatarSpec;
  home: { lat: number; lng: number };
  homeDeskIdx: number;
  role: "seated" | "meeting" | "circle" | "traveler" | "walker" | "offline";
  talkative: boolean;
  circle?: { destId: string; key: string };
  travelTo?: { destId: string };
}

export const PLACES = {
  office: { lat: 23.02, lng: 72.57 },
  chandigarh: { lat: 30.73, lng: 76.78 },
  delhi: { lat: 28.61, lng: 77.21 },
  mumbai: { lat: 19.08, lng: 72.88 },
  andaman: { lat: 11.98, lng: 92.98 },
  bali: { lat: -8.51, lng: 115.26 },
  hyderabad: { lat: 17.385, lng: 78.487 },
} as const;

export const DESTINATIONS: Array<{ id: string; name: string; at: { lat: number; lng: number }; template: "island" }> = [{ id: "bali", name: "Bali", at: PLACES.bali, template: "island" }];

export const BOTS: BotDef[] = [
  { id: "bot-meera", name: "Meera", avatar: normalizeAvatar({ skin: "#E0B08A", hair: "long", hairColor: "#3A2517", outfit: "#22E3FF", acc: "none" }), home: PLACES.office, homeDeskIdx: 5, role: "seated", talkative: true },
  { id: "bot-anya", name: "Anya", avatar: normalizeAvatar({ skin: "#F1D2B6", hair: "bun", hairColor: "#6A4629", outfit: "#FFD23F", acc: "glasses" }), home: PLACES.office, homeDeskIdx: 1, role: "seated", talkative: false },
  { id: "bot-kabir", name: "Kabir", avatar: normalizeAvatar({ skin: "#A06A48", hair: "buzz", hairColor: "#17120F", outfit: "#B6FF3B", acc: "headphones" }), home: PLACES.office, homeDeskIdx: 6, role: "walker", talkative: true },
  { id: "bot-farah", name: "Farah", avatar: normalizeAvatar({ skin: "#77492F", hair: "curly", hairColor: "#17120F", outfit: "#FF5A5F", acc: "none" }), home: PLACES.office, homeDeskIdx: 2, role: "offline", talkative: false },
  { id: "bot-veer", name: "Veer", avatar: normalizeAvatar({ skin: "#77492F", hair: "curly", hairColor: "#17120F", outfit: "#FFD23F", acc: "none" }), home: PLACES.office, homeDeskIdx: 8, role: "meeting", talkative: true },
  { id: "bot-riya", name: "Riya", avatar: normalizeAvatar({ skin: "#C68A62", hair: "bob", hairColor: "#17120F", outfit: "#9B5CFF", acc: "none" }), home: PLACES.office, homeDeskIdx: 10, role: "meeting", talkative: true },
  { id: "bot-jai", name: "Jai", avatar: normalizeAvatar({ skin: "#E0B08A", hair: "short", hairColor: "#3A2517", outfit: "#9B5CFF", acc: "none" }), home: PLACES.office, homeDeskIdx: 9, role: "offline", talkative: false },
  { id: "bot-tara", name: "Tara", avatar: normalizeAvatar({ skin: "#E0B08A", hair: "bob", hairColor: "#6A4629", outfit: "#22E3FF", acc: "none" }), home: PLACES.chandigarh, homeDeskIdx: 6, role: "seated", talkative: true },
  { id: "bot-ishaan", name: "Ishaan", avatar: normalizeAvatar({ skin: "#C68A62", hair: "short", hairColor: "#6A4629", outfit: "#FF8A00", acc: "none" }), home: PLACES.chandigarh, homeDeskIdx: 1, role: "offline", talkative: false },
  { id: "bot-lena", name: "Lena", avatar: normalizeAvatar({ skin: "#F1D2B6", hair: "bob", hairColor: "#FFD23F", outfit: "#9B5CFF", acc: "none" }), home: PLACES.mumbai, homeDeskIdx: 0, role: "circle", talkative: true, circle: { destId: "andaman", key: "deck" } },
  { id: "bot-rohan", name: "Rohan", avatar: normalizeAvatar({ skin: "#C68A62", hair: "buzz", hairColor: "#17120F", outfit: "#3DDC97", acc: "none" }), home: PLACES.delhi, homeDeskIdx: 0, role: "traveler", talkative: false, travelTo: { destId: "andaman" } },
];
