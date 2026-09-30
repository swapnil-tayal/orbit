import type { ReactNode } from "react";
import { OFFICE_GEOMETRY, type DeskDef, type SpaceLayout } from "@orbit/shared";

export type DeskVisualState = "free" | "online" | "offline" | "away" | "mine" | "selected" | "candidate";

export interface DeskVisual {
  desk: DeskDef;
  state: DeskVisualState;
  ownerColor: string;
  ring: "none" | "free" | "selected" | "mine" | "open" | "targeted" | "inside";
}

export interface ZoneVisual {
  id: string;
  kind: "meeting" | "lounge";
  active: boolean;
  members: number;
}

export interface OfficeFloorProps {
  layout: SpaceLayout;
  desks: DeskVisual[];
  zones: ZoneVisual[];
  showSpawnPulse?: boolean;
  dim?: boolean;
  onDeskClick?: (desk: DeskDef) => void;
  onFloorClick?: (x: number, y: number) => void;
  children?: ReactNode;
}

const g = OFFICE_GEOMETRY;

function Plant({ x, y, dur }: { x: number; y: number; dur: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g>
        <animateTransform attributeName="transform" type="rotate" values="-4;4;-4" dur={`${dur}s`} repeatCount="indefinite" />
        <circle r="18" fill="#1E7A4F" />
        <circle cx="-6" cy="-5" r="9" fill="#3DDC97" />
        <circle cx="7" cy="3" r="7" fill="#B6FF3B" opacity="0.8" />
      </g>
    </g>
  );
}

function Window({ x, begin }: { x: number; begin: number }) {
  return (
    <g>
      <path d={`M${x} 134 L${x + 120} 134 L${x + 146} 214 L${x - 26} 214 Z`} fill="url(#of-win)">
        <animate attributeName="opacity" values="0.7;1;0.7" dur="7s" begin={`${begin}s`} repeatCount="indefinite" />
      </path>
      <rect x={x} y="126" width="120" height="8" rx="3" fill="#22E3FF" opacity="0.55" />
      <rect x={x + 58} y="126" width="4" height="8" fill="#15122E" />
    </g>
  );
}

