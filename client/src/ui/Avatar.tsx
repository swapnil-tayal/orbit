import type { CSSProperties, ReactNode } from "react";
import { normalizeAvatar, type AvatarSpec, type FaceStyle, type HairStyle } from "@orbit/shared";

export type AvatarPresence = "online" | "traveling" | "offline" | "none";

export interface AvatarProps {
  spec: AvatarSpec;
  size?: number;
  mode?: "bust" | "figure";
  presence?: AvatarPresence;
  you?: boolean;
  speaking?: boolean;
  pulse?: boolean;
  label?: string;
  accent?: string;
  dot?: boolean;
  style?: CSSProperties;
  className?: string;
}

/*
 * Drawing style: flat illustration with ink outlines and one soft light from the upper left.
 * Every shape is filled, then given a dark outline; a translucent black overlay on the right
 * and a translucent white overlay on the left give the cel shading. The head lives in a
 * 100 x 100 space (face centred at 50,44) and is reused, scaled down, on the full figure.
 */

const INK = "#0E0B1F";
const IRIS = "#2B1A14";
const SHADE = "rgba(0,0,0,0.16)";
const LIGHT = "rgba(255,255,255,0.09)";

const SHORT = "M32.5 44 C31 28 40 21 50.5 21 C61 21 69.5 28 67.5 44 C66 37 60 32.5 50 32.5 C41 32.5 35 36.5 32.5 44 Z";
const BOB = "M31 47 C29 28 39 20 50 20 C61 20 71 28 69 47 L69.5 57 C66 59 63 58.5 61.5 56 L62 38 C57 33 43 33 38 38 L38.5 56 C37 58.5 34 59 30.5 57 Z";

const HAIR: Record<HairStyle, string> = {
  short: SHORT,
  sidepart: "M32 44 C31 27 41 20.5 52 20.5 C63 20.5 70 28 68 42 C64 34 56 31 46.5 33 C40.5 34.5 35.5 38.5 32 44 Z",
  buzz: "M33.5 41 C33.5 29 41 23.5 50 23.5 C59 23.5 66.5 29 66.5 41 C62.5 35 57 32 50 32 C43 32 37.5 35 33.5 41 Z",
  curly: "M30.5 45 C26 37 29.5 27 36.5 25 C38.5 18 46.5 15.5 51.5 18.5 C57.5 14.5 66 18 67.5 25 C73.5 28 74.5 38 70 45 C68.5 38 62 33 50.5 33 C39 33 32.5 38 30.5 45 Z",
  afro: "M26 44 C22 24 36 11 50 11 C64 11 78 24 74 44 C72 36 64 32 50 32 C36 32 28 36 26 44 Z",
  mohawk: "M33.5 41 C33.5 29 41 23.5 50 23.5 C59 23.5 66.5 29 66.5 41 C62.5 35 57 32 50 32 C43 32 37.5 35 33.5 41 Z M44 33 C44 20 48 12 50 8 C52 12 56 20 56 33 Z",
  bob: BOB,
  long: "M31 45 C29 27 39 19.5 50 19.5 C61 19.5 71 27 69 45 L71.5 68 C67 71.5 63 71 60.5 68.5 L61 38 C56.5 33.5 43.5 33.5 39 38 L39.5 68.5 C37 71 33 71.5 28.5 68 Z",
  ponytail: SHORT + " M63 36 C71 38 73 52 67 64 C66 52 62 45 57 41 Z",
  bun: "M32.5 44 C31 29 40 22 50.5 22 C61 22 69.5 29 67.5 44 C65.5 37 59.5 33 50 33 C40.5 33 34.5 37 32.5 44 Z M43 17 C43 11.5 57 11.5 57 17 C57 22.5 43 22.5 43 17 Z",
  braids: BOB,
  bald: "",
};

/** Hair drawn behind the head so long styles frame the face instead of sitting on it. */
const HAIR_BACK: Partial<Record<HairStyle, string>> = {
  long: "M31 40 C30 28 38 22 50 22 C62 22 70 28 69 40 L72 70 C66 74 34 74 28 70 Z",
  bob: "M31 42 C30 28 38 22 50 22 C62 22 70 28 69 42 L70 58 C64 62 36 62 30 58 Z",
  braids: "M31 42 C30 28 38 22 50 22 C62 22 70 28 69 42 L70 58 C64 62 36 62 30 58 Z",
  curly: "M28.5 44 C25 30 34 21 50 21 C66 21 75 30 71.5 44 C72.5 51 66 54.5 50 54.5 C34 54.5 27.5 51 28.5 44 Z",
  afro: "M25 50 C20 28 34 12 50 12 C66 12 80 28 75 50 C74 60 66 66 50 66 C34 66 26 60 25 50 Z",
};

const PRESENCE_COLOR: Record<AvatarPresence, string> = { online: "#B6FF3B", traveling: "#22E3FF", offline: "#6E6A8F", none: "#6E6A8F" };

const CURLY_CURLS: Array<[number, number, number]> = [
  [31.5, 44, 4.6], [33.5, 34, 4.8], [39, 26.5, 5], [46, 22, 5], [54, 22, 5], [61, 26.5, 5], [66.5, 34, 4.8], [68.5, 44, 4.6], [30, 52, 4], [70, 52, 4],
];
const AFRO_CURLS: Array<[number, number, number]> = [
  [27, 46, 6], [28, 34, 6.2], [33, 23, 6.4], [41, 15, 6.4], [50, 12.5, 6.4], [59, 15, 6.4], [67, 23, 6.4], [72, 34, 6.2], [73, 46, 6], [27, 56, 5.5], [73, 56, 5.5],
];

const FACE = "M33 41 C33 27 40.5 21.5 50 21.5 C59.5 21.5 67 27 67 41 C67 52.5 60.5 63 50 64 C39.5 63 33 52.5 33 41 Z";

/* ---------------------------------------------------------------- face */

function Brow({ cx, lift = 0, tilt = 0 }: { cx: number; lift?: number; tilt?: number }) {
  return <path d={`M${cx - 4.2} ${38.8 - lift + tilt} Q${cx} ${36.4 - lift} ${cx + 4.2} ${38.4 - lift - tilt}`} stroke={INK} strokeWidth="1.7" strokeLinecap="round" fill="none" opacity="0.9" />;
}

function OpenEye({ cx, big = false }: { cx: number; big?: boolean }) {
  const rx = big ? 3.9 : 3.3;
  const ry = big ? 4.4 : 3.7;
  return (
    <g>
      <ellipse cx={cx} cy={45} rx={rx} ry={ry} fill="#FFFFFF" />
      <circle cx={cx + 0.3} cy={45.4} r={big ? 2.6 : 2.2} fill={IRIS} />
      <circle cx={cx + 0.5} cy={45.7} r={big ? 1.4 : 1.15} fill={INK} />
      <circle cx={cx - 0.7} cy={44} r="0.9" fill="#FFFFFF" />
      <path d={`M${cx - rx} 43.6 Q${cx} ${45 - ry - 1.2} ${cx + rx} 43.6`} stroke={INK} strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </g>
  );
}

