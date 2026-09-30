import type { ReactNode } from "react";
import { ISLAND_GEOMETRY, type SpaceLayout } from "@orbit/shared";

export interface CircleVisual {
  key: string;
  active: boolean;
  members: number;
}

export interface IslandFloorProps {
  layout: SpaceLayout;
  circles: CircleVisual[];
  onFloorClick?: (x: number, y: number) => void;
  children?: ReactNode;
}

const SHORE = "M420 430 C430 300 600 200 800 210 C1000 220 1180 300 1200 450 C1220 600 1080 720 860 730 C640 740 440 680 420 560 Z";

/** Top-down palm: six tapered leaves with a light rib, over a soft ground shadow. */
function Palm({ x, y, sway }: { x: number; y: number; sway?: number }) {
  const leaves = [0, 60, 120, 180, 240, 300];
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx="3" cy="4" rx="26" ry="20" fill="#000000" opacity="0.28" />
      <g>
        {sway ? <animateTransform attributeName="transform" type="rotate" values="-3;3;-3" dur={`${sway * 1.6}s`} repeatCount="indefinite" additive="sum" /> : null}
        {leaves.map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <path d="M0 0 C7 -9 20 -13 32 -7 C34 -5 34 -3 32 -1 C20 4 8 3 0 0 Z" fill="#1E9E5C" stroke="#0E0B1F" strokeWidth="1.2" strokeLinejoin="round" />
            <path d="M3 -0.5 C12 -5 22 -7 30 -4" fill="none" stroke="#B6FF3B" strokeWidth="1.2" strokeLinecap="round" opacity="0.8" />
            <path d="M0 0 C7 -9 20 -13 32 -7 C22 -8 12 -6 3 0 Z" fill="#3DDC97" opacity="0.45" />
          </g>
        ))}
        <circle r="5.5" fill="#6B4A2B" stroke="#0E0B1F" strokeWidth="1.2" />
        <circle cx="-1.5" cy="-1.5" r="1.6" fill="#FFD23F" opacity="0.7" />
      </g>
    </g>
  );
}

const WAVES = [
  { d: "M60 120 q30 -12 60 0 t60 0", from: 0, to: -240, dur: 6 },
  { d: "M1220 150 q30 -12 60 0 t60 0", from: -80, to: -320, dur: 7 },
  { d: "M120 820 q30 -12 60 0 t60 0", from: -40, to: -280, dur: 6.5 },
  { d: "M1180 800 q30 -12 60 0 t60 0", from: 0, to: -240, dur: 5.5 },
];

function ZoneLabel({ x, y, text }: { x: number; y: number; text: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" fontWeight="700" letterSpacing="1.6" fill="#5B4425" opacity="0.9">
      {text}
    </text>
  );
}

