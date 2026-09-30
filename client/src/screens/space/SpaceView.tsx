import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CONFIG, destinationLayout, deskZoneId, homeLayout, officeLayout, parseDeskId, type DeskDef, type Position, type PublicUser, type UnitId, type ZoneDef } from "@orbit/shared";
import { useSession } from "../../state/session.ts";
import { useSpace } from "../../state/space.ts";
import { useWorld } from "../../state/world.ts";
import { useUI, toast } from "../../state/ui.ts";
import { useComm } from "../../state/comm.ts";
import { onZoneMembers, requestDeskAdd, requestDeskClaim, requestDeskRelease } from "../../net/socket.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { Dock } from "../../ui/Dock.tsx";
import { Button, CONTROL_BOTTOM, Eyebrow, Kbd, Waveform } from "../../ui/primitives.tsx";
import { IconPalm, IconUp } from "../../ui/Icons.tsx";
import { useFitScale } from "../../ui/PlanViewport.tsx";
import { DeskTag, OfficeFloor, type DeskVisual } from "../../world/space/OfficeFloor.tsx";
import { IslandFloor } from "../../world/space/IslandFloor.tsx";
import { HomeFloor } from "../../world/space/HomeFloor.tsx";
import { useMovement } from "../../world/space/useMovement.ts";
import { ProximityHud } from "./ProximityHud.tsx";
import { ScreenStage } from "./ScreenStage.tsx";
import { HomeAside } from "./HomeAside.tsx";
import { DeskModeBar, DeskModePanel } from "./DeskMode.tsx";
import { PeoplePanel } from "../world/PeoplePanel.tsx";
import { useCommSession } from "../../comm/useCommSession.ts";
import { startScreenShare, stopScreenShare } from "../../comm/media.ts";

const NO_MEMBERS: string[] = [];

export interface SpaceViewProps {
  onLeave: () => void;
  onHome?: () => void;
  onOffice?: () => void;
  onTravel: (unitId: UnitId) => void;
  onPeek: (unitId: UnitId) => void;
  wantDeskMode: boolean;
  onDeskModeHandled: () => void;
}

const CLOSEUP = 1.8;
let lastWelcomed = "";

