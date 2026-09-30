import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useGlobe } from "./handle.ts";
import type { FrameData } from "./GlobeScene.ts";

interface AnchorEntry {
  el: HTMLElement;
  offsetX: number;
  offsetY: number;
}

const anchors = new Map<string, Set<AnchorEntry>>();
const frameListeners = new Set<(f: FrameData) => void>();

export function onGlobeFrame(fn: (f: FrameData) => void): () => void {
  frameListeners.add(fn);
  return () => frameListeners.delete(fn);
}

export function GlobeOverlay({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  const globe = useGlobe();
  useEffect(() => {
    if (!globe) return;
    return globe.subscribe((f) => {
      for (const [id, set] of anchors) {
        const p = f.points.get(id);
        for (const a of set) {
          if (!p || !p.visible) {
            if (a.el.style.visibility !== "hidden") a.el.style.visibility = "hidden";
            continue;
          }
          if (a.el.style.visibility !== "visible") a.el.style.visibility = "visible";
          a.el.style.transform = `translate3d(${(p.x + a.offsetX).toFixed(1)}px, ${(p.y + a.offsetY).toFixed(1)}px, 0)`;
        }
      }
      for (const fn of frameListeners) fn(f);
    });
  }, [globe]);
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", ...style }}>
      {children}
    </div>
  );
}

export function Anchor({ id, children, offsetX = 0, offsetY = 0, zIndex, interactive }: { id: string; children: ReactNode; offsetX?: number; offsetY?: number; zIndex?: number; interactive?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const entry: AnchorEntry = { el, offsetX, offsetY };
    let set = anchors.get(id);
    if (!set) {
      set = new Set();
      anchors.set(id, set);
    }
    set.add(entry);
    return () => {
      set.delete(entry);
      if (set.size === 0 && anchors.get(id) === set) anchors.delete(id);
    };
  }, [id, offsetX, offsetY]);
  return (
    <div ref={ref} style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, visibility: "hidden", willChange: "transform", zIndex, pointerEvents: interactive ? "auto" : "none" }}>
      {children}
    </div>
  );
}
