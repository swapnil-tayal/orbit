export function PlaneSprite({ scale = 0.34, pink = false }: { scale?: number; pink?: boolean }) {
  const accent = pink ? "#FF3D9A" : "#22E3FF";
  const id = pink ? "pl-p" : "pl-c";
  const INK = "#14122B";
  // Top-down airliner, nose pointing +x. The caller rotates it along the route.
  const wingL = "M9 -4.5 L-20 -43 L-29 -43 L-8 -4.5 Z";
  const wingR = "M9 4.5 L-20 43 L-29 43 L-8 4.5 Z";
  const tailL = "M-27 -3 L-39 -18 L-45 -18 L-34 -3 Z";
  const tailR = "M-27 3 L-39 18 L-45 18 L-34 3 Z";
  const fuselage = "M41 0 C41 -3.6 36.5 -5.8 28 -5.8 L-31 -4.6 C-37 -4.6 -41.5 -2.6 -44 0 C-41.5 2.6 -37 4.6 -31 4.6 L28 5.8 C36.5 5.8 41 3.6 41 0 Z";
  return (
    <svg width={110} height={90} viewBox="-60 -45 110 90" style={{ position: "absolute", left: -60, top: -45, overflow: "visible", pointerEvents: "none" }} aria-hidden>
      <defs>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" stopColor={accent} stopOpacity="0.38" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-trail`} gradientUnits="userSpaceOnUse" x1="-14" y1="0" x2="-150" y2="0">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.7" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-body`} gradientUnits="userSpaceOnUse" x1="0" y1="-6" x2="0" y2="6">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#D9D5F0" />
        </linearGradient>
        <linearGradient id={`${id}-wingfill`} gradientUnits="userSpaceOnUse" x1="0" y1="-43" x2="0" y2="43">
          <stop offset="0" stopColor="#C9C4E6" />
          <stop offset="0.5" stopColor="#F4F2FF" />
          <stop offset="1" stopColor="#C9C4E6" />
        </linearGradient>
      </defs>
      <g transform={`scale(${scale})`}>
        <circle r="54" fill={`url(#${id}-halo)`} />
        <g fill="none" stroke={`url(#${id}-trail)`} strokeLinecap="round" strokeWidth="3">
          <path d="M-14 -22 L-150 -22" />
          <path d="M-14 22 L-150 22" />
        </g>
        <g stroke={INK} strokeWidth="1.5" strokeLinejoin="round">
          <path d={tailL} fill={`url(#${id}-wingfill)`} />
          <path d={tailR} fill={`url(#${id}-wingfill)`} />
          <path d={wingL} fill={`url(#${id}-wingfill)`} />
          <path d={wingR} fill={`url(#${id}-wingfill)`} />
        </g>
        <path d="M-20 -43 L-29 -43 L-27.5 -40 L-21.5 -40 Z M-20 43 L-29 43 L-27.5 40 L-21.5 40 Z" fill={accent} />
        <g stroke={INK} strokeWidth="1.3">
          <rect x="-11" y="-26" width="15" height="7" rx="3.5" fill="#2B2658" />
          <rect x="-11" y="19" width="15" height="7" rx="3.5" fill="#2B2658" />
        </g>
        <rect x="-10.2" y="-25" width="3" height="5" rx="1.5" fill={accent} opacity="0.9" />
        <rect x="-10.2" y="20" width="3" height="5" rx="1.5" fill={accent} opacity="0.9" />
        <path d={fuselage} fill={`url(#${id}-body)`} stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M-30 0 L26 0" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M-31 -0.5 L-46 -5 L-46 5 L-31 0.5 Z" fill={accent} stroke={INK} strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M35.5 -2.4 L31 -3.4 L31 3.4 L35.5 2.4 C37 1.4 37 -1.4 35.5 -2.4 Z" fill="#1B1036" />
        {[22, 16, 10, 4, -2, -8, -14, -20].map((cx) => (
          <rect key={cx} x={cx} y="-3.4" width="2.2" height="1.8" rx="0.6" fill="#1B1036" opacity="0.75" />
        ))}
        <circle cx="-24.5" cy="-43" r="2.2" fill="#FF3D9A">
          <animate attributeName="opacity" values="1;0.2;1" dur="1.2s" repeatCount="indefinite" />
        </circle>
        <circle cx="-24.5" cy="43" r="2.2" fill="#B6FF3B">
          <animate attributeName="opacity" values="0.2;1;0.2" dur="1.2s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}

export function CarSprite({ scale = 0.22, pink = false }: { scale?: number; pink?: boolean }) {
  const id = pink ? "car-p" : "car-c";
  const body = pink ? ["#FF8BC4", "#FF3D9A", "#C21A6E"] : ["#9DF4FF", "#22E3FF", "#0E9DB5"];
  const cabin = pink ? "#C21A6E" : "#0E9DB5";
  const stripe = pink ? "#FFD23F" : "#FFFFFF";
  return (
    <svg width={120} height={70} viewBox="-60 -35 120 70" style={{ position: "absolute", left: -60, top: -35, overflow: "visible", pointerEvents: "none" }} aria-hidden>
      <defs>
        <linearGradient id={`${id}-body`} gradientUnits="userSpaceOnUse" x1="0" y1="-25" x2="0" y2="25">
          <stop offset="0" stopColor={body[0]} />
          <stop offset="0.55" stopColor={body[1]} />
          <stop offset="1" stopColor={body[2]} />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0" stopColor={pink ? "#FF3D9A" : "#22E3FF"} stopOpacity="0.55" />
          <stop offset="1" stopColor={pink ? "#FF3D9A" : "#22E3FF"} stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform={`scale(${scale})`}>
        <g>
          <animateTransform attributeName="transform" type="translate" values="0 0;0 -3;0 0" dur="0.4s" repeatCount="indefinite" additive="sum" />
          <ellipse rx="70" ry="44" fill={`url(#${id}-glow)`}>
            <animate attributeName="opacity" values="0.6;1;0.6" dur="1.2s" repeatCount="indefinite" />
          </ellipse>
          <path d="M50 -12 L150 -40 L150 40 L50 12 Z" fill="#FFF6C8" opacity="0.35" />
          <rect x="-43" y="-31" width="26" height="62" rx="6" fill="#140B28" />
          <rect x="17" y="-31" width="26" height="62" rx="6" fill="#140B28" />
          <path d="M-44 -25 L30 -25 Q50 -24 51 -10 L51 10 Q50 24 30 25 L-44 25 Q-50 25 -50 18 L-50 -18 Q-50 -25 -44 -25 Z" fill={`url(#${id}-body)`} stroke="#FFFFFF" strokeWidth="3" strokeOpacity={pink ? 0.35 : 1} />
          <rect x="-50" y="-6" width="101" height="4" fill={stripe} />
          <rect x="-50" y="2" width="101" height="4" fill={stripe} />
          <rect x="-28" y="-20" width="47" height="40" rx="12" fill={cabin} />
          <path d="M8 -17 L18 -13 Q21.5 0 18 13 L8 17 Z" fill="#1B1036" />
          <path d="M-19 -16 L-26 -12 Q-28.5 0 -26 12 L-19 16 Z" fill="#1B1036" />
          <rect x="-18" y="-14" width="25" height="28" rx="6" fill={`url(#${id}-body)`} />
          <rect x="-18" y="-6" width="25" height="4" fill={stripe} />
          <rect x="-18" y="2" width="25" height="4" fill={stripe} />
          <rect x="45" y="-19" width="7" height="10" rx="2" fill="#FFFBE0" />
          <rect x="45" y="9" width="7" height="10" rx="2" fill="#FFFBE0" />
          <rect x="-53" y="-19" width="6" height="10" rx="2" fill="#FF3355">
            <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />
          </rect>
          <rect x="-53" y="9" width="6" height="10" rx="2" fill="#FF3355">
            <animate attributeName="opacity" values="1;0.4;1" dur="0.8s" repeatCount="indefinite" />
          </rect>
        </g>
      </g>
    </svg>
  );
}