export function SpaceView({ onLeave, onHome, onOffice, onTravel, onPeek, wantDeskMode, onDeskModeHandled }: SpaceViewProps) {
  void onTravel;
  const me = useSession((s) => s.me);
  const snapshot = useSpace((s) => s.snapshot);
  const zonesState = useSpace((s) => s.zones);
  const speaking = useSpace((s) => s.speaking);
  const myZone = useSpace((s) => s.myZone);
  const positions = useSpace((s) => s.positions);
  const memberIds = useMemo(() => Object.keys(positions), [positions]);
  const users = useWorld((s) => s.users);
  const sheet = useUI((s) => s.sheet);
  const setSheet = useUI((s) => s.setSheet);
  const muted = useComm((s) => s.muted);
  const mic = useComm((s) => s.mic);
  const setMuted = useComm((s) => s.setMuted);
  const localSpeaking = useComm((s) => s.localSpeaking);
  const [deskMode, setDeskMode] = useState(false);
  const [selectedDesk, setSelectedDesk] = useState<DeskDef | null>(null);
  const [busy, setBusy] = useState(false);
  const [closeup, setCloseup] = useState(false);
  const [exitAsk, setExitAsk] = useState(false);
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const meRef = useRef<HTMLDivElement>(null);
  // Walking back onto the entry pad leaves the space. Armed only once you have stepped off it,
  // so arriving on the pad does not bounce you straight back out.
  const exitArmed = useRef(false);
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;
  const pathRef = useRef<SVGPolylineElement>(null);
  const avatarRefs = useRef(new Map<string, HTMLDivElement>());
  const display = useRef(new Map<string, Position>());
  const camera = useRef({ x: 720, y: 450, s: 1 });
  const camInit = useRef(false);

  const layout = useMemo(() => {
    if (!snapshot) return null;
    if (snapshot.kind === "home") return homeLayout(snapshot.ownerId ?? "", snapshot.unitId);
    return snapshot.kind === "office" ? officeLayout(snapshot.unitId, snapshot.rows) : destinationLayout(snapshot.destId ?? "island", snapshot.unitId);
  }, [snapshot?.id, snapshot?.rows, snapshot?.kind, snapshot?.unitId, snapshot?.destId, snapshot?.ownerId]);

  const isHome = !!me && !!snapshot && snapshot.kind === "home" && snapshot.ownerId === me.id;
  const role: "home" | "office" = isHome ? "home" : "office";
  const myDeskId = me && snapshot ? (isHome ? me.homeDeskId : me.officeUnit === snapshot.unitId ? me.officeDeskId : null) : null;
  const initial = useMemo<Position>(() => {
    const p = snapshot?.members[me?.id ?? ""];
    if (p) return p;
    return { x: layout?.spawn.x ?? 292, y: layout?.spawn.y ?? 640, dir: 0, moving: false };
  }, [snapshot?.id]);

  const { ref: fitRef, box, scale: fitScale } = useFitScale(1440, layout?.height ?? 900, 12);
  const ownedZoneId = myDeskId ? deskZoneId(myDeskId) : null;
  const commZone = myZone ?? (me?.seated && ownedZoneId ? ownedZoneId : null);
  const commZoneState = useSpace((s) => (commZone ? s.zones[commZone] : undefined));
  useCommSession(me?.id ?? null, commZone, commZoneState?.members ?? NO_MEMBERS, users, ownedZoneId);

  const onZoneEnter = useCallback(
    (zone: ZoneDef, members: string[]) => {
      const ownerId = zone.ownerDeskId ? snapshot?.desks.find((d) => d.id === zone.ownerDeskId)?.ownerId : null;
      const owner = ownerId ? users[ownerId] : null;
      if (zone.kind === "desk") toast(`${owner?.name ?? "someone"}'s space`, "space", { accent: "You're in", ttl: CONFIG.zones.toastMs });
      else if (zone.kind === "meeting") toast("the meeting area", "space", { accent: "You joined", ttl: CONFIG.zones.toastMs });
      else toast(zone.label.toLowerCase(), "space", { accent: "You joined", ttl: CONFIG.zones.toastMs });
      useComm.getState().setConversation(members.length > 1 ? "active" : "entering");
      setCloseup(true);
    },
    [snapshot?.desks, users],
  );
  const onZoneLeave = useCallback(() => {
    useComm.getState().setConversation("idle");
  }, []);

  const movement = useMovement({
    layout: layout ?? officeLayout("0:0", 1),
    initial,
    myDeskId,
    enabled: !deskMode && sheet === "none",
    onZoneEnter,
    onZoneLeave,
  });

  useEffect(() => {
    if (!snapshot || lastWelcomed === snapshot.id) return;
    lastWelcomed = snapshot.id;
    const homeOwner = snapshot.kind === "home" ? useWorld.getState().users[snapshot.ownerId ?? ""] : null;
    if (snapshot.kind === "home" && snapshot.ownerId === useSession.getState().me?.id) toast("Visitors can join you at your desk or on the sofa", "info", { accent: "Home", ttl: 4500 });
    else if (snapshot.kind === "home") toast(`${homeOwner?.name ?? "their"}'s home`, "info", { accent: "You're visiting", ttl: 4500 });
    else toast(snapshot.kind === "dest" ? "Step into a circle to join" : "Walk to a desk to join someone", "info", { accent: "You're here", ttl: 4500 });
  }, [snapshot?.id]);

  useEffect(() => {
    if (wantDeskMode) {
      setDeskMode(true);
      onDeskModeHandled();
    }
  }, [wantDeskMode, onDeskModeHandled]);

  useEffect(() => {
    return onZoneMembers((m) => {
      if (!me) return;
      if (m.reason === "owner_left" && useSpace.getState().myZone === m.zoneId) {
        const deskId = m.zoneId.startsWith("desk:") ? m.zoneId.slice(5) : null;
        const ownerId = deskId ? snapshot?.desks.find((d) => d.id === deskId)?.ownerId : null;
        const owner = ownerId ? users[ownerId] : null;
        toast(`${owner?.name ?? "They"} stood up`, "info");
      }
      if (myDeskId && m.zoneId === deskZoneId(myDeskId)) {
        const prev = prevMyDeskMembers.current;
        const added = m.members.filter((id) => !prev.includes(id) && id !== me.id);
        for (const id of added) {
          const u = users[id];
          if (u) toast("walked over", "space", { accent: u.name, avatarUserId: id, ttl: 3500 });
        }
        prevMyDeskMembers.current = m.members;
      }
    });
  }, [me?.id, myDeskId, snapshot?.desks, users]);
  const prevMyDeskMembers = useRef<string[]>([]);

  useEffect(() => {
    if (!layout) return;
    let raf = 0;
    let last = performance.now();
    exitArmed.current = false;
    const pad = layout.spawn;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const p = movement.pos.current;
      if (meRef.current) meRef.current.style.transform = `translate(${(p.x - 22).toFixed(1)}px, ${(p.y - 22).toFixed(1)}px)`;
      const padDist = Math.hypot(p.x - pad.x, p.y - pad.y);
      if (!exitArmed.current) {
        if (padDist > pad.r + 30) exitArmed.current = true;
      } else if (padDist < pad.r) {
        exitArmed.current = false;
        setExitAsk(true);
      }
      const targets = useSpace.getState().positions;
      const k = 1 - Math.exp(-dt / (CONFIG.movement.remoteSmoothMs / 1000));
      for (const [id, el] of avatarRefs.current) {
        const t = targets[id];
        if (!t) continue;
        let d = display.current.get(id);
        if (!d) {
          d = { ...t };
          display.current.set(id, d);
        } else {
          d.x += (t.x - d.x) * k;
          d.y += (t.y - d.y) * k;
        }
        el.style.transform = `translate(${(d.x - 19).toFixed(1)}px, ${(d.y - 19).toFixed(1)}px)`;
      }
      if (pathRef.current) {
        const pts = movement.path.current;
        pathRef.current.setAttribute("points", pts.length ? [`${p.x},${p.y}`, ...pts.map((q) => `${q.x},${q.y}`)].join(" ") : "");
      }
      const cam = camera.current;
      const targetS = fitScale * (closeup ? CLOSEUP : 1);
      const tx = closeup ? p.x : 720;
      const ty = closeup ? p.y : layout.height / 2;
      const ck = camInit.current ? 1 - Math.exp(-dt / 0.25) : 1;
      camInit.current = true;
      cam.s += (targetS - cam.s) * ck;
      cam.x += (tx - cam.x) * ck;
      cam.y += (ty - cam.y) * ck;
      if (planRef.current) {
        const left = box.w / 2 - cam.x * cam.s;
        const top = box.h / 2 - cam.y * cam.s;
        planRef.current.style.transform = `translate(${left.toFixed(1)}px, ${top.toFixed(1)}px) scale(${cam.s.toFixed(4)})`;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [layout, movement, fitScale, closeup, box.w, box.h]);

  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) setCloseup(true);
      else if (closeup) setCloseup(false);
      else onLeave();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [closeup, onLeave]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (closeup || deskMode)) {
        e.stopImmediatePropagation();
        if (deskMode) {
          setDeskMode(false);
          setSelectedDesk(null);
        } else setCloseup(false);
      }
      if ((e.key === "m" || e.key === "M") && !deskMode) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
        setMuted(!useComm.getState().muted);
      }
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [closeup, deskMode, setMuted]);

  if (!me || !snapshot || !layout) return null;

  const deskInfo = new Map(snapshot.desks.map((d) => [d.id, d]));
  const deskVisuals: DeskVisual[] = layout.desks.map((desk) => {
    const info = deskInfo.get(desk.id);
    const owner = info?.ownerId ? users[info.ownerId] : null;
    const zoneId = deskZoneId(desk.id);
    const z = zonesState[zoneId];
    const insideMine = myZone === zoneId;
    if (!owner) {
      const sel = deskMode && selectedDesk?.id === desk.id;
      return { desk, state: sel ? "selected" : "free", ownerColor: "#3E3880", ring: sel ? "selected" : deskMode ? "free" : "none" };
    }
    if (owner.id === me.id) return { desk, state: "mine", ownerColor: "#FF3D9A", ring: me.seated ? "mine" : "none" };
    if (owner.presence === "offline") return { desk, state: "offline", ownerColor: "#6E6A8F", ring: "none" };
    const here = owner.spaceId === snapshot.id;
    if (here && owner.seated && z?.open !== false) {
      const targeted = !!target && Math.hypot(target.x - desk.x, target.y - desk.y) < 70;
      return { desk, state: "online", ownerColor: owner.avatar.topColor, ring: insideMine ? "inside" : targeted ? "targeted" : "open" };
    }
    return { desk, state: "away", ownerColor: owner.avatar.topColor, ring: "none" };
  });

  const meetingZone = layout.zones.find((z) => z.kind === "meeting");
  const loungeZone = layout.zones.find((z) => z.kind === "lounge");
  const zoneVisuals = [meetingZone, loungeZone].filter(Boolean).map((z) => ({ id: z!.id, kind: z!.kind as "meeting" | "lounge", active: (zonesState[z!.id]?.members.length ?? 0) > 0, members: zonesState[z!.id]?.members.length ?? 0 }));
  const circleVisuals = layout.zones.filter((z) => z.kind === "circle").map((z) => ({ key: z.id.split(":").pop() ?? "", active: (zonesState[z.id]?.members.length ?? 0) > 0, members: zonesState[z.id]?.members.length ?? 0 }));

  const membersHere = memberIds.filter((id) => id !== me.id).map((id) => users[id]).filter((u): u is PublicUser => !!u && u.presence === "online");
  const hereCount = membersHere.length + 1;
  const desksTaken = snapshot.desks.filter((d) => d.ownerId).length;
  const myZoneDef = myZone ? layout.zones.find((z) => z.id === myZone) ?? null : null;
  const myZoneOwner = myZoneDef?.ownerDeskId ? (users[deskInfo.get(myZoneDef.ownerDeskId)?.ownerId ?? ""] ?? null) : null;
  const myDeskVisitors = myDeskId ? (zonesState[deskZoneId(myDeskId)]?.members ?? []).filter((id) => id !== me.id).map((id) => users[id]).filter((u): u is PublicUser => !!u) : [];
  const homeOwnerName = snapshot.kind === "home" ? (users[snapshot.ownerId ?? ""]?.name ?? "Someone") : "";
  const officeName = useWorld.getState().offices[snapshot.unitId]?.name ?? "Office";
  const name = snapshot.kind === "dest" ? (useWorld.getState().destinations.find((d) => d.id === snapshot.destId)?.name ?? "Island") : snapshot.kind === "home" ? (isHome ? "Home" : `${homeOwnerName}'s home`) : officeName;

  const walkTo = (x: number, y: number) => {
    if (deskMode) return;
    movement.walkTo(x, y);
    setTarget({ x, y });
    window.setTimeout(() => setTarget((t) => (t && t.x === x && t.y === y ? null : t)), 6000);
  };

  const claimSelected = async () => {
    if (!selectedDesk) return;
    setBusy(true);
    const res = await requestDeskClaim({ deskId: selectedDesk.id, role });
    setBusy(false);
    if (!res.ok) {
      toast(res.code === "desk_taken" ? `Desk ${selectedDesk.number} is already taken` : res.code === "works_from_home" ? "You work from home, so office desks are not yours to claim. You can still visit." : res.code === "wrong_office" ? "You can only claim a desk in a team office" : "Could not claim the desk", "error");
      return;
    }
    if (res.released) {
      const idx = parseDeskId(res.released)?.idx;
      toast(`Desk ${idx !== undefined ? idx + 1 : ""} is freed for others`, "info");
    } else toast(`Desk ${selectedDesk.number} is yours`, "info");
    setSelectedDesk(null);
    setDeskMode(false);
    walkTo(selectedDesk.seatX, selectedDesk.seatY);
  };

  const giveUp = async () => {
    setBusy(true);
    const res = await requestDeskRelease({ role });
    setBusy(false);
    if (res.ok) toast("Your desk is free for others", "info");
    else toast("Could not release the desk", "error");
  };

  const addDesk = async () => {
    setBusy(true);
    const res = await requestDeskAdd({ unitId: snapshot.unitId });
    setBusy(false);
    if (!res.ok) toast(res.code === "office_full" ? "This office is at its maximum size" : "Could not add a desk", "error");
    else toast("A new desk appeared", "info");
  };

  const toggleShare = async () => {
    if (useComm.getState().localScreen) {
      stopScreenShare();
      return;
    }
    const res = await startScreenShare();
    if (res === "unsupported") toast("Screen sharing is not supported in this browser", "error");
    else if (res === "failed") toast("Could not share your screen", "error");
  };

  const dockActive = deskMode ? "none" : sheet === "people" ? "people" : isHome ? "home" : snapshot.kind === "office" && me.officeUnit === snapshot.unitId ? "office" : "none";

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: snapshot.kind === "dest" ? "radial-gradient(800px 560px at 55% 50%, #0E3AA8 0%, #0A1E66 45%, #0B0B1A 100%)" : isHome && closeup ? "radial-gradient(900px 620px at 50% 50%, #241545 0%, #0B0B1A 72%)" : "radial-gradient(900px 620px at 50% 50%, #1C1745 0%, #0B0B1A 72%)" }}>
      <div ref={fitRef} style={{ position: "absolute", inset: 0 }}>
        <div ref={planRef} style={{ position: "absolute", left: 0, top: 0, width: 1440, height: layout.height, transformOrigin: "0 0", willChange: "transform" }}>
          {snapshot.kind === "home" ? (
            <HomeFloor layout={layout} desks={deskVisuals} zones={zoneVisuals} showSpawnPulse onFloorClick={walkTo}>
              <FloorOverlay layout={layout} deskInfo={deskInfo} users={users} me={me} deskMode={false} selectedDesk={null} zonesState={zonesState} speaking={speaking} membersHere={membersHere} avatarRefs={avatarRefs} meRef={meRef} pathRef={pathRef} target={target} myZone={myZone} localSpeaking={localSpeaking} />
            </HomeFloor>
          ) : snapshot.kind === "office" ? (
            <OfficeFloor layout={layout} desks={deskVisuals} zones={zoneVisuals} showSpawnPulse onDeskClick={deskMode ? (d) => !deskInfo.get(d.id)?.ownerId && setSelectedDesk(d) : undefined} onFloorClick={walkTo}>
              <FloorOverlay layout={layout} deskInfo={deskInfo} users={users} me={me} deskMode={deskMode} selectedDesk={selectedDesk} zonesState={zonesState} speaking={speaking} membersHere={membersHere} avatarRefs={avatarRefs} meRef={meRef} pathRef={pathRef} target={target} myZone={myZone} localSpeaking={localSpeaking} />
            </OfficeFloor>
          ) : (
            <IslandFloor layout={layout} circles={circleVisuals} onFloorClick={walkTo}>
              <FloorOverlay layout={layout} deskInfo={deskInfo} users={users} me={me} deskMode={false} selectedDesk={null} zonesState={zonesState} speaking={speaking} membersHere={membersHere} avatarRefs={avatarRefs} meRef={meRef} pathRef={pathRef} target={target} myZone={myZone} localSpeaking={localSpeaking} />
            </IslandFloor>
          )}
        </div>
      </div>

      {exitAsk ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 30, display: "grid", placeItems: "center", background: "rgba(11,11,26,0.45)", backdropFilter: "blur(3px)" }} onClick={() => setExitAsk(false)}>
          <section role="dialog" aria-label="Leave this space?" onClick={(e) => e.stopPropagation()} style={{ width: 380, display: "flex", flexDirection: "column", gap: 14, padding: 26, borderRadius: 26, background: "rgba(20,18,44,0.96)", border: "1px solid rgba(34,227,255,0.35)", boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(34,227,255,0.15)" }}>
            <Eyebrow color="#22E3FF">At the entry</Eyebrow>
            <h2 style={{ margin: 0, font: "700 26px/30px var(--font-display)", letterSpacing: "-0.02em" }}>
              Leave <span style={{ color: snapshot.kind === "dest" ? "#FFD23F" : "#22E3FF" }}>{name}</span>?
            </h2>
            <p style={{ margin: 0, fontSize: 14, lineHeight: "21px", color: "#BDB8E6" }}>You will rise back up to the globe. Step away from the entry to stay.</p>
            <div style={{ display: "flex", gap: 10 }}>
              <Button variant="secondary" height={50} grow onClick={() => setExitAsk(false)}>
                Stay
              </Button>
              <Button height={50} grow onClick={() => { setExitAsk(false); onLeave(); }}>
                Leave
              </Button>
            </div>
          </section>
        </div>
      ) : null}
      {!deskMode ? (
        <div style={{ position: "absolute", left: 32, top: 28, display: "flex", alignItems: "center", gap: 10, padding: "7px 16px 7px 7px", borderRadius: 999, background: "rgba(20,18,44,0.8)", border: `1px solid ${snapshot.kind === "dest" ? "rgba(255,210,63,0.4)" : "rgba(190,180,255,0.16)"}`, fontSize: 13, zIndex: 21 }}>
          <button aria-label="Rise to the globe" onClick={onLeave} style={{ width: 32, height: 32, borderRadius: "50%", border: 0, background: "rgba(34,227,255,0.14)", color: "#22E3FF", display: "grid", placeItems: "center" }}>
            <IconUp size={16} strokeWidth={2} />
          </button>
          {snapshot.kind === "dest" ? <IconPalm size={16} /> : null}
          <span style={{ font: `${snapshot.kind === "dest" ? 700 : 600} ${snapshot.kind === "dest" ? 15 : 14}px var(--font-display)`, color: snapshot.kind === "dest" ? "#FFD23F" : "#F4F2FF" }}>{name}</span>
          <span style={{ color: "#BDB8E6" }}>{snapshot.kind === "dest" ? `shared · ${hereCount} here · nobody owns it` : snapshot.kind === "home" ? `${hereCount} here` : `${hereCount} here · ${desksTaken}/${snapshot.desks.length} desks`}</span>
        </div>
      ) : null}

      {!deskMode && snapshot.kind === "dest" && !myZone ? (
        <div style={{ position: "absolute", left: "50%", top: 30, transform: "translateX(-50%)", padding: "10px 18px", borderRadius: 999, background: "rgba(20,18,44,0.88)", border: "1px solid rgba(182,255,59,0.4)", fontSize: 13, color: "#BDB8E6", zIndex: 20 }}>Step into a circle to join</div>
      ) : null}

      {!deskMode ? (
        <div style={{ position: "absolute", left: 32, bottom: 36, display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: "#BDB8E6", zIndex: 20 }}>
          <span style={{ display: "flex", gap: 4 }}>
            <Kbd>W</Kbd>
            <Kbd>A</Kbd>
            <Kbd>S</Kbd>
            <Kbd>D</Kbd>
          </span>
          or click the floor
        </div>
      ) : null}

      {myZoneDef && !deskMode ? <ProximityHud zone={myZoneDef} owner={myZoneOwner} onShare={() => void toggleShare()} onMic={() => setMuted(!muted)} /> : null}
      {isHome && me.seated && !deskMode && !myZoneDef && closeup ? <HomeAside visitors={myDeskVisitors} /> : null}
      {myDeskVisitors.length > 0 && me.seated && !deskMode && !myZoneDef ? <ProximityHud zone={layout.zones.find((z) => z.id === deskZoneId(myDeskId!))!} owner={me} onShare={() => void toggleShare()} onMic={() => setMuted(!muted)} /> : null}
      {!deskMode ? <ScreenStage zoneId={commZone} /> : null}

      {deskMode && snapshot.kind === "office" ? (
        <>
          <DeskModeBar
            onDone={() => {
              setDeskMode(false);
              setSelectedDesk(null);
            }}
          />
          <DeskModePanel desks={snapshot.desks} myDeskId={myDeskId} selected={selectedDesk} canAdd={snapshot.rows < CONFIG.office.maxRows || snapshot.desks.length < snapshot.rows * CONFIG.office.desksPerRow} busy={busy} onMove={() => void claimSelected()} onKeep={() => setSelectedDesk(null)} onGiveUp={() => void giveUp()} onAdd={() => void addDesk()} onDone={() => setDeskMode(false)} />
        </>
      ) : null}

      {sheet === "people" ? <PeoplePanel onPeek={(unitId) => { setSheet("none"); onLeave(); window.setTimeout(() => onPeek(unitId), 80); }} /> : null}

      {!deskMode ? (
        <div style={{ position: "absolute", left: "50%", bottom: CONTROL_BOTTOM, transform: "translateX(-50%)", zIndex: 21 }}>
          <Dock context="space" online={Object.values(users).filter((u) => u.presence === "online").length} me={me.avatar} active={dockActive} onGlobe={onLeave} onHome={onHome} onOffice={onOffice} onPeople={() => setSheet(sheet === "people" ? "none" : "people")} onYou={() => setSheet("profile")} />
        </div>
      ) : null}
    </div>
  );
}