function HappyEye({ cx }: { cx: number }) {
  return <path d={`M${cx - 3.3} 46.2 Q${cx} 42.4 ${cx + 3.3} 46.2`} stroke={INK} strokeWidth="1.7" strokeLinecap="round" fill="none" />;
}

function RestingEye({ cx }: { cx: number }) {
  return (
    <g>
      <path d={`M${cx - 3.3} 44.6 Q${cx} 47.6 ${cx + 3.3} 44.6`} stroke={INK} strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d={`M${cx - 2} 48.4 l1.2 1.4 M${cx + 1} 48.4 l1.2 1.4`} stroke={INK} strokeWidth="0.9" strokeLinecap="round" opacity="0.5" />
    </g>
  );
}

function Mouth({ kind }: { kind: "smile" | "grin" | "flat" | "open" | "o" }) {
  if (kind === "grin")
    return (
      <>
        <path d="M44.5 53.4 Q50 60.6 55.5 53.4 Z" fill={INK} />
        <rect x="46.2" y="53.9" width="7.6" height="1.9" rx="0.6" fill="#FFFFFF" />
        <path d="M47.2 57.2 Q50 59.4 52.8 57.2 Q50 58.2 47.2 57.2 Z" fill="#FF6B9D" />
      </>
    );
  if (kind === "open")
    return (
      <>
        <path d="M44 53 Q50 62 56 53 Z" fill={INK} />
        <path d="M46.4 57.6 Q50 60.6 53.6 57.6 Q50 59.2 46.4 57.6 Z" fill="#FF6B9D" />
      </>
    );
  if (kind === "o") return <ellipse cx="50" cy="56" rx="2.2" ry="2.9" fill={INK} />;
  if (kind === "flat") return <path d="M46.2 55 L53.8 55" stroke={INK} strokeWidth="1.6" strokeLinecap="round" />;
  return (
    <>
      <path d="M45.4 53.8 Q50 58.6 54.6 53.8" stroke={INK} strokeWidth="1.7" strokeLinecap="round" fill="none" />
      <path d="M47 56.6 Q50 58 53 56.6" stroke="#FFFFFF" strokeWidth="0.8" strokeLinecap="round" opacity="0.35" fill="none" />
    </>
  );
}

function Face({ face }: { face: FaceStyle }) {
  const nose = <path d="M50.6 45.2 Q48.4 49.6 50.9 50.6" stroke={INK} strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.55" />;
  const blush = (
    <g opacity="0.22">
      <ellipse cx="40.5" cy="50.5" rx="3.6" ry="2" fill="#FF6B9D" />
      <ellipse cx="59.5" cy="50.5" rx="3.6" ry="2" fill="#FF6B9D" />
    </g>
  );
  if (face === "grin")
    return (
      <>
        {blush}
        <Brow cx={44} /> <Brow cx={56} />
        <OpenEye cx={44} /> <OpenEye cx={56} />
        {nose}
        <Mouth kind="grin" />
      </>
    );
  if (face === "laugh")
    return (
      <>
        {blush}
        <Brow cx={44} lift={1} /> <Brow cx={56} lift={1} />
        <HappyEye cx={44} /> <HappyEye cx={56} />
        {nose}
        <Mouth kind="open" />
      </>
    );
  if (face === "neutral")
    return (
      <>
        <Brow cx={44} /> <Brow cx={56} />
        <OpenEye cx={44} /> <OpenEye cx={56} />
        {nose}
        <Mouth kind="flat" />
      </>
    );
  if (face === "wink")
    return (
      <>
        {blush}
        <Brow cx={44} /> <Brow cx={56} lift={0.8} />
        <OpenEye cx={44} /> <HappyEye cx={56} />
        {nose}
        <Mouth kind="smile" />
      </>
    );
  if (face === "surprised")
    return (
      <>
        <Brow cx={44} lift={2.4} /> <Brow cx={56} lift={2.4} />
        <OpenEye cx={44} big /> <OpenEye cx={56} big />
        {nose}
        <Mouth kind="o" />
      </>
    );
  if (face === "sleepy")
    return (
      <>
        <Brow cx={44} lift={-0.6} /> <Brow cx={56} lift={-0.6} />
        <RestingEye cx={44} /> <RestingEye cx={56} />
        {nose}
        <Mouth kind="flat" />
      </>
    );
  return (
    <>
      {blush}
      <Brow cx={44} /> <Brow cx={56} />
      <OpenEye cx={44} /> <OpenEye cx={56} />
      {nose}
      <Mouth kind="smile" />
    </>
  );
}

/* ---------------------------------------------------------------- head */

