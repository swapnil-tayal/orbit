import type { ReactNode } from "react";
import { HOME_GEOMETRY, type SpaceLayout } from "@orbit/shared";
import { DeskStation, type DeskVisual, type ZoneVisual } from "./OfficeFloor.tsx";

export interface HomeFloorProps {
  layout: SpaceLayout;
  desks: DeskVisual[];
  zones: ZoneVisual[];
  showSpawnPulse?: boolean;
  onFloorClick?: (x: number, y: number) => void;
  children?: ReactNode;
}

const h = HOME_GEOMETRY;
const F = h.floor;
const WALL = "#E9A36B";
const LABEL = { fontFamily: "var(--font-mono)", fontSize: 10.5, fontWeight: 700, letterSpacing: 1.6, fill: "#A89BC4", opacity: 0.85, textAnchor: "middle" as const };

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="18" fill="#1E7A4F" />
      <circle cx="-6" cy="-5" r="9" fill="#3DDC97" />
      <circle cx="7" cy="3" r="7" fill="#B6FF3B" opacity="0.8" />
    </g>
  );
}

function Window({ x, w }: { x: number; w: number }) {
  return (
    <g>
      <path d={`M${x} ${F.y + 4} L${x + w} ${F.y + 4} L${x + w + 22} ${F.y + 80} L${x - 22} ${F.y + 80} Z`} fill="url(#hm-win)" />
      <rect x={x} y={F.y - 4} width={w} height="8" rx="3" fill="#FFE2B8" opacity="0.7" />
      <rect x={x + w / 2 - 2} y={F.y - 4} width="4" height="8" fill="#231A36" />
    </g>
  );
}