export function DeskStation({ v, onClick }: { v: DeskVisual; onClick?: (d: DeskDef) => void }) {
  const { desk, state, ownerColor } = v;
  const x = desk.x;
  const y = desk.y;
  const strip = state === "free" || state === "candidate" ? "#3E3880" : state === "selected" ? "#FFD23F" : state === "mine" ? "#FF3D9A" : state === "offline" ? "#6E6A8F" : ownerColor;
  const freeA = desk.idx % 2 === 0;
  const ring = v.ring;
  return (
    <g style={{ cursor: onClick ? "pointer" : undefined }} onClick={onClick ? () => onClick(desk) : undefined}>
      {ring === "free" ? (
        <circle cx={x} cy={y} r={g.deskRing} fill="none" stroke="#22E3FF" strokeWidth="2" strokeDasharray="6 7">
          <animate attributeName="stroke-dashoffset" values="0;-26" dur="1.6s" repeatCount="indefinite" />
        </circle>
      ) : null}
      {ring === "selected" ? (
        <>
          <circle cx={x} cy={y} r={g.deskRing} fill="rgba(255,210,63,0.16)" stroke="#FFD23F" strokeWidth="2.5" />
          <circle cx={x} cy={y} r={g.deskRing} fill="none" stroke="#FFD23F" strokeWidth="2">
            <animate attributeName="r" values="66;86" dur="1.8s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0" dur="1.8s" repeatCount="indefinite" />
          </circle>
        </>
      ) : null}
      {ring === "mine" ? (
        <>
          <circle cx={x} cy={y} r={g.deskRing} fill="rgba(255,61,154,0.14)" stroke="#FF3D9A" strokeWidth="2" />
          <circle cx={x} cy={y} r={g.deskRing} fill="none" stroke="#FF3D9A" strokeWidth="1.4">
            <animate attributeName="r" values="66;82" dur="2.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </>
      ) : null}
      {ring === "open" ? <circle cx={x} cy={y} r={g.deskRing} fill="none" stroke="#BDB8E6" strokeOpacity="0.28" strokeWidth="1.5" /> : null}
      {ring === "targeted" ? (
        <circle cx={x} cy={y} r={g.deskRing} fill="rgba(182,255,59,0.1)" stroke="#B6FF3B" strokeWidth="2">
          <animate attributeName="stroke-opacity" values="1;0.35;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
      ) : null}
      {ring === "inside" ? (
        <>
          <circle cx={x} cy={y} r={g.deskRing} fill="rgba(182,255,59,0.16)" stroke="#B6FF3B" strokeWidth="1.6" />
          <circle cx={x} cy={y} r={g.deskRing} fill="none" stroke="#B6FF3B" strokeWidth="1.4">
            <animate attributeName="r" values="66;80" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0" dur="2.2s" repeatCount="indefinite" />
          </circle>
        </>
      ) : null}
      <g transform={`translate(${x} ${y + 16}) scale(0.78) translate(${-x} ${-y - 16})`}>
      <rect x={x - 55} y={y - 44} width="110" height="40" rx="10" fill="#2B2658" stroke="#FFFFFF" strokeOpacity="0.08" />
      <rect x={x - 16} y={y - 19} width="32" height="7" rx="3" fill="#3E3880" />
      <circle cx={x} cy={y + 16} r="15" fill="#3A3470" />
      <path d={`M${x - 12} ${y + 27} A15 15 0 0 0 ${x + 12} ${y + 27}`} fill="none" stroke="#4E479A" strokeWidth="4" strokeLinecap="round" />
      <rect x={x - 26} y={y - 40} width="52" height="6" rx="3" fill={strip} />
      <rect x={x + 22} y={y - 20} width="6" height="9" rx="3" fill="#4E479A" />
      {state === "free" || state === "candidate" || state === "selected" ? (
        freeA ? (
          <g>
            <circle cx={x + 42} cy={y - 26} r="7" fill="#3A3470" />
            <circle cx={x + 39} cy={y - 28} r="3.6" fill="#3DDC97" />
            <circle cx={x + 45} cy={y - 27} r="3.2" fill="#B6FF3B" opacity="0.8" />
            <circle cx={x + 42} cy={y - 23} r="3" fill="#1E9E5C" />
          </g>
        ) : (
          <rect x={x - 50} y={y - 38} width="16" height="12" rx="2" fill="#BDB8E6" opacity="0.18" transform={`rotate(-6 ${x - 42} ${y - 32})`} />
        )
      ) : null}
      {state === "online" || state === "mine" ? (
        <g>
          <path d={`M${x - 24} ${y - 34} L${x + 24} ${y - 34} L${x + 16} ${y - 21} L${x - 16} ${y - 21} Z`} fill={state === "mine" ? "#FF3D9A" : ownerColor} opacity="0.14">
            <animate attributeName="opacity" values="0.1;0.24;0.14;0.22;0.1" dur="2.2s" begin={`${(desk.idx % 5) * 0.3}s`} repeatCount="indefinite" />
          </path>
          {[0, 1, 2].map((k) => (
            <rect key={k} x={x - 13 + k * 9} y={y - 17.5} width="5" height="4" rx="1" fill={state === "mine" ? "#FF3D9A" : ownerColor}>
              <animate attributeName="opacity" values="0;0.95;0" dur="0.5s" begin={`${(desk.idx % 5) * 0.3 + 0.07 + k * 0.17}s`} repeatCount="indefinite" />
            </rect>
          ))}
          <circle cx={x - 44} cy={y - 30} r="20" fill="url(#of-warm)">
            <animate attributeName="opacity" values="0.7;1;0.7" dur="3.5s" repeatCount="indefinite" />
          </circle>
          <circle cx={x - 44} cy={y - 30} r="4.5" fill="#FFD23F" />
          <circle cx={x + 42} cy={y - 26} r="5.5" fill="#F4F2FF" opacity="0.92" />
          <circle cx={x + 42} cy={y - 26} r="3.4" fill="#7A4E26" />
          <path d={`M${x + 47} ${y - 29} a3 3 0 0 1 0 6`} fill="none" stroke="#F4F2FF" strokeOpacity="0.9" strokeWidth="1.6" />
          {[0, 1].map((k) => (
            <path key={k} d={`M${x + 40 + k * 4} ${y - 31} q-4 -4 0 -7 q4 -4 1 -11`} fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round">
              <animate attributeName="opacity" values="0;0.32;0" dur="2.6s" begin={`${k * 1.3}s`} repeatCount="indefinite" />
              <animateTransform attributeName="transform" type="translate" values="0 0;0 -6" dur="2.6s" begin={`${k * 1.3}s`} repeatCount="indefinite" />
            </path>
          ))}
        </g>
      ) : null}
      {state === "offline" ? (
        <g>
          <circle cx={x + 42} cy={y - 26} r="5.5" fill="#BDB8E6" opacity="0.55" />
          <circle cx={x + 42} cy={y - 26} r="3.4" fill="#4A3A2A" />
          <rect x={x - 49} y={y - 38} width="10" height="10" rx="1.5" fill="#FFD23F" opacity="0.7" transform={`rotate(-8 ${x - 44} ${y - 33})`} />
          <rect x={x - 38} y={y - 33} width="10" height="10" rx="1.5" fill="#FF3D9A" opacity="0.55" transform={`rotate(10 ${x - 33} ${y - 28})`} />
        </g>
      ) : null}
      {state === "away" ? (
        <g>
          <rect x={x + 12} y={y - 39} width="26" height="16" rx="3" fill="#3E3880" />
          <rect x={x + 15} y={y - 36} width="20" height="10" rx="1.5" fill={ownerColor} opacity="0.3">
            <animate attributeName="opacity" values="0.2;0.4;0.2" dur="3s" repeatCount="indefinite" />
          </rect>
          <path d={`M${x - 48} ${y - 20} a8 8 0 0 1 16 0`} fill="none" stroke="#BDB8E6" strokeOpacity="0.7" strokeWidth="2.5" />
          <rect x={x - 50} y={y - 22} width="4" height="7" rx="2" fill={ownerColor} />
          <rect x={x - 34} y={y - 22} width="4" height="7" rx="2" fill={ownerColor} />
        </g>
      ) : null}
      </g>
    </g>
  );
}