export function IslandFloor({ layout, circles, onFloorClick, children }: IslandFloorProps) {
  const g = ISLAND_GEOMETRY;
  const circleState = (key: string) => circles.find((c) => c.key === key);
  const fire = !!circleState("fire")?.active;
  const deck = !!circleState("deck")?.active;
  const hammocks = !!circleState("hammocks")?.active;
  return (
    <div style={{ position: "relative", width: 1440, height: 900 }}>
      <svg
        width={1440}
        height={900}
        viewBox="0 0 1440 900"
        role="img"
        aria-label="Top-down island with a jetty, a fire circle, a deck and hammocks"
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
          <pattern id="is-dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.3" fill="#7A5A2E" opacity="0.22" />
          </pattern>
          <radialGradient id="is-sand" cx="0.45" cy="0.42" r="0.7">
            <stop offset="0" stopColor="#F3D9A0" />
            <stop offset="0.7" stopColor="#E2BF7C" />
            <stop offset="1" stopColor="#CFA463" />
          </radialGradient>
          <radialGradient id="is-shallows" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0.72" stopColor="#22E3FF" stopOpacity="0" />
            <stop offset="1" stopColor="#22E3FF" stopOpacity="0.16" />
          </radialGradient>
          <radialGradient id="is-fire">
            <stop offset="0" stopColor="#FF8A00" stopOpacity="0.5" />
            <stop offset="1" stopColor="#FF3D9A" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="is-grass">
            <stop offset="0" stopColor="#3DDC97" stopOpacity="0.32" />
            <stop offset="1" stopColor="#3DDC97" stopOpacity="0.1" />
          </radialGradient>
        </defs>

        {/* open water: faint shallows around the island and drifting wave dashes */}
        <ellipse cx="810" cy="470" rx="520" ry="360" fill="url(#is-shallows)" />
        <g fill="none" stroke="#5CF2FF" strokeLinecap="round" strokeWidth="2" opacity="0.35">
          {WAVES.map((w) => (
            <path key={w.d} d={w.d} strokeDasharray="40 200">
              <animate attributeName="stroke-dashoffset" values={`${w.from};${w.to}`} dur={`${w.dur}s`} repeatCount="indefinite" />
            </path>
          ))}
          <path d="M300 90 q30 -12 60 0" opacity="0.6" />
          <path d="M1000 860 q30 -12 60 0" opacity="0.6" />
          <path d="M80 420 q30 -12 60 0" opacity="0.6" />
          <path d="M1330 470 q30 -12 60 0" opacity="0.6" />
        </g>

        {/* island plate: dark like the office floor, with a glowing shoreline */}
        <path d={SHORE} fill="none" stroke="#22E3FF" strokeOpacity="0.18" strokeWidth="14" strokeLinejoin="round" />
        <path d={SHORE} fill="url(#is-sand)" />
        <path d={SHORE} fill="url(#is-dots)" />
        <path d="M430 470 C500 700 900 760 1190 520 C1150 690 950 745 860 730 C640 740 440 680 420 560 Z" fill="#000000" opacity="0.08" />
        <path d={SHORE} fill="none" stroke="#22E3FF" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M470 360 C480 280 600 250 660 290 C710 320 680 400 600 410 C520 420 465 410 470 360 Z" fill="url(#is-grass)" stroke="#3DDC97" strokeOpacity="0.35" strokeWidth="1.5" />
        <path d="M1030 405 C1050 355 1150 355 1178 405 C1192 435 1170 462 1118 466 C1062 470 1020 445 1030 405 Z" fill="url(#is-grass)" stroke="#3DDC97" strokeOpacity="0.35" strokeWidth="1.5" />

        {/* jetty: dark planks with a cyan edge */}
        <g transform={`rotate(${g.jetty.rotDeg} ${g.jetty.cx} ${g.jetty.cy})`}>
          <rect x={g.jetty.x} y={g.jetty.y} width={g.jetty.w} height={g.jetty.h} rx="6" fill="#2B2658" stroke="#22E3FF" strokeOpacity="0.6" strokeWidth="1.5" />
          <path d="M250 600 V634 M290 600 V634 M330 600 V634 M370 600 V634 M410 600 V634" stroke="#4E479A" strokeWidth="2" />
        </g>
        <text x={g.arrival.x} y={g.arrival.y + 44} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" fontWeight="700" letterSpacing="1.6" fill="#8A84BA" opacity="0.85">
          JETTY
        </text>

        {/* fire circle */}
        <g>
          <circle cx="700" cy="480" r="110" fill={fire ? "rgba(182,255,59,0.12)" : "rgba(182,255,59,0.05)"} stroke="#B6FF3B" strokeWidth="2.5" strokeOpacity={fire ? 1 : 0.55} />
          {fire ? (
            <circle cx="700" cy="480" r="110" fill="none" stroke="#B6FF3B" strokeWidth="2.5">
              <animate attributeName="r" values="110;134" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="2.4s" repeatCount="indefinite" />
            </circle>
          ) : null}
          <circle cx="700" cy="480" r="72" fill="url(#is-fire)" />
          <circle cx="700" cy="480" r="30" fill="none" stroke="#4E479A" strokeWidth="6" strokeDasharray="14 12" strokeLinecap="round" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <rect key={deg} x="694" y="404" width="12" height="18" rx="4" fill="#2B2658" stroke="#FFFFFF" strokeOpacity="0.1" transform={`rotate(${deg} 700 480)`} />
          ))}
          <g transform="translate(700 494)">
            <g>
              <animateTransform attributeName="transform" type="scale" values="1 1;1.04 1.1;0.98 0.95;1.02 1.06;1 1" dur="2.6s" repeatCount="indefinite" />
              <path d="M0 0 C-12 -10 -10 -24 0 -32 C3 -24 8 -22 10 -28 C16 -20 12 -4 0 0 Z" fill="#FF8A00" stroke="#0E0B1F" strokeWidth="1.2" strokeLinejoin="round" />
              <path d="M0 -4 C-5 -9 -4 -17 0 -21 C3 -16 6 -14 5 -10 C6 -7 3 -4 0 -4 Z" fill="#FFD23F">
                <animate attributeName="opacity" values="1;0.75;1;0.85;1" dur="1.8s" repeatCount="indefinite" />
              </path>
            </g>
          </g>
          <circle cx="700" cy="480" r="72" fill="url(#is-fire)" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.7;0.9" dur="2.6s" repeatCount="indefinite" />
          </circle>
          <ZoneLabel x={700} y={620} text="FIRE CIRCLE" />
        </g>

        {/* deck with two loungers */}
        <g>
          <circle cx="935" cy="330" r="100" fill={deck ? "rgba(34,227,255,0.1)" : "rgba(34,227,255,0.04)"} stroke="#22E3FF" strokeWidth="2.5" strokeOpacity={deck ? 1 : 0.5} />
          {deck ? (
            <circle cx="935" cy="330" r="100" fill="none" stroke="#22E3FF" strokeWidth="2.5">
              <animate attributeName="r" values="100;124" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="2.4s" repeatCount="indefinite" />
            </circle>
          ) : null}
          <rect x="870" y="280" width="130" height="100" rx="12" fill="#2B2658" stroke="#FFFFFF" strokeOpacity="0.08" />
          <path d="M870 300 H1000 M870 320 H1000 M870 340 H1000 M870 360 H1000" stroke="#3E3880" strokeWidth="1.5" />
          <rect x="882" y="290" width="30" height="62" rx="10" fill="#3A3470" stroke="#22E3FF" strokeOpacity="0.55" strokeWidth="1.5" />
          <rect x="958" y="290" width="30" height="62" rx="10" fill="#3A3470" stroke="#22E3FF" strokeOpacity="0.55" strokeWidth="1.5" />
          <rect x="888" y="296" width="18" height="12" rx="4" fill="#FFD23F" opacity="0.7" />
          <rect x="964" y="296" width="18" height="12" rx="4" fill="#FF3D9A" opacity="0.6" />
          <ZoneLabel x={935} y={455} text="DECK" />
        </g>

        {/* hammocks */}
        <g>
          <circle cx="1100" cy="560" r="80" fill={hammocks ? "rgba(155,92,255,0.18)" : "rgba(155,92,255,0.08)"} stroke="#9B5CFF" strokeWidth="2.5" strokeDasharray="6 7" strokeOpacity={hammocks ? 1 : 0.7}>
            <animate attributeName="stroke-dashoffset" values="0;-26" dur="2s" repeatCount="indefinite" />
          </circle>
          <path d="M1064 538 L1073 560 M1136 538 L1127 560" stroke="#6B4A2B" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M1073 560 C1083 588 1117 588 1127 560 C1117 575 1083 575 1073 560 Z" fill="#FF3D9A" stroke="#0E0B1F" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M1080 566 L1084 580 M1090 570 L1092 583 M1100 572 L1100 584 M1110 570 L1108 583 M1120 566 L1116 580" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="1" />
          <path d="M1077 565 Q1100 582 1123 565 M1081 572 Q1100 586 1119 572" fill="none" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="1" />
          <ZoneLabel x={1100} y={666} text="HAMMOCKS" />
        </g>

        {g.palms.map(([x, y], i) => (
          <Palm key={`${x}-${y}`} x={x} y={y} sway={i === 0 ? 5 : i === 2 ? 6 : undefined} />
        ))}
      </svg>
      {children}
    </div>
  );
}
