import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { GlobeScene, type GlobeEvents } from "./GlobeScene.ts";
import { getGlobe, setGlobe } from "./handle.ts";
import { serverNow } from "../../state/session.ts";

export interface GlobeCanvasProps {
  events?: GlobeEvents;
  landing?: boolean;
  autoRotate?: boolean;
  interactive?: boolean;
  shiftX?: number;
  style?: CSSProperties;
}

export function GlobeCanvas({ events, landing = false, autoRotate = false, interactive = true, shiftX = 0, style }: GlobeCanvasProps) {
  const ref = useRef<HTMLDivElement>(null);
  const eventsRef = useRef<GlobeEvents | undefined>(events);
  eventsRef.current = events;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const proxy: GlobeEvents = {
      onClick: (e) => eventsRef.current?.onClick?.(e),
      onDoubleClick: (e) => eventsRef.current?.onDoubleClick?.(e),
      onHover: (u) => eventsRef.current?.onHover?.(u),
      onLevel: (l) => eventsRef.current?.onLevel?.(l),
      onArrivalDive: (p) => eventsRef.current?.onArrivalDive?.(p),
      onInteract: () => eventsRef.current?.onInteract?.(),
    };
    const scene = new GlobeScene(el, serverNow, proxy, reduced);
    setGlobe(scene);
    if (import.meta.env.DEV) (window as unknown as { __orbitGlobe?: GlobeScene }).__orbitGlobe = scene;
    return () => {
      setGlobe(null);
      scene.dispose();
    };
  }, []);

  useEffect(() => {
    const scene = getGlobe();
    if (!scene) return;
    scene.setLandingMode(landing);
    scene.setAutoRotate(autoRotate);
    scene.setInteractive(interactive);
  }, [landing, autoRotate, interactive]);

  useEffect(() => {
    getGlobe()?.setViewShift(shiftX, 0);
  }, [shiftX]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        backgroundImage: "url(/starfield.webp)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...style,
      }}
    />
  );
}
