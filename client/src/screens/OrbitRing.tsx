const PATH = "M60 600 A660 128 -5 1 1 1380 486 A660 128 -5 1 1 60 600";
const BACK_CLIP = "0,-80 1440,-80 1440,480.8 0,605.2";
const FRONT_CLIP = "0,605.2 1440,480.8 1440,900 0,900";
const DOTS: Array<[number, string, string]> = [
  [7, "#FF3D9A", "0s"],
  [6, "#B6FF3B", "-7s"],
  [6, "#22E3FF", "-14s"],
  [5, "#FFD23F", "-18s"],
];

export function OrbitRing({ side }: { side: "back" | "front" }) {
  const pathId = `l1-orbit-${side}`;
  const clipId = `l1-clip-${side}`;
  return (
    <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} aria-hidden>
      <defs>
        <clipPath id={clipId}>
          <polygon points={side === "back" ? BACK_CLIP : FRONT_CLIP} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`} transform="translate(0 80)">
        <path id={pathId} d={PATH} fill="none" stroke="#22E3FF" strokeOpacity={side === "back" ? 0.25 : 0.45} strokeWidth="1.5" strokeDasharray="3 7" />
        {DOTS.map(([r, fill, begin]) => (
          <circle key={fill} r={r} fill={fill}>
            <animateMotion dur="22s" begin={begin} repeatCount="indefinite">
              <mpath href={`#${pathId}`} />
            </animateMotion>
          </circle>
        ))}
      </g>
    </svg>
  );
}
