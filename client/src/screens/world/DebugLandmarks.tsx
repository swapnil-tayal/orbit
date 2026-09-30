import { useEffect, useRef, useState } from "react";
import { useGlobe } from "../../world/globe/handle.ts";
import { onGlobeFrame } from "../../world/globe/Overlay.tsx";

const LANDMARKS: Array<[string, number, number]> = [
  ["Mumbai", 18.93, 72.83],
  ["Goa", 15.49, 73.82],
  ["Kanyakumari", 8.08, 77.55],
  ["Chennai", 13.08, 80.27],
  ["Vizag", 17.69, 83.3],
  ["Puri", 19.8, 85.83],
  ["Kolkata", 22.57, 88.36],
  ["Chittagong", 22.33, 91.83],
  ["Karachi", 24.8, 67.0],
  ["Delhi", 28.61, 77.21],
  ["Port Blair", 11.62, 92.72],
  ["Colombo", 6.9, 79.9],
];

export function DebugLandmarks() {
  const globe = useGlobe();
  const [on, setOn] = useState(false);
  const refs = useRef<Array<HTMLDivElement | null>>([]);
  const status = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "l" && !e.ctrlKey && !e.metaKey && !e.altKey) setOn((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!on || !globe) return;
    return onGlobeFrame((f) => {
      LANDMARKS.forEach(([, lat, lng], i) => {
        const el = refs.current[i];
        if (!el) return;
        const p = globe.projectLatLng(lat, lng, 0);
        el.style.visibility = p.visible ? "visible" : "hidden";
        el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px, 0)`;
      });
      if (status.current) {
        status.current.textContent = `v${f.version} h=${Math.round(Math.exp(f.pose.logH))}km tilt=${f.pose.tilt.toFixed(0)} focus=${f.pose.lat.toFixed(2)},${f.pose.lng.toFixed(2)} ${f.width}x${f.height} lost=${globe.isContextLost()}`;
      }
    });
  }, [on, globe]);

  if (!on) return null;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 50 }}>
      {LANDMARKS.map(([name], i) => (
        <div key={name} ref={(el) => { refs.current[i] = el; }} style={{ position: "absolute", left: 0, top: 0, visibility: "hidden", willChange: "transform" }}>
          <div style={{ position: "absolute", left: -5, top: -5, width: 10, height: 10, borderRadius: "50%", background: "#FF2D2D", border: "2px solid #fff" }} />
          <div style={{ position: "absolute", left: 8, top: -8, font: "700 11px/14px var(--font-mono)", color: "#fff", textShadow: "0 0 4px #000" }}>{name}</div>
        </div>
      ))}
      <div ref={status} style={{ position: "absolute", left: 12, bottom: 12, padding: "4px 8px", background: "rgba(0,0,0,0.7)", color: "#fff", font: "12px/16px var(--font-mono)", borderRadius: 6 }} />
    </div>
  );
}
