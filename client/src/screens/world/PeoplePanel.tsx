import { useEffect, useMemo, useState } from "react";
import type { PublicUser, UnitId } from "@orbit/shared";
import { useSession, serverNow } from "../../state/session.ts";
import { useWorld } from "../../state/world.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { IconClose, IconEye, IconSearch } from "../../ui/Icons.tsx";
import { useUI } from "../../state/ui.ts";

type Filter = "all" | "online" | "traveling" | "offline";

export function PeoplePanel({ onPeek }: { onPeek: (unitId: UnitId) => void }) {
  const users = useWorld((s) => s.users);
  const offices = useWorld((s) => s.offices);
  const destinations = useWorld((s) => s.destinations);
  const me = useSession((s) => s.me);
  const setSheet = useUI((s) => s.setSheet);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [, tick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => tick((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  const list = useMemo(() => {
    const all = Object.values(users);
    const q = query.trim().toLowerCase();
    return all
      .filter((u) => (filter === "all" ? true : u.presence === filter))
      .filter((u) => (q ? u.name.toLowerCase().includes(q) : true))
      .sort((a, b) => {
        const r = (p: PublicUser["presence"]) => (p === "online" ? 0 : p === "traveling" ? 1 : 2);
        return (a.id === me?.id ? -1 : 0) - (b.id === me?.id ? -1 : 0) || r(a.presence) - r(b.presence) || a.name.localeCompare(b.name);
      });
  }, [users, me?.id, query, filter]);

  const counts = {
    online: Object.values(users).filter((u) => u.presence === "online").length,
    traveling: Object.values(users).filter((u) => u.presence === "traveling").length,
    offline: Object.values(users).filter((u) => u.presence === "offline").length,
  };

  const placeOf = (u: PublicUser) => {
    if (!u.currentUnit) return "";
    const d = destinations.find((x) => x.unitId === u.currentUnit);
    if (d) return d.name;
    if (u.spaceId === `home:${u.id}`) return u.id === me?.id ? "home" : "their home";
    if (u.id !== me?.id && u.currentUnit === me?.currentUnit && u.spaceId === me?.spaceId) return "with you";
    if (u.spaceId?.startsWith("home:")) return `${users[u.spaceId.slice(5)]?.name ?? "someone"}'s home`;
    return offices[u.currentUnit]?.name ?? "an office";
  };

  const statusOf = (u: PublicUser) => {
    if (u.presence === "traveling" && u.travel) {
      const left = Math.max(0, u.travel.startedAt + u.travel.durationMs - serverNow());
      const s = Math.ceil(left / 1000);
      return { text: `${u.travel.mode === "flight" ? "Flying" : "Driving"} to ${u.travel.toName}`, color: "#22E3FF", trailing: `0:${String(s).padStart(2, "0")}` };
    }
    if (u.presence === "offline") return { text: "Offline · home desk", color: "#8A84BA", trailing: "" };
    if (u.seated) return { text: u.id === me?.id ? `At your desk · ${placeOf(u)}` : `At their desk · ${placeOf(u)}`, color: "#BDB8E6", trailing: "" };
    return { text: `Around · ${placeOf(u)}`, color: "#BDB8E6", trailing: "" };
  };

  const chip = (key: Filter, label: string, n: number, activeBg: string, activeColor: string) => {
    const active = filter === key;
    return (
      <button key={key} onClick={() => setFilter(active ? "all" : key)} style={{ padding: "6px 12px", borderRadius: 999, border: 0, fontSize: 12, fontWeight: 700, background: active ? activeBg : "rgba(190,180,255,0.08)", color: active ? activeColor : "#BDB8E6" }}>
        {label} {n}
      </button>
    );
  };

  return (
    <aside aria-label="People" style={{ position: "absolute", right: 32, top: 96, bottom: 110, width: 400, display: "flex", flexDirection: "column", gap: 14, padding: 22, borderRadius: 30, background: "rgba(20,18,44,0.92)", border: "1px solid rgba(190,180,255,0.16)", boxShadow: "0 30px 80px rgba(0,0,0,0.6)", backdropFilter: "blur(18px)", zIndex: 18, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ font: "700 26px/30px var(--font-display)" }}>People</span>
        <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ font: "700 13px var(--font-mono)", color: "#8A84BA" }}>{Object.keys(users).length}</span>
          <button aria-label="Close people" onClick={() => setSheet("none")} style={{ width: 36, height: 36, borderRadius: "50%", border: 0, background: "rgba(190,180,255,0.1)", color: "#BDB8E6", display: "grid", placeItems: "center", cursor: "pointer" }}>
            <IconClose size={16} />
          </button>
        </span>
      </div>
      <label htmlFor="ppl" className="hidden-label">
        Find someone
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, height: 46, padding: "0 14px", borderRadius: 14, background: "rgba(190,180,255,0.07)" }}>
        <IconSearch size={16} color="#BDB8E6" />
        <input id="ppl" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find someone" style={{ flexGrow: 1, border: 0, outline: "none", background: "transparent", color: "#F4F2FF", font: "400 14px var(--font-ui)" }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        {chip("online", "Online", counts.online, "#B6FF3B", "#0B0B1A")}
        {chip("traveling", "Traveling", counts.traveling, "rgba(34,227,255,0.14)", "#22E3FF")}
        {chip("offline", "Offline", counts.offline, "rgba(190,180,255,0.2)", "#F4F2FF")}
      </div>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4, overflow: "auto" }}>
        {list.map((u) => {
          const st = statusOf(u);
          const peekable = !!u.currentUnit && u.presence !== "traveling" && u.id !== me?.id;
          return (
            <li key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 10, borderRadius: 16 }}>
              <Avatar spec={u.avatar} size={36} presence={u.presence} you={u.id === me?.id} />
              <span style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: u.presence === "offline" ? "#BDB8E6" : "#F4F2FF" }}>{u.id === me?.id ? "You" : u.name}</span>
                <span style={{ fontSize: 12, color: st.color, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{st.text}</span>
              </span>
              {st.trailing ? <span style={{ font: "700 12px var(--font-mono)", color: "#22E3FF" }}>{st.trailing}</span> : null}
              {peekable ? (
                <button aria-label={`Peek at ${u.name}'s area`} onClick={() => onPeek(u.currentUnit!)} style={{ width: 38, height: 38, borderRadius: "50%", border: 0, background: "rgba(255,210,63,0.16)", color: "#FFD23F", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <IconEye size={16} />
                </button>
              ) : null}
            </li>
          );
        })}
        {list.length === 0 ? <li style={{ padding: 10, fontSize: 13, color: "#8A84BA" }}>Nobody matches.</li> : null}
      </ul>
    </aside>
  );
}
