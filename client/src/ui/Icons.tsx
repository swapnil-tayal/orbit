import type { SVGProps } from "react";

interface IconProps extends SVGProps<SVGSVGElement> {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

function base({ size = 20, color = "currentColor", strokeWidth = 1.9, ...rest }: IconProps, join: "round" | "miter" = "round") {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: join,
    "aria-hidden": true,
    ...rest,
  };
}

export const IconHome = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 10.5 12 3.5l8.5 7V20a1 1 0 0 1-1 1H15v-6H9v6H4.5a1 1 0 0 1-1-1z" />
  </svg>
);

export const IconOffice = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16" />
    <path d="M15 10h4a1 1 0 0 1 1 1v10" />
    <path d="M2.5 21h19" />
    <path d="M8 8h3M8 12h3M8 16h3" />
  </svg>
);

export const IconPalm = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21c0-6 .8-10 3-13" />
    <path d="M15 8c-3-1.5-6-.5-8 2 3-.5 5.5.3 8 2" />
    <path d="M15 8c1-3 4-4 7-3-2 .5-3.5 1.8-4.5 3.5" />
    <path d="M15 8c3-1 6 0 7.5 2.5-2.5-.8-5-.5-7.5 1" />
    <path d="M15 8c-1-3-3.5-4.5-6.5-4 2 .7 3.5 2 4.5 4" />
    <path d="M4 21c2.5-1.5 5.5-1.5 8 0 2.5-1.5 5.5-1.5 8 0" />
  </svg>
);

export const IconPeople = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M2.8 20c0-3.3 2.8-5.6 6.2-5.6s6.2 2.3 6.2 5.6" />
    <circle cx="17" cy="9" r="2.6" />
    <path d="M16 14.6c3 0 5.2 1.9 5.2 4.6" />
  </svg>
);

export const IconGlobe = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3.5 9h17M3.5 15h17M12 3c2.5 2.5 3.8 5.5 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.5-3.8-9S9.5 5.5 12 3z" />
  </svg>
);

export const IconCar = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 16.5v-4l2.2-5.2A1.5 1.5 0 0 1 8.1 6.3h7.8a1.5 1.5 0 0 1 1.4 1l2.2 5.2v4a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z" />
    <path d="M4.5 12.5h15" />
    <path d="M6.5 17.5v1.5M17.5 17.5v1.5" />
  </svg>
);

export const IconCarOff = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 16.5v-4l2.2-5.2A1.5 1.5 0 0 1 8.1 6.3h7.8a1.5 1.5 0 0 1 1.4 1l2.2 5.2v4a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1z" />
    <path d="M3 3l18 18" />
  </svg>
);

export const IconPlane = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10.5 20.5 12 16l1.5 4.5M12 16V4.8a1.3 1.3 0 0 1 2.6 0V9l6.4 4v2l-6.4-2v4.5M12 9 3 13v2l9-2" />
  </svg>
);

export const IconEye = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconMic = ({ muted, ...p }: IconProps & { muted?: boolean }) => (
  <svg {...base(p)}>
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
    <path d="M4 4l16 16" opacity={muted ? 1 : 0} />
  </svg>
);

export const IconCamera = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="6" width="12" height="12" rx="2" />
    <path d="m15 10.5 6-3.5v10l-6-3.5" />
  </svg>
);

export const IconScreen = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
    <path d="M12 13V7.5M9.5 9.5 12 7l2.5 2.5" />
  </svg>
);

export const IconExpand = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M14 4h6v6M10 20H4v-6M20 4l-6.5 6.5M4 20l6.5-6.5" />
  </svg>
);

export const IconCollapse = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M20 10h-6V4M4 14h6v6M14 10l6-6M10 14l-6 6" />
  </svg>
);

export const IconLocate = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </svg>
);

export const IconDesk = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 9h18M5 9v10M19 9v10M8.5 9V5.5h7V9" />
  </svg>
);

export const IconDiamond = ({ size = 16, color = "#FFD23F", ...rest }: IconProps) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden {...rest}>
    <path d="M12 3l5 9-5 9-5-9z" fill={color} />
  </svg>
);

export const IconSearch = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </svg>
);

export const IconNoEntry = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M5.6 5.6l12.8 12.8" />
  </svg>
);

export const IconPlus = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2.2, ...p })}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconMinus = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2.2, ...p })}>
    <path d="M5 12h14" />
  </svg>
);

export const IconShuffle = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
  </svg>
);

export const IconClose = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const IconArrowRight = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2.4, ...p })}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const IconArrowLeft = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2.4, ...p })}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </svg>
);

export const IconUp = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

export const IconRotate = (p: IconProps) => (
  <svg {...base({ strokeWidth: 2, ...p })}>
    <path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5" />
  </svg>
);

export const Logo = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 30 30" aria-hidden>
    <circle cx="15" cy="15" r="8" fill="none" stroke="#22E3FF" strokeWidth="2" />
    <ellipse cx="15" cy="15" rx="14" ry="5" fill="none" stroke="#FF3D9A" strokeWidth="2" transform="rotate(-24 15 15)" />
    <circle cx="26.5" cy="10" r="2.4" fill="#B6FF3B" />
  </svg>
);
