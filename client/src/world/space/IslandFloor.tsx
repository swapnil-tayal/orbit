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

/** Neon palm: a dark trunk cap with stroked fronds, matching the office plants. */
function Palm({ x, y, sway }: { x: number; y: number; sway?: number }) {
  const fronds = [0, 60, 120, 180, 240, 300];
  return (
    <g transform={`translate(${x} ${y})`}>
      <g>
        {sway ? <animateTransform attributeName="transform" type="rotate" values="-4;4;-4" dur={`${sway}s`} repeatCount="indefinite" additive="sum" /> : null}
        <circle r="30" fill="#1E7A4F" opacity="0.18" />
        {fronds.map((deg) => (
          <path key={deg} d="M0 0 Q14 -10 30 -4" fill="none" stroke="#3DDC97" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${deg})`} />
        ))}
        {fronds.map((deg) => (
          <path key={`h${deg}`} d="M4 -1 Q14 -8 26 -4" fill="none" stroke="#B6FF3B" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" transform={`rotate(${deg + 30})`} />
        ))}
        <circle r="6" fill="#2B2658" stroke="#B6FF3B" strokeWidth="1.5" />
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
    <text x={x} y={y} textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" fontWeight="700" letterSpacing="1.6" fill="#8A84BA" opacity="0.9">
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
            <circle cx="3" cy="3" r="1.3" fill="#FFFFFF" opacity="0.07" />
          </pattern>
          <radialGradient id="is-sand" cx="0.5" cy="0.5" r="0.6">
            <stop offset="0" stopColor="#FFD23F" stopOpacity="0.09" />
            <stop offset="1" stopColor="#FFD23F" stopOpacity="0" />
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
            <stop offset="0" stopColor="#3DDC97" stopOpacity="0.16" />
            <stop offset="1" stopColor="#3DDC97" stopOpacity="0.03" />
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
        <path d={SHORE} fill="#15122E" />
        <path d={SHORE} fill="url(#is-dots)" />
        <path d={SHORE} fill="url(#is-sand)" />
        <path d={SHORE} fill="none" stroke="#22E3FF" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="M470 360 C480 280 600 250 660 290 C710 320 680 400 600 410 C520 420 465 410 470 360 Z" fill="url(#is-grass)" stroke="#3DDC97" strokeOpacity="0.35" strokeWidth="1.5" />
        <path d="M1040 430 C1060 380 1150 380 1175 430 C1195 480 1160 560 1110 570 C1060 580 1030 480 1040 430 Z" fill="url(#is-grass)" stroke="#3DDC97" strokeOpacity="0.35" strokeWidth="1.5" />

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
          <path d="M700 494 C688 484 690 470 700 462 C703 470 708 472 710 466 C716 474 712 490 700 494 Z" fill="#FF8A00">
            <animateTransform attributeName="transform" type="scale" values="1;1.12;0.96;1.08;1" dur="1.2s" repeatCount="indefinite" additive="sum" />
          </path>
          <path d="M700 490 C695 485 696 477 700 473 C703 478 706 480 705 484 C706 487 703 490 700 490 Z" fill="#FFD23F" />
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
          <path d="M1060 512 Q1100 560 1140 512" fill="none" stroke="#FF3D9A" strokeWidth="7" strokeLinecap="round" />
          <path d="M1066 516 Q1100 552 1134 516" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 5" />
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