function Head({ spec, stroke }: { spec: AvatarSpec; stroke: number }) {
  const hairPath = HAIR[spec.hair] ?? SHORT;
  const back = HAIR_BACK[spec.hair];
  const hatted = spec.hat !== "none" && spec.hat !== "headband" && spec.hat !== "headphones" && spec.hat !== "flowers";
  return (
    <>
      {back ? <path d={back} fill={spec.hairColor} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" /> : null}
      {back ? <path d={back} fill="#000000" opacity="0.22" /> : null}
      <ellipse cx="32.6" cy="46" rx="3.1" ry="4.3" fill={spec.skin} stroke={INK} strokeWidth="1.2" />
      <ellipse cx="67.4" cy="46" rx="3.1" ry="4.3" fill={spec.skin} stroke={INK} strokeWidth="1.2" />
      <ellipse cx="33.2" cy="46.4" rx="1.3" ry="2.1" fill="#000000" opacity="0.16" />
      <ellipse cx="66.8" cy="46.4" rx="1.3" ry="2.1" fill="#000000" opacity="0.16" />
      <path d={FACE} fill={spec.skin} />
      <path d="M50 21.5 C59.5 21.5 67 27 67 41 C67 52.5 60.5 63 50 64 Z" fill="#000000" opacity="0.07" />
      <path d="M50 21.5 C40.5 21.5 33 27 33 41 C33 45 34 49 35.5 52.5 C36 40 40 30 50 26 Z" fill="#FFFFFF" opacity="0.07" />
      <path d="M38 60 C42 63.5 58 63.5 62 60 C58 65 42 65 38 60 Z" fill="#000000" opacity="0.1" />
      <Face face={spec.face} />
      {spec.extra === "earrings" ? (
        <>
          <circle cx="32.6" cy="51.5" r="2.1" fill={spec.extraColor} stroke={INK} strokeWidth="0.8" />
          <circle cx="67.4" cy="51.5" r="2.1" fill={spec.extraColor} stroke={INK} strokeWidth="0.8" />
        </>
      ) : null}
      {spec.extra === "mask" ? (
        <>
          <path d="M34.5 47 C39 44 44.5 43 50 43 C55.5 43 61 44 65.5 47 C65.5 57.5 58.5 62.5 50 62.5 C41.5 62.5 34.5 57.5 34.5 47 Z" fill={spec.extraColor} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M50 43 C55.5 43 61 44 65.5 47 C65.5 57.5 58.5 62.5 50 62.5 Z" fill="#000000" opacity="0.12" />
          <path d="M38 50.5 Q50 52.5 62 50.5 M38.5 55 Q50 57 61.5 55" stroke="#000000" strokeWidth="0.8" opacity="0.18" fill="none" />
          <path d="M34.5 48 L31.5 46.5 M65.5 48 L68.5 46.5" stroke={spec.extraColor} strokeWidth="1.6" strokeLinecap="round" />
        </>
      ) : null}
      <path d={FACE} fill="none" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      {spec.hair === "curly" || spec.hair === "afro" ? (
        <g>
          {(spec.hair === "afro" ? AFRO_CURLS : CURLY_CURLS).map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill={spec.hairColor} stroke={INK} strokeWidth="1.2" />
          ))}
        </g>
      ) : null}
      {hairPath ? (
        <>
          <path d={hairPath} fill={spec.hairColor} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          {spec.hair === "curly" || spec.hair === "afro" ? (
            <g>
              {(spec.hair === "afro" ? AFRO_CURLS : CURLY_CURLS).map(([x, y, r]) => (
                <circle key={`i${x}-${y}`} cx={x} cy={y} r={r} fill={spec.hairColor} />
              ))}
              <path d={hairPath} fill="none" stroke={INK} strokeWidth="1.3" strokeLinejoin="round" opacity="0.35" />
            </g>
          ) : null}
          <path d={hairPath} fill="#000000" opacity="0.12" style={{ clipPath: "inset(0 0 0 50%)" }} />
          {!hatted ? <path d="M39 29.5 Q49 24.5 60 29" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" opacity="0.2" fill="none" /> : null}
          <path d="M36 42 Q40 36 45 34.5 M55 34 Q60 35.5 64 41" stroke={INK} strokeWidth="0.9" strokeLinecap="round" opacity="0.25" fill="none" />
        </>
      ) : null}
      {spec.hair === "braids" ? (
        <>
          <path d="M33.5 46 C31 56 31 63 33.5 71" stroke={INK} strokeWidth="6.5" strokeLinecap="round" fill="none" />
          <path d="M66.5 46 C69 56 69 63 66.5 71" stroke={INK} strokeWidth="6.5" strokeLinecap="round" fill="none" />
          <path d="M33.5 46 C31 56 31 63 33.5 71" stroke={spec.hairColor} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M66.5 46 C69 56 69 63 66.5 71" stroke={spec.hairColor} strokeWidth="4.5" strokeLinecap="round" fill="none" />
          <path d="M32.5 52 l2 1.4 M32 58 l2 1.4 M32.2 64 l2 1.4 M65.5 52 l2 1.4 M66 58 l2 1.4 M65.8 64 l2 1.4" stroke={INK} strokeWidth="0.8" opacity="0.5" />
          <circle cx="33.3" cy="71" r="2.4" fill={spec.extraColor} stroke={INK} strokeWidth="0.8" />
          <circle cx="66.7" cy="71" r="2.4" fill={spec.extraColor} stroke={INK} strokeWidth="0.8" />
        </>
      ) : null}
      {spec.glasses === "round" ? (
        <g fill="rgba(255,255,255,0.08)" stroke={INK} strokeWidth={stroke}>
          <circle cx="43.5" cy="44.8" r="5.6" />
          <circle cx="56.5" cy="44.8" r="5.6" />
          <path d="M49 44.8h2" fill="none" />
          <path d="M37.9 44 L33 43 M62.1 44 L67 43" fill="none" strokeWidth={stroke * 0.7} />
        </g>
      ) : null}
      {spec.glasses === "square" ? (
        <g fill="rgba(255,255,255,0.08)" stroke={INK} strokeWidth={stroke}>
          <rect x="36.5" y="40.5" width="11.5" height="8.5" rx="2.5" />
          <rect x="52" y="40.5" width="11.5" height="8.5" rx="2.5" />
          <path d="M48 44.5h4" fill="none" />
        </g>
      ) : null}
      {spec.glasses === "sunglasses" ? (
        <g fill="#14122B" stroke={INK} strokeWidth={stroke * 0.7}>
          <rect x="36" y="40" width="12" height="9" rx="3" />
          <rect x="52" y="40" width="12" height="9" rx="3" />
          <path d="M48 44h4" fill="none" />
          <path d="M38.5 42.5 L41.5 41.5 M54.5 42.5 L57.5 41.5" stroke="#FFFFFF" strokeWidth="1" opacity="0.5" />
        </g>
      ) : null}
      {spec.glasses === "visor" ? <rect x="33" y="39.5" width="34" height="8.5" rx="4" fill="#22E3FF" opacity="0.85" stroke={INK} strokeWidth={stroke * 0.5} /> : null}
      {spec.hat === "cap" ? (
        <>
          <path d="M31 40 C31 24 69 24 69 40 Z" fill={spec.hatColor} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M50 24 C61 24 69 31 69 40 L50 40 Z" fill="#000000" opacity="0.14" />
          <path d="M50 25 L50 39" stroke={INK} strokeWidth="0.8" opacity="0.3" />
          <path d="M28 40 C28 36 72 36 72 40 C72 44.5 28 44.5 28 40 Z" fill={spec.hatColor} stroke={INK} strokeWidth="1.3" />
          <path d="M28 40 C28 36 72 36 72 40 C72 44.5 28 44.5 28 40 Z" fill="#000000" opacity="0.25" />
        </>
      ) : null}
      {spec.hat === "beanie" ? (
        <>
          <path d="M31 44 C31 22 69 22 69 44 Z" fill={spec.hatColor} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M50 22 C61 22 69 31 69 44 L50 44 Z" fill="#000000" opacity="0.14" />
          <rect x="30.5" y="38" width="39" height="7.5" rx="3" fill={spec.hatColor} stroke={INK} strokeWidth="1.2" />
          <path d="M34 40 v4 M38 39.5 v4.5 M42 39.5 v4.5 M46 39.5 v4.5 M50 39.5 v4.5 M54 39.5 v4.5 M58 39.5 v4.5 M62 39.5 v4.5 M66 40 v4" stroke="#000000" strokeWidth="0.8" opacity="0.25" />
          <circle cx="50" cy="22" r="4.5" fill="#FFFFFF" opacity="0.9" stroke={INK} strokeWidth="1" />
        </>
      ) : null}
      {spec.hat === "bucket" ? (
        <>
          <path d="M35 36 C35 23 65 23 65 36 Z" fill={spec.hatColor} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M50 23 C58 23 65 29 65 36 L50 36 Z" fill="#000000" opacity="0.14" />
          <ellipse cx="50" cy="36.5" rx="25" ry="4.8" fill={spec.hatColor} stroke={INK} strokeWidth="1.3" />
          <ellipse cx="50" cy="36.5" rx="25" ry="4.8" fill="#000000" opacity="0.2" />
        </>
      ) : null}
      {spec.hat === "headband" ? <rect x="33" y="31" width="34" height="5" rx="2.5" fill={spec.hatColor} stroke={INK} strokeWidth="1" /> : null}
      {spec.hat === "headphones" ? (
        <>
          <path d="M31 46 C31 20 69 20 69 46" fill="none" stroke={INK} strokeWidth={stroke * 2.6} />
          <path d="M31 46 C31 20 69 20 69 46" fill="none" stroke="#2A2458" strokeWidth={stroke * 1.8} />
          <rect x="26" y="38.5" width="9" height="15" rx="4" fill={spec.hatColor} stroke={INK} strokeWidth="1.2" />
          <rect x="65" y="38.5" width="9" height="15" rx="4" fill={spec.hatColor} stroke={INK} strokeWidth="1.2" />
          <rect x="28" y="41" width="2" height="10" rx="1" fill="#FFFFFF" opacity="0.25" />
          <rect x="67" y="41" width="2" height="10" rx="1" fill="#FFFFFF" opacity="0.25" />
        </>
      ) : null}
      {spec.hat === "flowers" ? (
        <>
          <path d="M34 30 Q50 20 66 30" stroke="#3DDC97" strokeWidth="2" fill="none" strokeLinecap="round" />
          {[39, 50, 61].map((x, i) => (
            <g key={x} transform={`translate(${x} ${i === 1 ? 23 : 27})`}>
              {[0, 72, 144, 216, 288].map((a) => (
                <ellipse key={a} cx="0" cy="-3.3" rx="2" ry="3.2" fill={spec.hatColor} stroke={INK} strokeWidth="0.6" transform={`rotate(${a})`} />
              ))}
              <circle r="1.9" fill="#FFD23F" stroke={INK} strokeWidth="0.6" />
            </g>
          ))}
        </>
      ) : null}
      {spec.hat === "crown" ? (
        <>
          <path d="M33 36 L33 22 L41.5 30 L50 19 L58.5 30 L67 22 L67 36 Z" fill={spec.hatColor} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M50 19 L58.5 30 L67 22 L67 36 L50 36 Z" fill="#000000" opacity="0.14" />
          <circle cx="41.5" cy="33" r="1.7" fill="#22E3FF" stroke={INK} strokeWidth="0.6" />
          <circle cx="50" cy="33" r="1.7" fill="#FF3D9A" stroke={INK} strokeWidth="0.6" />
          <circle cx="58.5" cy="33" r="1.7" fill="#22E3FF" stroke={INK} strokeWidth="0.6" />
        </>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------- shared body helpers */

/** A limb segment: an ink outline under a coloured stroke, both with round caps. */
function Limb({ from, to, width, color, ink = true }: { from: [number, number]; to: [number, number]; width: number; color: string; ink?: boolean }) {
  const d = `M${from[0]} ${from[1]} L${to[0]} ${to[1]}`;
  return (
    <>
      {ink ? <path d={d} stroke={INK} strokeWidth={width + 2.2} strokeLinecap="round" fill="none" /> : null}
      <path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" fill="none" />
    </>
  );
}

function sleeveLength(spec: AvatarSpec): "long" | "short" | "none" {
  if (spec.jacket !== "none") return "long";
  if (spec.top === "tank") return "none";
  if (spec.top === "tee") return "short";
  return "long";
}

function sleeveColor(spec: AvatarSpec): string {
  return spec.jacket !== "none" ? spec.jacketColor : spec.topColor;
}

/* ---------------------------------------------------------------- bust (100 x 100, circle crop) */

const BUST = "M10 106 C10 86 22 74 38 70.5 L62 70.5 C78 74 90 86 90 106 Z";
const BUST_L = "M10 106 C10 86 22 74 38 70.5 L44.5 70.5 L41 106 Z";
const BUST_R = "M90 106 C90 86 78 74 62 70.5 L55.5 70.5 L59 106 Z";

function BustBody({ spec }: { spec: AvatarSpec }) {
  const sleeves = sleeveLength(spec);
  const armColor = sleeves === "none" ? spec.skin : sleeveColor(spec);
  const jacket = spec.jacket !== "none";
  return (
    <>
      {spec.top === "hoodie" && !jacket ? (
        <>
          <path d="M27 82 C27 62 73 62 73 82 C66 74 34 74 27 82 Z" fill={spec.topColor} stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M27 82 C27 62 73 62 73 82 C66 74 34 74 27 82 Z" fill="#000000" opacity="0.22" />
        </>
      ) : null}
      {/* upper arms, drawn first so the torso covers their inner edge */}
      <Limb from={[22, 82]} to={[13, 106]} width={13} color={armColor} />
      <Limb from={[78, 82]} to={[87, 106]} width={13} color={armColor} />
      <path d="M78 82 L87 106" stroke="#000000" strokeWidth="13" strokeLinecap="round" opacity="0.14" />
      {sleeves === "none" ? (
        <>
          <path d="M22 82 L13 106" stroke="#000000" strokeWidth="13" strokeLinecap="round" opacity="0.06" />
        </>
      ) : null}
      <path d={BUST} fill={spec.topColor} />
      <path d="M50 70.5 L62 70.5 C78 74 90 86 90 106 L50 106 Z" fill={SHADE} />
      <path d="M38 70.5 L50 70.5 L50 106 L10 106 C10 88 20 76 38 70.5 Z" fill={LIGHT} />
      <path d="M30 96 q5 3 10 0 M60 92 q5 3 10 0" stroke={INK} strokeWidth="0.9" strokeLinecap="round" opacity="0.18" fill="none" />
      {spec.top === "tank" ? (
        <>
          <path d="M10 106 C10 86 22 74 38 70.5 L30 70.5 C18 76 12 88 12 106 Z" fill={spec.skin} />
          <path d="M90 106 C90 86 78 74 62 70.5 L70 70.5 C82 76 88 88 88 106 Z" fill={spec.skin} />
          <path d="M30 70.5 L38 70.5 M62 70.5 L70 70.5" stroke={INK} strokeWidth="1.2" />
          <path d="M30 70.5 C18 76 12 88 12 106 M70 70.5 C82 76 88 88 88 106" stroke={INK} strokeWidth="1.3" fill="none" />
        </>
      ) : null}
      {spec.top === "tee" ? <path d="M39 70.5 Q50 80 61 70.5" stroke={INK} strokeWidth="1.2" fill="none" opacity="0.6" /> : null}
      {spec.top === "shirt" ? (
        <>
          <path d="M50 70.5 L50 106" stroke="#000000" strokeWidth="1" opacity="0.2" />
          <path d="M40 70.5 L50 84 L47 70.5 Z" fill={spec.topColor} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M60 70.5 L50 84 L53 70.5 Z" fill={spec.topColor} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M60 70.5 L50 84 L53 70.5 Z" fill="#000000" opacity="0.14" />
          <circle cx="50" cy="90" r="1.2" fill="#FFFFFF" opacity="0.8" />
          <circle cx="50" cy="99" r="1.2" fill="#FFFFFF" opacity="0.8" />
        </>
      ) : null}
      {spec.top === "sweater" ? (
        <>
          <path d="M40 71 Q50 79 60 71" stroke={INK} strokeWidth="1.1" fill="none" opacity="0.5" />
          <path d="M42 72 Q50 78.5 58 72" stroke="#000000" strokeWidth="2.5" fill="none" opacity="0.14" />
          <path d="M26 92 L50 100 L74 92" stroke="#000000" strokeWidth="1.2" opacity="0.14" fill="none" />
        </>
      ) : null}
      {spec.top === "hoodie" ? (
        <>
          <path d="M44 73 L43 90 M56 73 L57 90" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.75" />
          <circle cx="43" cy="90.5" r="1.1" fill="#FFFFFF" opacity="0.75" />
          <circle cx="57" cy="90.5" r="1.1" fill="#FFFFFF" opacity="0.75" />
        </>
      ) : null}
      {jacket ? (
        <>
          <path d={BUST_L} fill={spec.jacketColor} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          <path d={BUST_R} fill={spec.jacketColor} stroke={INK} strokeWidth="1.3" strokeLinejoin="round" />
          <path d={BUST_R} fill={SHADE} />
          <path d={BUST_L} fill={LIGHT} />
          {spec.jacket === "blazer" ? (
            <>
              <path d="M44.5 70.5 L41 90 L34 76 Z" fill="#000000" opacity="0.22" />
              <path d="M55.5 70.5 L59 90 L66 76 Z" fill="#000000" opacity="0.22" />
              <path d="M44.5 70.5 L41 90 L34 76 Z M55.5 70.5 L59 90 L66 76 Z" fill="none" stroke={INK} strokeWidth="0.9" strokeLinejoin="round" opacity="0.6" />
            </>
          ) : null}
          {spec.jacket === "denim" ? (
            <>
              <path d="M36 70.5 L44.5 70.5 L43 80 Z M64 70.5 L55.5 70.5 L57 80 Z" fill="#000000" opacity="0.22" stroke={INK} strokeWidth="0.8" />
              <rect x="22" y="86" width="12" height="10" rx="1.5" fill="none" stroke={INK} strokeWidth="0.9" opacity="0.6" />
              <rect x="66" y="86" width="12" height="10" rx="1.5" fill="none" stroke={INK} strokeWidth="0.9" opacity="0.6" />
              <circle cx="28" cy="86" r="1.1" fill="#FFD23F" opacity="0.8" />
              <circle cx="72" cy="86" r="1.1" fill="#FFD23F" opacity="0.8" />
            </>
          ) : null}
          {spec.jacket === "puffer" ? <path d="M12 84 L43 84 M57 84 L88 84 M10.5 94 L42 94 M58 94 L89.5 94" stroke={INK} strokeWidth="1.1" opacity="0.35" /> : null}
          {spec.jacket === "cardigan" ? (
            <>
              <circle cx="57.5" cy="86" r="1.4" fill="#FFFFFF" opacity="0.85" stroke={INK} strokeWidth="0.5" />
              <circle cx="58" cy="96" r="1.4" fill="#FFFFFF" opacity="0.85" stroke={INK} strokeWidth="0.5" />
              <path d="M14 92 Q22 90 30 92 M70 92 Q78 90 86 92" stroke="#000000" strokeWidth="1" opacity="0.14" fill="none" />
            </>
          ) : null}
        </>
      ) : (
        <path d={BUST} fill="none" stroke={INK} strokeWidth="1.4" strokeLinejoin="round" />
      )}
      {/* neck */}
      <path d="M43.2 56 L56.8 56 L57.8 73.5 L42.2 73.5 Z" fill={spec.skin} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M43.2 56 L56.8 56 L57.2 64 L42.8 64 Z" fill="#000000" opacity="0.2" />
      {spec.top === "turtleneck" ? (
        <>
          <rect x="39.5" y="61" width="21" height="13.5" rx="6" fill={spec.topColor} stroke={INK} strokeWidth="1.2" />
          <path d="M43 63 v9 M47 62.5 v10 M51 62.5 v10 M55 62.5 v10" stroke="#000000" strokeWidth="0.8" opacity="0.2" />
        </>
      ) : null}
      {spec.extra === "scarf" ? (
        <>
          <path d="M34 72 C40 80 60 80 66 72 L69 80 C60 88 40 88 31 80 Z" fill={spec.extraColor} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M56 84 L60 106 L69 106 L64 82 Z" fill={spec.extraColor} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M56 84 L60 106 L69 106 L64 82 Z" fill="#000000" opacity="0.14" />
        </>
      ) : null}
      {spec.extra === "necklace" ? (
        <>
          <path d="M40 74 C44 83 56 83 60 74" fill="none" stroke={spec.extraColor} strokeWidth="1.8" />
          <circle cx="50" cy="82.5" r="2.6" fill={spec.extraColor} stroke={INK} strokeWidth="0.7" />
        </>
      ) : null}
      {spec.extra === "badge" ? (
        <>
          <rect x="61" y="84" width="11" height="8" rx="1.5" fill={spec.extraColor} stroke={INK} strokeWidth="0.8" />
          <circle cx="64" cy="88" r="1.4" fill="#FFFFFF" />
          <rect x="66.5" y="86.5" width="3.5" height="1" fill="#FFFFFF" opacity="0.8" />
          <rect x="66.5" y="88.5" width="3.5" height="1" fill="#FFFFFF" opacity="0.5" />
        </>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------- figure (60 x 110) */

const TORSO = "M16.5 47.5 C18.5 43.5 24 41.5 30 41.5 C36 41.5 41.5 43.5 43.5 47.5 L45 59 C45.3 66 44.4 72.5 43.6 79.5 L16.4 79.5 C15.6 72.5 14.7 66 15 59 Z";
const TORSO_L = "M16.5 47.5 C18.5 43.5 23 42 26.8 41.6 L25.2 79.5 L16.4 79.5 C15.6 72.5 14.7 66 15 59 Z";
const TORSO_R = "M43.5 47.5 C41.5 43.5 37 42 33.2 41.6 L34.8 79.5 L43.6 79.5 C44.4 72.5 45.3 66 45 59 Z";

function Shoe({ x, spec }: { x: number; spec: AvatarSpec }) {
  const c = spec.shoesColor;
  if (spec.shoes === "boots")
    return (
      <>
        <path d={`M${x - 4.2} 93 L${x + 4.2} 93 L${x + 4.6} 100 Q${x + 6.2} 101 ${x + 6} 103.8 L${x - 4.4} 103.8 Z`} fill={c} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
        <path d={`M${x - 2.4} 95 L${x + 2.4} 95 M${x - 2.4} 97.4 L${x + 2.4} 97.4 M${x - 2.4} 99.8 L${x + 2.4} 99.8`} stroke="#FFFFFF" strokeWidth="0.8" opacity="0.45" />
        <rect x={x - 4.4} y={102} width={10.4} height={1.8} rx="0.6" fill="#000000" opacity="0.35" />
      </>
    );
  if (spec.shoes === "loafers")
    return (
      <>
        <path d={`M${x - 4} 99.5 L${x + 3.5} 99.5 Q${x + 6} 100.5 ${x + 5.5} 103.8 L${x - 4.2} 103.8 Z`} fill={c} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
        <path d={`M${x - 1.5} 100 Q${x + 1} 101.5 ${x + 3} 100`} stroke="#000000" strokeWidth="0.9" opacity="0.35" fill="none" />
      </>
    );
  if (spec.shoes === "sandals")
    return (
      <>
        <path d={`M${x - 4} 101.6 L${x + 5.6} 101.6 L${x + 5.6} 103.8 L${x - 4.2} 103.8 Z`} fill={c} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
        <path d={`M${x - 3} 99.4 L${x + 1} 101.6 M${x + 4.5} 99.4 L${x + 1.5} 101.6`} stroke={c} strokeWidth="1.4" strokeLinecap="round" />
        <path d={`M${x - 3} 99.4 L${x + 1} 101.6 M${x + 4.5} 99.4 L${x + 1.5} 101.6`} stroke={INK} strokeWidth="0.5" opacity="0.5" />
      </>
    );
  return (
    <>
      <path d={`M${x - 4.3} 98.2 L${x + 3.6} 98.2 Q${x + 6.4} 99.6 ${x + 6} 103.8 L${x - 4.5} 103.8 Z`} fill={c} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
      <path d={`M${x - 4.3} 101.6 L${x + 6.2} 101.6 L${x + 6} 103.8 L${x - 4.5} 103.8 Z`} fill="#FFFFFF" opacity="0.85" />
      <path d={`M${x - 1.5} 99.2 L${x + 1.5} 99.2 M${x - 1.2} 100.4 L${x + 1.8} 100.4`} stroke="#FFFFFF" strokeWidth="0.7" opacity="0.7" />
    </>
  );
}

function FigureBody({ spec }: { spec: AvatarSpec }) {
  const legs = spec.bottom;
  const sleeves = sleeveLength(spec);
  const sc = sleeveColor(spec);
  const jacket = spec.jacket !== "none";
  const upperArm = sleeves === "none" ? spec.skin : sc;
  const foreArm = sleeves === "long" ? sc : spec.skin;
  const thighColor = legs === "skirt" ? spec.skin : spec.bottomColor;
  const shinColor = legs === "jeans" || legs === "chinos" || legs === "joggers" ? spec.bottomColor : spec.skin;
  return (
    <>
      {/* legs */}
      <Limb from={[25, 78]} to={[24.6, 92]} width={8.6} color={thighColor} />
      <Limb from={[35, 78]} to={[35.4, 92]} width={8.6} color={thighColor} />
      <Limb from={[24.6, 92]} to={[24.6, 101]} width={7.2} color={shinColor} />
      <Limb from={[35.4, 92]} to={[35.4, 101]} width={7.2} color={shinColor} />
      <path d="M35 78 L35.4 92 L35.4 101" stroke="#000000" strokeWidth="7" strokeLinecap="round" fill="none" opacity="0.12" />
      {legs === "shorts" ? (
        <>
          <path d="M20 78 L30 78 L29.2 88.5 L20.6 88.5 Z M30 78 L40 78 L39.4 88.5 L30.8 88.5 Z" fill={spec.bottomColor} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M30 78 L40 78 L39.4 88.5 L30.8 88.5 Z" fill={SHADE} />
          <path d="M20.6 87 L29.2 87 M30.8 87 L39.4 87" stroke="#000000" strokeWidth="1.2" opacity="0.2" />
        </>
      ) : null}
      {legs === "skirt" ? (
        <>
          <path d="M17.5 78 L42.5 78 L45.5 93 L14.5 93 Z" fill={spec.bottomColor} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M30 78 L42.5 78 L45.5 93 L30 93 Z" fill={SHADE} />
          <path d="M22 79 L20 93 M30 79 L30 93 M38 79 L40 93" stroke="#000000" strokeWidth="0.9" opacity="0.18" />
        </>
      ) : null}
      {legs === "jeans" ? <path d="M23 80 L22.6 100 M33 80 L33.4 100" stroke="#000000" strokeWidth="0.9" opacity="0.28" /> : null}
      {legs === "chinos" ? <path d="M21 90.5 L28.4 90.5 M31.6 90.5 L39 90.5" stroke="#000000" strokeWidth="0.8" opacity="0.22" /> : null}
      {legs === "joggers" ? (
        <>
          <path d="M20.9 98 L28.3 98 L28 101 L21.2 101 Z M31.7 98 L39.1 98 L38.8 101 L32 101 Z" fill="#000000" opacity="0.28" />
          <path d="M22 82 L21.6 96 M38 82 L38.4 96" stroke="#FFFFFF" strokeWidth="0.9" opacity="0.35" />
        </>
      ) : null}
      <Shoe x={24.6} spec={spec} />
      <Shoe x={35.4} spec={spec} />

      {/* hood behind the neck */}
      {spec.top === "hoodie" && !jacket ? (
        <>
          <path d="M17 45 C17 33 43 33 43 45 C38 39.5 22 39.5 17 45 Z" fill={spec.topColor} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M17 45 C17 33 43 33 43 45 C38 39.5 22 39.5 17 45 Z" fill="#000000" opacity="0.22" />
        </>
      ) : null}

      {/* arms */}
      <Limb from={[18, 48]} to={[13, 63.5]} width={7} color={upperArm} />
      <Limb from={[42, 48]} to={[47, 63.5]} width={7} color={upperArm} />
      <Limb from={[13, 63.5]} to={[13.6, 79]} width={6} color={foreArm} />
      <Limb from={[47, 63.5]} to={[46.4, 79]} width={6} color={foreArm} />
      <path d="M42 48 L47 63.5 L46.4 79" stroke="#000000" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.12" />
      {sleeves === "short" ? <path d="M9.6 63 L15.8 63.4 M44.2 63.4 L50.4 63" stroke={INK} strokeWidth="1" opacity="0.6" /> : null}
      <circle cx="13.6" cy="82" r="3.6" fill={spec.skin} stroke={INK} strokeWidth="1.1" />
      <circle cx="46.4" cy="82" r="3.6" fill={spec.skin} stroke={INK} strokeWidth="1.1" />
      <path d="M12.2 84.4 L12.4 86.2 M14 84.8 L14 86.6 M45 84.8 L45 86.6 M46.6 84.4 L46.4 86.2" stroke={INK} strokeWidth="0.7" opacity="0.4" strokeLinecap="round" />

      {/* torso */}
      <path d={TORSO} fill={spec.topColor} />
      <path d="M30 41.5 C36 41.5 41.5 43.5 43.5 47.5 L45 59 C45.3 66 44.4 72.5 43.6 79.5 L30 79.5 Z" fill={SHADE} />
      <path d="M30 41.5 C24 41.5 18.5 43.5 16.5 47.5 L15 59 C14.7 66 15.6 72.5 16.4 79.5 L22 79.5 L22 60 Z" fill={LIGHT} />
      <path d="M19 70 q3 2 6 0 M36 74 q3 2 6 0" stroke={INK} strokeWidth="0.7" strokeLinecap="round" opacity="0.2" fill="none" />
      {spec.top === "tank" ? (
        <>
          <path d="M16.5 47.5 C18.5 43.5 23 41.6 25.2 41.5 L22.8 51.5 L16 51.5 Z" fill={spec.skin} />
          <path d="M43.5 47.5 C41.5 43.5 37 41.6 34.8 41.5 L37.2 51.5 L44 51.5 Z" fill={spec.skin} />
          <path d="M27.6 41.5 Q30 50.5 32.4 41.5 Z" fill={spec.skin} />
          <path d="M25.2 41.5 L22.8 51.5 L16 51.5 M34.8 41.5 L37.2 51.5 L44 51.5 M27.6 41.5 Q30 50.5 32.4 41.5" fill="none" stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
        </>
      ) : null}
      {spec.top === "tee" ? <path d="M25.5 42 Q30 46.5 34.5 42" stroke={INK} strokeWidth="1" fill="none" opacity="0.6" /> : null}
      {spec.top === "shirt" ? (
        <>
          <path d="M30 42 L30 79.5" stroke="#000000" strokeWidth="0.8" opacity="0.2" />
          <path d="M24.5 41.8 L30 49.5 L28.2 41.7 Z" fill={spec.topColor} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M35.5 41.8 L30 49.5 L31.8 41.7 Z" fill={spec.topColor} stroke={INK} strokeWidth="0.9" strokeLinejoin="round" />
          <path d="M35.5 41.8 L30 49.5 L31.8 41.7 Z" fill="#000000" opacity="0.14" />
          <circle cx="30" cy="54" r="0.9" fill="#FFFFFF" opacity="0.85" />
          <circle cx="30" cy="61" r="0.9" fill="#FFFFFF" opacity="0.85" />
          <circle cx="30" cy="68" r="0.9" fill="#FFFFFF" opacity="0.85" />
          <circle cx="30" cy="75" r="0.9" fill="#FFFFFF" opacity="0.85" />
        </>
      ) : null}
      {spec.top === "hoodie" ? (
        <>
          <path d="M21.5 66 L38.5 66 L37.5 76 L22.5 76 Z" fill="#000000" opacity="0.16" stroke={INK} strokeWidth="0.8" strokeLinejoin="round" />
          <path d="M27.2 45 L26.6 58 M32.8 45 L33.4 58" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" opacity="0.8" />
          <circle cx="26.6" cy="58.5" r="0.8" fill="#FFFFFF" opacity="0.8" />
          <circle cx="33.4" cy="58.5" r="0.8" fill="#FFFFFF" opacity="0.8" />
        </>
      ) : null}
      {spec.top === "sweater" ? (
        <>
          <path d="M14 61 L30 68 L46 61 M14 66 L30 73 L46 66" stroke="#000000" strokeWidth="1" opacity="0.16" fill="none" />
          <rect x="14.6" y="75.5" width="30.8" height="4" fill="#000000" opacity="0.16" />
          <path d="M17 76 v3 M20 76 v3 M23 76 v3 M26 76 v3 M29 76 v3 M32 76 v3 M35 76 v3 M38 76 v3 M41 76 v3" stroke="#000000" strokeWidth="0.6" opacity="0.2" />
        </>
      ) : null}
      {jacket ? (
        <>
          <path d={TORSO_L} fill={spec.jacketColor} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
          <path d={TORSO_R} fill={spec.jacketColor} stroke={INK} strokeWidth="1.1" strokeLinejoin="round" />
          <path d={TORSO_R} fill={SHADE} />
          <path d={TORSO_L} fill={LIGHT} />
          {spec.jacket === "blazer" ? (
            <>
              <path d="M26.8 41.6 L25 55 L20.5 46 Z M33.2 41.6 L35 55 L39.5 46 Z" fill="#000000" opacity="0.22" stroke={INK} strokeWidth="0.7" strokeLinejoin="round" />
              <rect x="16.5" y="66" width="6" height="1.4" fill="#000000" opacity="0.25" />
              <rect x="37.5" y="66" width="6" height="1.4" fill="#000000" opacity="0.25" />
            </>
          ) : null}
          {spec.jacket === "denim" ? (
            <>
              <path d="M22 41.8 L26.8 41.6 L26 46 Z M38 41.8 L33.2 41.6 L34 46 Z" fill="#000000" opacity="0.22" stroke={INK} strokeWidth="0.6" />
              <rect x="17" y="51" width="5.5" height="5" rx="0.8" fill="none" stroke={INK} strokeWidth="0.7" opacity="0.6" />
              <rect x="37.5" y="51" width="5.5" height="5" rx="0.8" fill="none" stroke={INK} strokeWidth="0.7" opacity="0.6" />
              <circle cx="19.8" cy="51" r="0.8" fill="#FFD23F" opacity="0.8" />
              <circle cx="40.2" cy="51" r="0.8" fill="#FFD23F" opacity="0.8" />
            </>
          ) : null}
          {spec.jacket === "puffer" ? <path d="M14 52 L25.6 52 M34.4 52 L46 52 M13.6 60 L25.3 60 M34.7 60 L46.4 60 M13.8 68 L25 68 M35 68 L46.2 68 M14.6 76 L24.8 76 M35.2 76 L45.4 76" stroke={INK} strokeWidth="0.9" opacity="0.35" /> : null}
          {spec.jacket === "cardigan" ? (
            <>
              <circle cx="35.4" cy="52" r="1" fill="#FFFFFF" opacity="0.85" stroke={INK} strokeWidth="0.4" />
              <circle cx="35.6" cy="60" r="1" fill="#FFFFFF" opacity="0.85" stroke={INK} strokeWidth="0.4" />
              <circle cx="35.8" cy="68" r="1" fill="#FFFFFF" opacity="0.85" stroke={INK} strokeWidth="0.4" />
              <path d="M15 72 Q20 70 24.5 72 M35.5 72 Q40 70 45 72" stroke="#000000" strokeWidth="0.8" opacity="0.16" fill="none" />
            </>
          ) : null}
        </>
      ) : (
        <path d={TORSO} fill="none" stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
      )}
      {spec.extra === "badge" ? (
        <>
          <rect x="36.5" y="51" width="6.5" height="4.6" rx="0.9" fill={spec.extraColor} stroke={INK} strokeWidth="0.6" />
          <circle cx="38.3" cy="53.3" r="0.9" fill="#FFFFFF" />
          <rect x="39.8" y="52.4" width="2.2" height="0.7" fill="#FFFFFF" opacity="0.8" />
        </>
      ) : null}

      {/* neck */}
      <path d="M26.8 35 L33.2 35 L33.9 44.5 L26.1 44.5 Z" fill={spec.skin} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
      <path d="M26.8 35 L33.2 35 L33.5 39.5 L26.5 39.5 Z" fill="#000000" opacity="0.2" />
      {spec.top === "turtleneck" ? (
        <>
          <rect x="24.2" y="35.5" width="11.6" height="9.5" rx="4" fill={spec.topColor} stroke={INK} strokeWidth="1" />
          <path d="M26.5 37 v6.5 M28.8 36.5 v7.5 M31.2 36.5 v7.5 M33.5 37 v6.5" stroke="#000000" strokeWidth="0.6" opacity="0.2" />
        </>
      ) : null}
      {spec.extra === "scarf" ? (
        <>
          <path d="M19 41 C23 47 37 47 41 41 L42 48 C35 52.5 25 52.5 18 48 Z" fill={spec.extraColor} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <path d="M34 50 L36 66 L41 66 L38 49 Z" fill={spec.extraColor} stroke={INK} strokeWidth="1" strokeLinejoin="round" />
          <path d="M34 50 L36 66 L41 66 L38 49 Z" fill="#000000" opacity="0.14" />
        </>
      ) : null}
      {spec.extra === "necklace" ? (
        <>
          <path d="M25 42.5 C27 47.5 33 47.5 35 42.5" fill="none" stroke={spec.extraColor} strokeWidth="1.3" />
          <circle cx="30" cy="47" r="1.6" fill={spec.extraColor} stroke={INK} strokeWidth="0.5" />
        </>
      ) : null}
    </>
  );
}

/* ---------------------------------------------------------------- component */

export function Avatar({ spec: rawSpec, size = 120, mode = "bust", presence = "online", you = false, speaking = false, pulse = false, label, accent, dot: dotOn = true, style, className }: AvatarProps) {
  const spec = normalizeAvatar(rawSpec);
  const offline = presence === "offline";
  const pc = you && presence === "online" ? "#FF3D9A" : PRESENCE_COLOR[presence];
  const ringColor = you ? "#FF3D9A" : PRESENCE_COLOR[presence];
  const ringW = size >= 60 ? 3 : 2;
  let ringShadow = "none";
  if (presence !== "none") {
    const glow = you ? "rgba(255,61,154,0.55)" : presence === "online" ? "rgba(182,255,59,0.35)" : "rgba(34,227,255,0.35)";
    ringShadow = `0 0 0 ${ringW}px ${ringColor}, 0 0 ${Math.round(size * 0.35)}px ${glow}`;
    if (offline) ringShadow = "0 0 0 1.5px rgba(110,106,143,0.9)";
  }
  if (accent) ringShadow = `0 0 0 ${ringW}px ${accent}, 0 4px 10px rgba(8,6,30,0.45)`;
  const w = mode === "bust" ? size : Math.round((size * 60) / 110);
  const dot = Math.max(8, Math.round(size * 0.26));
  const dotOff = Math.round(-size * 0.02);
  const showDot = dotOn && mode === "bust" && presence !== "none" && size >= 22;
  const op = offline ? 0.45 : 1;
  const filt = offline ? "grayscale(0.9)" : "none";

  const labelNode: ReactNode = label ? (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: mode === "bust" ? "calc(100% + 8px)" : "calc(100% + 4px)",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 9px 3px 7px",
        borderRadius: 999,
        background: "rgba(20,18,44,0.9)",
        border: `1px solid ${you ? "rgba(255,61,154,0.6)" : "rgba(190,180,255,0.2)"}`,
        whiteSpace: "nowrap",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: "16px",
        opacity: offline ? 0.7 : 1,
        boxShadow: "0 6px 18px rgba(0,0,0,0.4)",
        pointerEvents: "none",
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: pc, boxShadow: `0 0 8px ${pc}` }} />
      <span>{label}</span>
    </div>
  ) : null;

  return (
    <div className={className} style={{ position: "relative", width: w, height: size, color: "#F4F2FF", ...style }}>
      {labelNode}
      {mode === "bust" ? (
        <>
          {pulse ? (
            <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <circle cx="50" cy="50" r="52" fill="none" stroke={ringColor} strokeWidth="3">
                <animate attributeName="r" values="52;78" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
          ) : null}
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", boxShadow: ringShadow, opacity: op, filter: filt }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden" }}>
              <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: "block" }}>
                <defs>
                  <radialGradient id="av-bg" cx="0.5" cy="0.35" r="0.75">
                    <stop offset="0" stopColor="#2A2456" />
                    <stop offset="1" stopColor="#15122E" />
                  </radialGradient>
                </defs>
                <rect width="100" height="100" fill="url(#av-bg)" />
                <rect width="100" height="100" fill={spec.topColor} opacity="0.22" />
                <circle cx="50" cy="52" r="34" fill="#FFFFFF" opacity="0.05" />
                <BustBody spec={spec} />
                <Head spec={spec} stroke={2.2} />
              </svg>
            </div>
            {speaking ? (
              <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                <circle cx="50" cy="50" r="54" fill="none" stroke="#B6FF3B" strokeWidth="3.5">
                  <animate attributeName="r" values="53;62;53" dur="1.1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="1;0.25;1" dur="1.1s" repeatCount="indefinite" />
                </circle>
              </svg>
            ) : null}
          </div>
          {showDot ? (
            <div
              style={{
                position: "absolute",
                right: dotOff,
                bottom: dotOff,
                width: dot,
                height: dot,
                borderRadius: "50%",
                background: offline ? "#0B0B1A" : pc,
                border: offline ? "2px solid #6E6A8F" : "2px solid #0B0B1A",
                boxShadow: offline ? "none" : `0 0 8px ${pc}`,
              }}
            />
          ) : null}
        </>
      ) : (
        <svg viewBox="0 0 60 110" width={w} height={size} style={{ display: "block", overflow: "visible", opacity: op, filter: filt }}>
          <ellipse cx="30" cy="104" rx="13" ry="3" fill="#000000" opacity="0.35" />
          <g>
            <FigureBody spec={spec} />
            <g transform="translate(-3.8 -3.76) scale(0.676)">
              <Head spec={spec} stroke={2.4} />
            </g>
          </g>
          {speaking ? (
            <ellipse cx="30" cy="104" rx="24" ry="8" fill="none" stroke="#B6FF3B" strokeWidth="1.8">
              <animate attributeName="rx" values="22;30;22" dur="1.1s" repeatCount="indefinite" />
              <animate attributeName="ry" values="7;10;7" dur="1.1s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="1;0.2;1" dur="1.1s" repeatCount="indefinite" />
            </ellipse>
          ) : null}
        </svg>
      )}
    </div>
  );
}

export function presenceOf(p: { presence: "online" | "traveling" | "offline" } | null | undefined): AvatarPresence {
  return p ? p.presence : "none";
}