export function OfficeFloor({ layout, desks, zones, showSpawnPulse = true, dim = false, onDeskClick, onFloorClick, children }: OfficeFloorProps) {
  const shift = layout.extraRowsShift;
  const H = layout.height;
  const meeting = zones.find((z) => z.kind === "meeting");
  const lounge = zones.find((z) => z.kind === "lounge");
  const wall = `M230 ${590 + shift} V158 A28 28 0 0 1 258 130 H1182 A28 28 0 0 1 1210 158 V${742 + shift} A28 28 0 0 1 1182 ${770 + shift} H258 A28 28 0 0 1 230 ${742 + shift} V${690 + shift}`;
  return (
    <div style={{ position: "relative", width: 1440, height: H, opacity: dim ? 0.6 : 1 }}>
      <svg
        width={1440}
        height={H}
        viewBox={`0 0 1440 ${H}`}
        role="img"
        aria-label="Top-down office floor plan"
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
          <pattern id="of-dots" width="26" height="26" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.3" fill="#FFFFFF" opacity="0.07" />
          </pattern>
          <linearGradient id="of-win" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#22E3FF" stopOpacity="0.09" />
            <stop offset="1" stopColor="#22E3FF" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="of-tv" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#22E3FF" stopOpacity="0.22" />
            <stop offset="1" stopColor="#22E3FF" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="of-warm">
            <stop offset="0" stopColor="#FFD23F" stopOpacity="0.32" />
            <stop offset="1" stopColor="#FFD23F" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="of-rug">
            <stop offset="0" stopColor="#9B5CFF" stopOpacity="0.1" />
            <stop offset="1" stopColor="#9B5CFF" stopOpacity="0.02" />
          </radialGradient>
        </defs>
        <rect x="230" y="130" width="980" height={640 + shift} rx="28" fill="#15122E" />
        <rect x="230" y="130" width="980" height={640 + shift} rx="28" fill="url(#of-dots)" />
        <path d={wall} fill="none" stroke="#22E3FF" strokeOpacity="0.18" strokeWidth="12" strokeLinecap="round" />
        <path d={wall} fill="none" stroke="#22E3FF" strokeWidth="2.5" strokeLinecap="round" />
        <g aria-hidden>
          <Window x={470} begin={2} />
          <Window x={640} begin={1} />
          <Window x={810} begin={0} />
          <Window x={980} begin={2} />
          <text x="238" y={708 + shift} fontFamily="var(--font-mono)" fontSize="10.5" fontWeight="700" letterSpacing="1.6" fill="#8A84BA" opacity="0.85">
            ENTRY
          </text>
          <text x="350" y="205" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" fontWeight="700" letterSpacing="1.6" fill="#8A84BA" opacity="0.85">
            HUDDLE
          </text>
          <text x="464" y={578 + shift} fontFamily="var(--font-mono)" fontSize="10.5" fontWeight="700" letterSpacing="1.6" fill="#8A84BA" opacity="0.85">
            FOCUS
          </text>
          <circle cx="350" cy="330" r="116" fill="url(#of-rug)" stroke="#9B5CFF" strokeOpacity="0.16" strokeWidth="1.5" strokeDasharray="2 6" />
          <path d="M241 292 L306 268 L306 392 L241 368 Z" fill="url(#of-tv)">
            <animate attributeName="opacity" values="0.6;1;0.75;1;0.6" dur="4s" repeatCount="indefinite" />
          </path>
          <rect x="233" y="290" width="8" height="80" rx="2" fill="#0E0C22" stroke="#22E3FF" strokeOpacity="0.7" strokeWidth="1.2" />
          <rect x="235" y="296" width="4" height="22" rx="1" fill="#FF3D9A">
            <animate attributeName="fill" values="#FF3D9A;#22E3FF;#FFD23F;#FF3D9A" dur="6s" calcMode="discrete" repeatCount="indefinite" />
          </rect>
          <rect x="235" y="322" width="4" height="40" rx="1" fill="#22E3FF" opacity="0.6">
            <animate attributeName="height" values="40;26;34;40" dur="6s" calcMode="discrete" repeatCount="indefinite" />
          </rect>
          <rect x="1124" y="144" width="72" height="104" rx="14" fill="#2B2658" />
          <circle cx="1147" cy="172" r="7" fill="#FF3D9A" />
          <circle cx="1172" cy="172" r="7" fill="#FFD23F" />
          <circle cx="1147" cy="198" r="7" fill="#22E3FF" />
          <rect x="1138" y="266" width="58" height="40" rx="8" fill="#2B2658" stroke="#FFFFFF" strokeOpacity="0.08" />
          <rect x="1148" y="272" width="38" height="10" rx="2" fill="#3E3880" />
          <rect x="1152" y="280" width="30" height="14" rx="1.5" fill="#F4F2FF" opacity="0.85">
            <animate attributeName="y" values="280;280;268;268;280" keyTimes="0;0.55;0.75;0.95;1" dur="6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;0.55;0.62;0.95;1" dur="6s" repeatCount="indefinite" />
          </rect>
          <circle cx="1187" cy="298" r="2.6" fill="#B6FF3B">
            <animate attributeName="fill" values="#B6FF3B;#FFD23F;#B6FF3B" keyTimes="0;0.6;1" dur="6s" repeatCount="indefinite" />
          </circle>
          <circle cx="1182" cy="338" r="14" fill="#22E3FF" fillOpacity="0.22" stroke="#22E3FF" strokeOpacity="0.75" strokeWidth="1.5" />
          {[1178, 1185, 1181].map((bx, i) => (
            <circle key={bx} cx={bx} cy="346" r="1.8" fill="#FFFFFF">
              <animate attributeName="cy" values="346;330" dur="2.4s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;0.9;0" dur="2.4s" begin={`${i * 0.8}s`} repeatCount="indefinite" />
            </circle>
          ))}
          <rect x="1174" y="370" width="22" height="118" rx="5" fill="#2B2658" />
          {Array.from({ length: 14 }, (_, i) => {
            const colors = ["#FFD23F", "#22E3FF", "#FF3D9A", "#B6FF3B", "#9B5CFF", "#BDB8E6"];
            const w = [14, 12, 10][i % 3];
            return <rect key={i} x={i % 2 === 0 ? 1178 : 1179} y={375 + i * 8} width={w} height="5" rx="1" fill={colors[i % colors.length]} opacity="0.7" />;
          })}
          <Plant x={262} y={162} dur={6} />
          <g transform={`translate(0 ${shift})`}>
            <rect x="300" y="584" width="890" height="28" rx="14" fill="#9B5CFF" opacity="0.05" />
            {[330, 352, 374].map((cx, i) => (
              <path key={cx} d={`M${cx} 592 l7 6 l-7 6`} fill="none" stroke="#22E3FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.2">
                <animate attributeName="opacity" values="0.15;0.7;0.15" dur="1.8s" begin={`${i * 0.3}s`} repeatCount="indefinite" />
              </path>
            ))}
            <rect x="238" y="606" width="26" height="68" rx="6" fill="#2B2658" />
            <path d="M245 612 V668 M251 612 V668 M257 612 V668" stroke="#3E3880" strokeWidth="2" />
            <rect x="340" y="632" width="306" height="130" rx="24" fill="#FFD23F" fillOpacity="0.04" stroke="#FFD23F" strokeOpacity="0.14" strokeWidth="1.5" strokeDasharray="2 6" />
            <rect x="686" y="632" width="178" height="130" rx="24" fill="#FF3D9A" fillOpacity="0.05" stroke="#FF3D9A" strokeOpacity="0.16" strokeWidth="1.5" strokeDasharray="2 6" />
            <rect x="904" y="632" width="232" height="130" rx="24" fill="#22E3FF" fillOpacity="0.04" stroke="#22E3FF" strokeOpacity="0.14" strokeWidth="1.5" strokeDasharray="2 6" />
            {[
              [493, "KITCHEN"],
              [775, "LOUNGE"],
              [1020, "NOOK"],
            ].map(([lx, label]) => (
              <text key={String(label)} x={Number(lx)} y="654" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" fontWeight="700" letterSpacing="1.6" fill="#8A84BA" opacity="0.85">
                {label}
              </text>
            ))}
            <circle cx="850" cy="744" r="30" fill="url(#of-warm)">
              <animate attributeName="r" values="26;32;26" dur="4s" repeatCount="indefinite" />
            </circle>
            <circle cx="850" cy="744" r="6" fill="#FFD23F" />
            {lounge ? (
              <circle cx="775" cy="690" r="76" fill={lounge.active ? "rgba(155,92,255,0.14)" : "rgba(155,92,255,0.07)"} stroke="#9B5CFF" strokeOpacity={lounge.active ? 0.9 : 0.6} strokeWidth="1.5" strokeDasharray="4 6" />
            ) : null}
            <rect x="715" y="720" width="120" height="30" rx="14" fill="#9B5CFF" opacity="0.55" />
            <circle cx="725" cy="668" r="16" fill="#9B5CFF" opacity="0.4" />
            <circle cx="825" cy="668" r="16" fill="#9B5CFF" opacity="0.4" />
            <circle cx="775" cy="682" r="15" fill="#2B2658" />
            <g transform="translate(27 -8)">
            {[406, 466, 526].map((cx) => (
              <circle key={cx} cx={cx} cy="716" r="11" fill="#3A3470" stroke="#4E479A" strokeWidth="1.5" />
            ))}
            <rect x="340" y="730" width="252" height="32" rx="9" fill="#2B2658" stroke="#FFFFFF" strokeOpacity="0.06" />
            <rect x="352" y="735" width="30" height="22" rx="5" fill="#3E3880" />
            <circle cx="366" cy="746" r="5" fill="#F4F2FF" opacity="0.9" />
            <circle cx="366" cy="746" r="3.2" fill="#7A4E26" />
            <circle cx="377" cy="739" r="2" fill="#B6FF3B">
              <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
            </circle>
            {[364, 368].map((sx, i) => (
              <path key={sx} d={`M${sx} 740 q-4 -7 0 -13 q4 -7 1 -20`} fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round">
                <animate attributeName="opacity" values="0;0.32;0" dur="2.4s" begin={`${i * 1.2}s`} repeatCount="indefinite" />
                <animateTransform attributeName="transform" type="translate" values="0 0;0 -6" dur="2.4s" begin={`${i * 1.2}s`} repeatCount="indefinite" />
              </path>
            ))}
            <rect x="398" y="737" width="38" height="18" rx="6" fill="#0E0C22" stroke="#22E3FF" strokeOpacity="0.35" />
            <circle cx="417" cy="735" r="3" fill="#BDB8E6" />
            <circle cx="464" cy="746" r="11" fill="#3A3470" />
            <circle cx="460" cy="743" r="3.8" fill="#FF3D9A" />
            <circle cx="468" cy="744" r="3.6" fill="#FFD23F" />
            <circle cx="464" cy="750" r="3.2" fill="#B6FF3B" />
            {[
              [496, "#FF3D9A"],
              [510, "#22E3FF"],
              [524, "#FFD23F"],
            ].map(([cx, c]) => (
              <circle key={String(cx)} cx={Number(cx)} cy="746" r="4.5" fill={String(c)} stroke="#F4F2FF" strokeOpacity="0.8" strokeWidth="1.5" />
            ))}
            <rect x="545" y="736" width="38" height="20" rx="4" fill="#3E3880" />
            <rect x="549" y="740" width="22" height="12" rx="2" fill="#0E0C22" />
            <circle cx="577" cy="746" r="2" fill="#FF3D9A">
              <animate attributeName="opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" />
            </circle>
            </g>
            <rect x="920" y="734" width="150" height="20" rx="5" fill="#2B2658" />
            {Array.from({ length: 20 }, (_, i) => {
              const colors = ["#FF3D9A", "#22E3FF", "#FFD23F", "#B6FF3B", "#9B5CFF", "#BDB8E6"];
              const h = [12, 11, 10][i % 3];
              return <rect key={i} x={926 + i * 7} y={750 - h} width="5" height={h} rx="1" fill={colors[i % colors.length]} opacity="0.75" />;
            })}
            <ellipse cx="958" cy="690" rx="25" ry="21" fill="#9B5CFF" opacity="0.6" />
            <ellipse cx="952" cy="684" rx="12" ry="9" fill="#FFFFFF" opacity="0.12" />
            <ellipse cx="1042" cy="686" rx="25" ry="21" fill="#FF3D9A" opacity="0.5" />
            <ellipse cx="1036" cy="680" rx="12" ry="9" fill="#FFFFFF" opacity="0.12" />
            <circle cx="1000" cy="708" r="10" fill="#3E3880" />
            <rect x="994" y="703" width="12" height="9" rx="1.5" fill="#22E3FF" opacity="0.7" transform="rotate(-12 1000 708)" />
            <circle cx="1108" cy="668" r="36" fill="url(#of-warm)">
              <animate attributeName="r" values="30;38;30" dur="5s" repeatCount="indefinite" />
            </circle>
            <circle cx="1108" cy="668" r="7" fill="#FFD23F" />
            <Plant x={1178} y={738} dur={5} />
            <g>
              <animateMotion dur="28s" repeatCount="indefinite" rotate="auto" path="M640 598 H1150 H640" />
              <circle r="10" fill="#3A3470" stroke="#BDB8E6" strokeOpacity="0.55" strokeWidth="1.5" />
              <path d="M4 -8 A10 10 0 0 1 4 8" fill="none" stroke="#22E3FF" strokeWidth="2" />
              <circle cx="5" cy="0" r="2" fill="#22E3FF">
                <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
              </circle>
            </g>
          </g>
        </g>
        {meeting ? (
          <>
            <circle cx="350" cy="330" r="92" fill={meeting.active ? "rgba(182,255,59,0.08)" : "rgba(182,255,59,0.04)"} stroke="#B6FF3B" strokeOpacity={meeting.active ? 1 : 0.35} strokeWidth={meeting.active ? 2 : 1.5} strokeDasharray={meeting.active ? undefined : "4 6"} />
            {meeting.active ? (
              <circle cx="350" cy="330" r="92" fill="none" stroke="#B6FF3B" strokeWidth="2">
                <animate attributeName="r" values="92;114" dur="2.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.7;0" dur="2.4s" repeatCount="indefinite" />
              </circle>
            ) : null}
          </>
        ) : null}
        {[
          [406, 330],
          [378, 378.5],
          [322, 378.5],
          [294, 330],
          [322, 281.5],
          [378, 281.5],
        ].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="11" fill="#3A3470" />
        ))}
        <circle cx="350" cy="330" r="34" fill="#2B2658" stroke="#FFFFFF" strokeOpacity="0.1" />
        {layout.ghostSlots.map((s) => (
          <g key={s.idx} opacity="0.9">
            <rect x={s.x - 55} y={s.y - 44} width="110" height="40" rx="10" fill="none" stroke="#22E3FF" strokeOpacity="0.35" strokeDasharray="4 5" />
            <circle cx={s.x} cy={s.y + 16} r="15" fill="none" stroke="#22E3FF" strokeOpacity="0.35" strokeDasharray="4 5" />
          </g>
        ))}
        {desks.map((v) => (
          <DeskStation key={v.desk.id} v={v} onClick={onDeskClick} />
        ))}
      </svg>
      {children}
    </div>
  );
}

