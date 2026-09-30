import { useMemo } from "react";
import { haversineKm, unitCentre, type UnitId } from "@orbit/shared";
import { useSession } from "../../state/session.ts";
import { useWorld, usersInUnit } from "../../state/world.ts";
import { useSpace } from "../../state/space.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { Button, CONTROL_BOTTOM, Keycap } from "../../ui/primitives.tsx";
import { IconClose } from "../../ui/Icons.tsx";
import { useLocalTimeOf } from "./GlobeHud.tsx";

export interface PeekAsideProps {
  unitId: UnitId;
  onClose: () => void;
  onTravel: (homeOf?: string | null) => void;
  onEnter: () => void;
}

export function PeekAside({ unitId, onClose, onTravel, onEnter }: PeekAsideProps) {
  const me = useSession((s) => s.me);
  const users = useWorld((s) => s.users);
  const offices = useWorld((s) => s.offices);
  const destinations = useWorld((s) => s.destinations);
  const zones = useSpace((s) => s.zones);
  const people = useMemo(() => usersInUnit(users, unitId).sort((a, b) => (a.presence === "online" ? 0 : 1) - (b.presence === "online" ? 0 : 1)), [users, unitId]);
  const residents = useMemo(() => Object.values(users).filter((u) => u.homeUnit === unitId), [users, unitId]);
  const workers = useMemo(() => Object.values(users).filter((u) => u.officeUnit === unitId), [users, unitId]);
  const destination = destinations.find((d) => d.unitId === unitId) ?? null;
  const office = offices[unitId] ?? null;
  const isHome = me?.homeUnit === unitId;
  const otherResident = residents.find((u) => u.id !== me?.id && u.presence === "online") ?? residents.find((u) => u.id !== me?.id) ?? null;
  const homeArea = !office && !destination;
  const homeOwner = isHome ? me : otherResident;
  const name = destination ? destination.name : office ? office.name : homeOwner ? homeOwner.name : "Empty area";
  const isMine = me?.currentUnit === unitId;
  const inMyHome = me?.spaceId === `home:${me?.id}`;
  const switchLabel = isMine && isHome && office ? (inMyHome ? `Go to ${office.name}` : "Go home") : null;
  const km = me?.currentUnit ? Math.round(haversineKm(unitCentre(me.currentUnit), unitCentre(unitId))) : null;
  const localTime = useLocalTimeOf(unitId);
  const online = people.filter((u) => u.presence === "online").length;
  const travelHomeOf = !office && !destination ? (isHome ? (me?.id ?? null) : (otherResident?.id ?? null)) : null;
  const canTravel = !isMine && (!!office || !!destination || !!travelHomeOf) && me?.presence !== "traveling";
  const travelLabel = travelHomeOf ? (isHome ? "Go home" : `Visit ${otherResident?.name ?? "their"}'s home`) : "Travel here";

  const statusOf = (u: (typeof people)[number]) => {
    if (u.presence === "offline") return u.homeUnit ? "Offline · home desk" : "Offline · office desk";
    if (u.presence === "traveling") return `Traveling to ${u.travel?.toName ?? "somewhere"}`;
    if (u.seated) return u.id === me?.id ? "At your desk" : "At their desk";
    const inZone = Object.entries(zones).find(([, z]) => z.members.includes(u.id));
    if (inZone && inZone[0].startsWith("meet:")) return "Talking in the meeting area";
    if (inZone && inZone[0].startsWith("circle:")) return "Around a circle";
    return destination ? "On the island" : "Walking around";
  };

  return (
    <aside aria-label="About this area" style={{ position: "absolute", left: 32, bottom: CONTROL_BOTTOM, width: 340, display: "flex", flexDirection: "column", gap: 18, padding: 24, borderRadius: 28, background: "rgba(20,18,44,0.9)", border: "1px solid rgba(190,180,255,0.16)", boxShadow: "0 30px 80px rgba(0,0,0,0.55)", backdropFilter: "blur(18px)", zIndex: 18, maxHeight: "calc(100% - 200px)", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "700 11px/14px var(--font-mono)", letterSpacing: "0.1em", color: destination ? "#FFD23F" : "#FFD23F" }}>
            {homeArea && homeOwner ? "HOME" : "AREA"}{km !== null && !isMine ? ` · ${km.toLocaleString()} KM` : isMine ? " · YOU ARE HERE" : ""}
          </span>
          <h1 style={{ margin: 0, font: "700 30px/34px var(--font-display)", letterSpacing: "-0.03em" }}>{name}</h1>
          {destination ? <span style={{ fontSize: 12, color: "#BDB8E6" }}>shared · nobody owns it</span> : null}
          {homeArea && localTime ? <span style={{ font: "500 13px/18px var(--font-mono)", color: "#BDB8E6" }}>{localTime} local time</span> : null}
        </div>
        <button aria-label="Close" onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", border: 0, background: "rgba(190,180,255,0.1)", color: "#BDB8E6", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <IconClose size={16} />
        </button>
      </div>
      {homeArea ? null : (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: 12, borderRadius: 16, background: "rgba(182,255,59,0.12)" }}>
          <span style={{ font: "700 24px/28px var(--font-display)", color: "#B6FF3B" }}>{online}</span>
          <span style={{ fontSize: 12, color: "#BDB8E6" }}>online</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: 12, borderRadius: 16, background: "rgba(190,180,255,0.08)" }}>
          <span style={{ font: "700 24px/28px var(--font-display)" }}>{destination ? people.length : office ? workers.length : residents.length}</span>
          <span style={{ fontSize: 12, color: "#BDB8E6" }}>{destination ? "here now" : office ? (workers.length === 1 ? "works here" : "work here") : residents.length === 1 ? "lives here" : "live here"}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: 12, borderRadius: 16, background: "rgba(34,227,255,0.1)" }}>
          <span style={{ font: "700 18px/28px var(--font-mono)", color: "#22E3FF" }}>{localTime.replace(/\s?(AM|PM)$/i, "") || "—"}</span>
          <span style={{ fontSize: 12, color: "#BDB8E6" }}>local {/PM$/i.test(localTime) ? "PM" : /AM$/i.test(localTime) ? "AM" : ""}</span>
        </div>
      </div>
      )}
      {people.length > 0 ? (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 4 }}>
          {people.slice(0, 6).map((u, i) => (
            <li key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, borderRadius: 14, background: i === 0 ? "rgba(190,180,255,0.06)" : "transparent" }}>
              <Avatar spec={u.avatar} size={34} presence={u.presence} you={u.id === me?.id} />
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{u.id === me?.id ? "You" : u.name}</span>
                <span style={{ fontSize: 12, color: "#BDB8E6" }}>{statusOf(u)}</span>
              </span>
            </li>
          ))}
          {people.length > 6 ? <li style={{ fontSize: 12, color: "#8A84BA", padding: "4px 8px" }}>+{people.length - 6} more</li> : null}
        </ul>
      ) : (
        <p style={{ margin: 0, fontSize: 13, color: "#8A84BA" }}>{office || destination ? "Nobody here right now." : "Nobody lives here yet."}</p>
      )}
      {isMine ? (
        <Button height={56} onClick={onEnter}>
          {destination ? "Walk onto the island" : homeArea ? (inMyHome ? "Walk into your home" : "Walk into the home") : "Walk into the office"} <Keycap>↵</Keycap>
        </Button>
      ) : null}
      {switchLabel ? (
        <Button variant="secondary" height={48} onClick={() => onTravel(inMyHome ? null : (me?.id ?? null))}>
          {switchLabel}
        </Button>
      ) : null}
      {isMine ? null : canTravel ? (
        <Button height={56} onClick={() => onTravel(travelHomeOf)}>
          {travelLabel} <Keycap>T</Keycap>
        </Button>
      ) : me?.presence === "traveling" && (office || destination || otherResident) ? (
        <Button height={56} disabled>
          You are traveling
        </Button>
      ) : null}
    </aside>
  );
}
