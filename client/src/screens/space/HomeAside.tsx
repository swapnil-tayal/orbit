import type { PublicUser } from "@orbit/shared";
import { useSession } from "../../state/session.ts";
import { Avatar } from "../../ui/Avatar.tsx";

export function HomeAside({ visitors }: { visitors: PublicUser[] }) {
  const me = useSession((s) => s.me);
  if (!me) return null;
  return (
    <aside aria-label="Your desk" style={{ position: "absolute", right: 32, top: 110, width: 300, display: "flex", flexDirection: "column", gap: 16, padding: 22, borderRadius: 24, background: "rgba(20,18,44,0.88)", border: "1px solid rgba(255,61,154,0.3)", boxShadow: "0 30px 80px rgba(0,0,0,0.55)", backdropFilter: "blur(18px)", zIndex: 20 }}>
      <span style={{ font: "600 11px/14px var(--font-mono)", letterSpacing: "0.1em", color: "#FF3D9A" }}>YOUR DESK · HOME</span>
      <h1 style={{ margin: 0, font: "600 28px/32px var(--font-display)" }}>Your space</h1>
      <p style={{ margin: 0, fontSize: 14, lineHeight: "21px", color: "#BDB8E6" }}>Step inside the ring and you&apos;re together. Step out and it ends.</p>
      {visitors.map((v) => (
        <div key={v.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderRadius: 14, background: "rgba(255,61,154,0.1)", fontSize: 13 }}>
          <Avatar spec={v.avatar} size={30} presence="online" />
          {v.name} is with you
        </div>
      ))}
    </aside>
  );
}