interface FloorOverlayProps {
  layout: ReturnType<typeof officeLayout>;
  deskInfo: Map<string, { id: string; ownerId: string | null }>;
  users: Record<string, PublicUser>;
  me: PublicUser;
  deskMode: boolean;
  selectedDesk: DeskDef | null;
  zonesState: Record<string, { open: boolean; members: string[] }>;
  speaking: Record<string, boolean>;
  membersHere: PublicUser[];
  avatarRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  meRef: React.RefObject<HTMLDivElement | null>;
  pathRef: React.RefObject<SVGPolylineElement | null>;
  target: { x: number; y: number } | null;
  myZone: string | null;
  localSpeaking: boolean;
}

function FloorOverlay({ layout, deskInfo, users, me, deskMode, selectedDesk, zonesState, speaking, membersHere, avatarRefs, meRef, pathRef, target, myZone, localSpeaking }: FloorOverlayProps) {
  const meeting = layout.zones.find((z) => z.kind === "meeting");
  const meetingMembers = meeting ? (zonesState[meeting.id]?.members ?? []) : [];
  const meetingTalking = meetingMembers.filter((id) => speaking[id]).length;
  return (
    <>
      <svg width={1440} height={layout.height} style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none", overflow: "visible" }} aria-hidden>
        <polyline ref={pathRef} fill="none" stroke="#FF3D9A" strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round">
          <animate attributeName="stroke-dashoffset" values="0;-22" dur="0.8s" repeatCount="indefinite" />
        </polyline>
        {target ? (
          <g>
            <circle cx={target.x} cy={target.y} r="9" fill="none" stroke="#FF3D9A" strokeWidth="2" />
            <circle cx={target.x} cy={target.y} r="3" fill="#FF3D9A" />
          </g>
        ) : null}
      </svg>
      {layout.desks.map((desk) => {
        const info = deskInfo.get(desk.id);
        const owner = info?.ownerId ? users[info.ownerId] : null;
        if (!owner) {
          if (deskMode) return selectedDesk?.id === desk.id ? <DeskTag key={desk.id} x={desk.x} y={desk.y} kind="selected" label={`Desk ${desk.number}`} /> : <DeskTag key={desk.id} x={desk.x} y={desk.y} kind="free" label="Free" />;
          return null;
        }
        if (owner.id === me.id) return deskMode ? <DeskTag key={desk.id} x={desk.x} y={desk.y} kind="mine" label="Your desk" /> : null;
        if (owner.presence === "offline") return <DeskTag key={desk.id} x={desk.x} y={desk.y} kind="offline" label={owner.name} />;
        const here = owner.spaceId === layout.id;
        if (here && owner.seated) return <DeskTag key={desk.id} x={desk.x} y={desk.y} kind="online" label={owner.name} dot={myZone === deskZoneId(desk.id)} />;
        const inMeeting = here && meetingMembers.includes(owner.id);
        return <DeskTag key={desk.id} x={desk.x} y={desk.y} kind={here ? "meeting" : "away"} label={here ? `${owner.name} · ${inMeeting ? "in meeting" : "around"}` : `${owner.name} · away`} />;
      })}
      {meeting && meetingMembers.length > 0 ? (
        <div style={{ position: "absolute", left: meeting.x, top: meeting.y + meeting.r + 10, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, padding: "4px 10px", borderRadius: 999, background: "rgba(20,18,44,0.9)", border: "1px solid rgba(182,255,59,0.5)", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", pointerEvents: "none" }}>
          {meetingTalking > 0 ? <Waveform width={2.5} height={12} /> : null}
          {meetingTalking > 0 ? `${meetingTalking} talking` : `${meetingMembers.length} here`}
        </div>
      ) : null}
      {layout.zones
        .filter((z) => z.kind === "circle")
        .map((z) => {
          const members = zonesState[z.id]?.members ?? [];
          const talking = members.filter((id) => speaking[id]).length;
          const quiet = members.length === 0;
          return (
            <div key={z.id} style={{ position: "absolute", left: z.x, top: z.y + z.r + 12, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 999, background: quiet ? "rgba(20,18,44,0.85)" : "rgba(20,18,44,0.9)", border: quiet ? "1px dashed rgba(155,92,255,0.7)" : "1px solid rgba(182,255,59,0.6)", color: quiet ? "#C9B2FF" : "#F4F2FF", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", pointerEvents: "none" }}>
              {talking > 0 ? <Waveform width={2.5} height={12} /> : null}
              {z.label} · {members.length}
            </div>
          );
        })}
      {membersHere.map((u) => (
        <div
          key={u.id}
          ref={(el) => {
            if (el) avatarRefs.current.set(u.id, el);
            else avatarRefs.current.delete(u.id);
          }}
          style={{ position: "absolute", left: 0, top: 0, willChange: "transform", pointerEvents: "none" }}
        >
          <Avatar spec={u.avatar} size={38} presence="online" speaking={!!speaking[u.id]} label={u.seated ? undefined : u.name} />
        </div>
      ))}
      <div ref={meRef} style={{ position: "absolute", left: 0, top: 0, willChange: "transform", pointerEvents: "none", zIndex: 2 }}>
        <Avatar spec={me.avatar} size={44} presence="online" you pulse label="You" speaking={localSpeaking} />
      </div>
    </>
  );
}