export function HomeFloor({ layout, desks, zones, showSpawnPulse = true, onFloorClick, children }: HomeFloorProps) {
  const sofa = zones.find((z) => z.kind === "lounge");
  const wall = `M${F.x} ${h.door.y1} V${F.y + F.r} A${F.r} ${F.r} 0 0 1 ${F.x + F.r} ${F.y} H${F.x + F.w - F.r} A${F.r} ${F.r} 0 0 1 ${F.x + F.w} ${F.y + F.r} V${F.y + F.h - F.r} A${F.r} ${F.r} 0 0 1 ${F.x + F.w - F.r} ${F.y + F.h} H${F.x + F.r} A${F.r} ${F.r} 0 0 1 ${F.x} ${F.y + F.h - F.r} V${h.door.y2}`;
  return (
    <div style={{ position: "relative", width: 1440, height: layout.height }}>
      <svg
        width={1440}
        height={layout.height}
        viewBox={`0 0 1440 ${layout.height}`}
        role="img"
        aria-label="Top-down home floor plan"
        style={{ position: "absolute", left: 0, top: 0, display: "block" }}
        onClick={
          onFloorClick
            ? (e) => {
                const svg = e.currentTarget;
                const pt = svg.createSVGPoint();
                pt.x = e.clientX;
                pt.y = e.clientY;
                const p = pt.matrixTransform(svg.getScreenCTM()!.inverse());
                onFloorClick(p.x, p.y);
              }
            : undefined
        }
      >
        <defs>
          <pattern id="hm-planks" width="120" height="28" patternUnits="userSpaceOnUse">
            <rect width="120" height="28" fill="#241B36" />
            <path d="M0 27.5 H120" stroke="#2F2545" strokeWidth="1" />
            <path d="M70 0 V28" stroke="#2F2545" strokeWidth="1" />
          </pattern>
          <linearGradient id="hm-win" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFD9A0" stopOpacity="0.12" />
            <stop offset="1" stopColor="#FFD9A0" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="of-warm">
            <stop offset="0" stopColor="#FFD23F" stopOpacity="0.32" />
            <stop offset="1" stopColor="#FFD23F" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hm-lamp">
            <stop offset="0" stopColor="#FFC98A" stopOpacity="0.35" />
            <stop offset="1" stopColor="#FFC98A" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect x={F.x} y={F.y} width={F.w} height={F.h} rx={F.r} fill="url(#hm-planks)" />
        <path d={wall} fill="none" stroke={WALL} strokeOpacity="0.16" strokeWidth="12" strokeLinecap="round" />
        <path d={wall} fill="none" stroke={WALL} strokeWidth="2.5" strokeLinecap="round" />
        <g aria-hidden>
          <Window x={630} w={100} />
          <Window x={975} w={70} />

          <rect x="440" y="184" width="160" height="16" rx="4" fill="#3A2C52" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
            <rect key={i} x={446 + i * 15} y={186 + (i % 3)} width={i % 4 === 0 ? 12 : 10} height={12 - (i % 3)} rx="1.5" fill={["#E9A36B", "#8FB8FF", "#FF8FB8", "#B6E388", "#C9B6FF"][i % 5]} opacity="0.8" />
          ))}
          <text x={h.desk.x} y="222" {...LABEL}>STUDY</text>

          <rect x="790" y="192" width="160" height="14" rx="4" fill="#3A2C52" />
          <rect x="805" y="180" width="130" height="9" rx="2" fill="#0E0C22" stroke="#8FB8FF" strokeOpacity="0.5" />
          <ellipse cx="870" cy="330" rx="160" ry="100" fill="#3B2A55" opacity="0.55" />
          <ellipse cx="870" cy="330" rx="140" ry="84" fill="none" stroke="#E9A36B" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="3 7" />
          <text x="870" y="226" {...LABEL}>LIVING</text>
          {sofa ? (
            <circle cx={h.sofaZone.x} cy={h.sofaZone.y} r={h.sofaZone.r} fill={sofa.active ? "rgba(233,163,107,0.12)" : "rgba(233,163,107,0.04)"} stroke={WALL} strokeOpacity={sofa.active ? 0.9 : 0.45} strokeWidth="1.5" strokeDasharray="4 6" />
          ) : null}
          <rect x="825" y="305" width="90" height="40" rx="10" fill="#5A3E2E" />
          <rect x="833" y="312" width="30" height="6" rx="3" fill="#E9A36B" opacity="0.6" />
          <circle cx="896" cy="326" r="6" fill="#F4F2FF" opacity="0.85" />
          <circle cx="896" cy="326" r="3.6" fill="#7A4E26" />
          <circle cx="748" cy="322" r="20" fill="#6B4FA0" />
          <circle cx="748" cy="322" r="12" fill="#7E62B8" />
          <rect x="770" y="400" width="200" height="46" rx="16" fill="#7E62B8" />
          <rect x="770" y="428" width="200" height="18" rx="9" fill="#6B4FA0" />
          <rect x="784" y="404" width="54" height="22" rx="8" fill="#9277CC" />
          <rect x="843" y="404" width="54" height="22" rx="8" fill="#9277CC" />
          <rect x="902" y="404" width="54" height="22" rx="8" fill="#9277CC" />
          <circle cx="1000" cy="420" r="30" fill="url(#hm-lamp)" />
          <circle cx="1000" cy="420" r="7" fill="#FFC98A" />
          <Plant x={362} y={202} />
          <Plant x={1078} y={202} />

          <text x="490" y="662" {...LABEL}>KITCHEN</text>
          <rect x="350" y="664" width="42" height="52" rx="6" fill="#D9D4EA" opacity="0.9" />
          <rect x="350" y="686" width="42" height="2" fill="#8A84BA" />
          <rect x="385" y="670" width="3" height="10" rx="1.5" fill="#8A84BA" />
          <rect x="400" y="690" width="220" height="26" rx="6" fill="#3A2C52" />
          <rect x="414" y="695" width="34" height="16" rx="4" fill="#8FB8FF" opacity="0.35" />
          {[480, 500].map((cx) => (
            <circle key={cx} cx={cx} cy="703" r="6" fill="none" stroke="#E9A36B" strokeOpacity="0.7" strokeWidth="2" />
          ))}
          <circle cx="585" cy="703" r="7" fill="#B6E388" opacity="0.8" />
          <circle cx="600" cy="701" r="4" fill="#FF8FB8" opacity="0.8" />
          <circle cx="464" cy="600" r="12" fill="#5A3E2E" />
          <circle cx="556" cy="600" r="12" fill="#5A3E2E" />
          <circle cx="510" cy="600" r="30" fill="#7A5640" />
          <circle cx="510" cy="600" r="8" fill="#FFD9A0" opacity="0.7" />

          <text x="1015" y="562" {...LABEL}>BEDROOM</text>
          <rect x="900" y="576" width="30" height="24" rx="5" fill="#5A3E2E" />
          <circle cx="915" cy="588" r="16" fill="url(#hm-lamp)" />
          <circle cx="915" cy="588" r="4.5" fill="#FFC98A" />
          <rect x="940" y="574" width="150" height="142" rx="12" fill="#3A2C52" />
          <rect x="940" y="574" width="150" height="14" rx="6" fill="#5A3E2E" />
          <rect x="952" y="594" width="58" height="24" rx="8" fill="#F1ECFF" opacity="0.9" />
          <rect x="1020" y="594" width="58" height="24" rx="8" fill="#F1ECFF" opacity="0.9" />
          <rect x="944" y="628" width="142" height="84" rx="10" fill="#E9A36B" opacity="0.85" />
          <path d="M944 648 H1086" stroke="#FFFFFF" strokeOpacity="0.25" strokeWidth="3" />
        </g>
        {desks.map((v) => (
          <DeskStation key={v.desk.id} v={v} />
        ))}
      </svg>
      {children}
    </div>
  );
}
