import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

export interface PlanViewportProps {
  planWidth: number;
  planHeight: number;
  children: ReactNode;
  style?: CSSProperties;
  offsetX?: number;
  offsetY?: number;
  padding?: number;
  paddingY?: number;
  align?: "center" | "top";
  justify?: "center" | "end";
}

export function useFitScale(planWidth: number, planHeight: number, padding = 0, paddingY = padding) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 1, h: 1 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  const scale = Math.min((box.w - padding * 2) / planWidth, (box.h - paddingY * 2) / planHeight);
  return { ref, box, scale: Number.isFinite(scale) && scale > 0 ? scale : 1 };
}

export function PlanViewport({ planWidth, planHeight, children, style, offsetX = 0, offsetY = 0, padding = 0, paddingY, align = "center", justify = "center" }: PlanViewportProps) {
  const { ref, box, scale } = useFitScale(planWidth, planHeight, padding, paddingY ?? padding);
  const left = (justify === "end" ? box.w - planWidth * scale : (box.w - planWidth * scale) / 2) + offsetX * scale;
  const top = align === "center" ? (box.h - planHeight * scale) / 2 + offsetY * scale : (paddingY ?? padding) + offsetY * scale;
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      <div style={{ position: "absolute", left, top, width: planWidth, height: planHeight, transform: `scale(${scale})`, transformOrigin: "top left" }}>{children}</div>
    </div>
  );
}