export function DeskTag({ x, y, kind, label, dot }: { x: number; y: number; kind: "free" | "online" | "offline" | "meeting" | "selected" | "mine" | "away"; label: string; dot?: boolean }) {
  const base: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y - 52,
    transform: "translate(-50%, -100%)",
    borderRadius: 999,
    fontSize: 12,
    whiteSpace: "nowrap",
    display: "flex",
    alignItems: "center",
    gap: 6,
    pointerEvents: "none",
  };
  if (kind === "free") return <div style={{ ...base, padding: "3px 9px", border: "1px dashed rgba(34,227,255,0.8)", background: "rgba(20,18,44,0.9)", fontWeight: 600, color: "#22E3FF" }}>{label}</div>;
  if (kind === "selected") return <div style={{ ...base, padding: "3px 10px", background: "#FFD23F", color: "#0B0B1A", fontWeight: 700, boxShadow: "0 0 18px rgba(255,210,63,0.6)" }}>{label}</div>;
  if (kind === "mine") return <div style={{ ...base, padding: "3px 10px", background: "rgba(255,61,154,0.2)", border: "1px solid #FF3D9A", color: "#FF7BBA", fontWeight: 700 }}>{label}</div>;
  if (kind === "online")
    return (
      <div style={{ ...base, padding: "3px 9px", background: "rgba(20,18,44,0.9)", fontWeight: 600, border: dot ? "1px solid rgba(182,255,59,0.6)" : undefined }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#B6FF3B", boxShadow: "0 0 8px #B6FF3B" }} />
        {label}
      </div>
    );
  if (kind === "away") return <div style={{ ...base, padding: "3px 9px", background: "rgba(34,227,255,0.14)", border: "1px solid rgba(34,227,255,0.5)", color: "#22E3FF", fontWeight: 600 }}>{label}</div>;
  if (kind === "meeting") return <div style={{ ...base, padding: "3px 9px", background: "rgba(20,18,44,0.7)", color: "#BDB8E6" }}>{label}</div>;
  return (
    <div style={{ ...base, padding: "3px 9px", background: "rgba(20,18,44,0.7)", color: "#8A84BA" }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", border: "1.5px solid #6E6A8F" }} />
      {label}
    </div>
  );
}
