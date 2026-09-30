import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { haversineKm, unitCentre, unitIdFor, type UnitId } from "@orbit/shared";
import { useSession } from "../../state/session.ts";
import { useWorld } from "../../state/world.ts";
import { useSpace } from "../../state/space.ts";
import { useUI, toast } from "../../state/ui.ts";
import { useView } from "../../state/view.ts";
import { requestTravel, sendArrived } from "../../net/socket.ts";
import { GlobeCanvas } from "../../world/globe/GlobeCanvas.tsx";
import { GlobeOverlay } from "../../world/globe/Overlay.tsx";
import { useGlobe } from "../../world/globe/handle.ts";
import type { GlobeEvents } from "../../world/globe/GlobeScene.ts";
import { H_MIN } from "../../world/globe/constants.ts";
import { GlobeMarkers } from "./GlobeMarkers.tsx";
import { DebugLandmarks } from "./DebugLandmarks.tsx";
import { GlobeHud } from "./GlobeHud.tsx";
import { PeekAside } from "./PeekAside.tsx";
import { PeoplePanel } from "./PeoplePanel.tsx";
import { ProfileSheet } from "./ProfileSheet.tsx";
import { OfficesSheet } from "./OfficesSheet.tsx";
import { TravelSheet } from "./TravelSheet.tsx";
import { TripHud } from "./TripHud.tsx";
import { useUnitMarkers } from "./useMarkers.ts";
import { SpaceView } from "../space/SpaceView.tsx";

export function WorldScreen() {
  const me = useSession((s) => s.me);
  const globe = useGlobe();
  const view = useUI((s) => s.view);
  const setView = useUI((s) => s.setView);
  const sheet = useUI((s) => s.sheet);
  const setSheet = useUI((s) => s.setSheet);
  const peekUnit = useUI((s) => s.peekUnit);
  const setPeekUnit = useUI((s) => s.setPeekUnit);
  const setTravelTarget = useUI((s) => s.setTravelTarget);
  const level = useView((s) => s.level);
  const centreUnit = useView((s) => s.centreUnit);
  const offices = useWorld((s) => s.offices);
  const users = useWorld((s) => s.users);
  const destinations = useWorld((s) => s.destinations);
  const snapshot = useSpace((s) => s.snapshot);
  const { markers } = useUnitMarkers();
  const [arrivalFade, setArrivalFade] = useState(0);
  const travelingRef = useRef<string | null>(null);
  const [wantDeskMode, setWantDeskMode] = useState(false);

  const myUnit = me?.currentUnit ?? null;
  const focusUnit = level === "unit" ? (peekUnit ?? centreUnit) : peekUnit;
  const peeking = !!me && level === "unit" && !!focusUnit && focusUnit !== myUnit && me.presence !== "traveling";
  const showPeek = view === "globe" && !!focusUnit && level === "unit" && !me?.travel && sheet !== "travel";

  const initialised = useRef(false);
  useEffect(() => {
    if (!globe || !myUnit || initialised.current) return;
    initialised.current = true;
    globe.jumpTo(unitCentre(myUnit), 12000);
  }, [globe, myUnit]);

  useEffect(() => {
    if (!globe) return;
    return globe.subscribe((f) => {
      const v = useView.getState();
      if (Math.abs(v.zoomLog - f.pose.logH) > 0.01) v.setZoomLog(f.pose.logH);
      if (f.farSide !== v.farSide) v.setFarSide(f.farSide);
      if (f.level === "unit") {
        const u = unitIdFor(f.pose.lat, f.pose.lng);
        if (u !== v.centreUnit) v.setCentreUnit(u);
      } else if (v.centreUnit) v.setCentreUnit(null);
    });
  }, [globe]);

  useEffect(() => {
    if (!globe) return;
    const list = markers.filter((m) => m.users.length > 0 && !m.destination).map((m) => ({ unitId: m.unitId, color: 0xb6ff3b, opacity: 0.3 }));
    for (const m of markers) if (m.destination) list.push({ unitId: m.unitId, color: 0xffd23f, opacity: 0.3 });
    if (me?.homeUnit) list.push({ unitId: me.homeUnit, color: 0xff3d9a, opacity: 0.5, pulse: true } as never);
    if (focusUnit) list.push({ unitId: focusUnit, color: 0xffd23f, opacity: 0.45, pulse: true } as never);
    globe.setHighlights(list);
  }, [globe, markers, me?.homeUnit, focusUnit]);

  const peek = useCallback(
    (unitId: UnitId) => {
      if (!globe) return;
      setPeekUnit(unitId);
      setSheet("none");
      void globe.flyTo(unitCentre(unitId), { h: H_MIN, ms: 900 });
    },
    [globe, setPeekUnit, setSheet],
  );

  const backToMe = useCallback(() => {
    if (!globe || !myUnit) return;
    setPeekUnit(null);
    void globe.flyTo(unitCentre(myUnit), { h: H_MIN, ms: 900 });
  }, [globe, myUnit, setPeekUnit]);

  const enterSpace = useCallback(() => {
    if (!snapshot) {
      toast("Your space is still loading", "info");
      return;
    }
    setSheet("none");
    setPeekUnit(null);
    setView("space");
    globe?.pause();
  }, [snapshot, setSheet, setPeekUnit, setView, globe]);

  const enterOnReady = useUI((s) => s.enterOnReady);
  useEffect(() => {
    if (!enterOnReady || !snapshot || !me || snapshot.id !== me.spaceId) return;
    useUI.getState().setEnterOnReady(false);
    enterSpace();
  }, [enterOnReady, snapshot, me, enterSpace]);

  const leaveSpace = useCallback(() => {
    if (!globe || !myUnit) return;
    setView("globe");
    globe.resume();
    globe.jumpTo(unitCentre(myUnit), H_MIN);
    setPeekUnit(null);
  }, [globe, myUnit, setView, setPeekUnit]);

  const moveWithinUnit = useCallback(
    async (to: { homeOf: string } | { unitId: UnitId }) => {
      const res = await requestTravel({ mode: "car", to });
      if (!res.ok) toast("Could not move there", "error");
    },
    [],
  );

  const travelTo = useCallback(
    (unitId: UnitId, homeOf?: string | null) => {
      if (!me) return;
      const dest = destinations.find((d) => d.unitId === unitId) ?? null;
      const office = offices[unitId] ?? null;
      const owner = homeOf ? users[homeOf] : null;
      if (unitId === myUnit) {
        if (homeOf) void moveWithinUnit({ homeOf });
        else if (office) void moveWithinUnit({ unitId });
        return;
      }
      if (homeOf && owner) {
        setTravelTarget({ unitId, destId: null, homeOf, name: homeOf === me.id ? "Home" : `${owner.name}'s home` });
        setSheet("travel");
        return;
      }
      if (!dest && !office) {
        if (unitId === me.homeUnit) {
          setTravelTarget({ unitId, destId: null, homeOf: me.id, name: "Home" });
          setSheet("travel");
          return;
        }
        toast("No spaces here", "error");
        return;
      }
      setTravelTarget({ unitId, destId: dest?.id ?? null, homeOf: null, name: dest ? dest.name : office!.name });
      setSheet("travel");
    },
    [me, myUnit, destinations, offices, users, setTravelTarget, setSheet, moveWithinUnit],
  );

  const goHome = useCallback(() => {
    if (!me?.homeUnit) return;
    if (useUI.getState().sheet === "travel") setSheet("none");
    const atHome = me.spaceId === `home:${me.id}`;
    if (atHome) {
      if (view === "space") return;
      backToMe();
      return;
    }
    travelTo(me.homeUnit, me.id);
  }, [me?.homeUnit, me?.spaceId, me?.id, view, backToMe, travelTo, setSheet]);

  const hasOffices = Object.keys(offices).length > 0;

  // The Offices button lists every office except the one you are in; picking one flies there.
  const goOffice = useCallback(() => {
    const ui = useUI.getState();
    ui.setSheet(ui.sheet === "offices" ? "none" : "offices");
  }, []);

  const pickOffice = useCallback(
    (unitId: UnitId) => {
      setSheet("none");
      if (!me) return;
      if (me.currentUnit === unitId) {
        if (view === "space") return;
        backToMe();
        return;
      }
      if (view === "space") {
        setView("globe");
        globe?.resume();
      }
      peek(unitId);
    },
    [me, view, backToMe, peek, setSheet, setView, globe],
  );

  useEffect(() => {
    const travel = me?.travel;
    if (!globe || !travel || travelingRef.current === travel.id) return;
    travelingRef.current = travel.id;
    setSheet("none");
    setPeekUnit(null);
    if (view === "space") {
      setView("globe");
      globe.resume();
    }
    const spec = { id: travel.id, from: unitCentre(travel.fromUnit), to: unitCentre(travel.toUnit), mode: travel.mode, startedAt: travel.startedAt, durationMs: travel.durationMs, distanceKm: travel.distanceKm };
    void globe.followTrip(spec, travel.toUnit).then(() => {
      sendArrived(travel.id);
      setArrivalFade(1);
      window.setTimeout(() => {
        setView("space");
        globe.pause();
        window.setTimeout(() => setArrivalFade(0), 400);
      }, 250);
    });
  }, [globe, me?.travel?.id]);

  useEffect(() => {
    if (!me?.travel) travelingRef.current = null;
  }, [me?.travel]);

  const events = useMemo<GlobeEvents>(
    () => ({
      onLevel: (l) => useView.getState().setLevel(l),
      onDoubleClick: (e) => {
        if (!e.land) {
          toast("No spaces here", "error");
          return;
        }
        peek(e.unitId);
      },
      onInteract: () => {
        if (useUI.getState().peekUnit) useUI.getState().setPeekUnit(null);
      },
      onArrivalDive: (p) => setArrivalFade(p),
    }),
    [peek],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const ui = useUI.getState();
      if (e.key === "Escape") {
        if (ui.sheet !== "none") ui.setSheet("none");
        else if (ui.view === "space") leaveSpace();
        else if (peeking) backToMe();
        else globe?.zoomBy(1.2);
        return;
      }
      if (ui.sheet === "travel") return;
      if (e.key === "t" || e.key === "T") {
        if (ui.view === "globe" && focusUnit && focusUnit !== myUnit) travelTo(focusUnit);
      } else if (e.key === "h" || e.key === "H") {
        goHome();
      } else if (e.key === "o" || e.key === "O") {
        goOffice();
      } else if (e.key === "Enter") {
        if (ui.view === "globe" && focusUnit && focusUnit === myUnit && level === "unit") enterSpace();
      } else if (e.key === "p" || e.key === "P") {
        ui.setSheet(ui.sheet === "people" ? "none" : "people");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [globe, peeking, focusUnit, myUnit, level, backToMe, travelTo, goHome, goOffice, enterSpace, leaveSpace]);

  if (!me) return null;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0B0B1A" }}>
      <div style={{ position: "absolute", inset: 0, display: view === "globe" ? "block" : "none" }}>
        <GlobeCanvas events={events} />
        <GlobeOverlay>
          <GlobeMarkers onPeek={peek} />
        </GlobeOverlay>
        {import.meta.env.DEV ? <DebugLandmarks /> : null}
        {!me.travel ? <GlobeHud peeking={peeking} onBackToMe={backToMe} onHome={me.homeUnit ? goHome : undefined} onOffice={hasOffices ? goOffice : undefined} /> : null}
        {showPeek ? <PeekAside unitId={focusUnit!} onClose={backToMe} onTravel={(homeOf) => travelTo(focusUnit!, homeOf)} onEnter={enterSpace} /> : null}
        {sheet === "people" && !me.travel ? <PeoplePanel onPeek={peek} /> : null}
        {sheet === "travel" ? <TravelSheet onDepart={() => undefined} /> : null}
        {me.travel ? <TripHud travel={me.travel} /> : null}
      </div>
      {view === "space" ? <SpaceView onLeave={leaveSpace} onHome={me.homeUnit ? goHome : undefined} onOffice={hasOffices ? goOffice : undefined} onTravel={travelTo} onPeek={peek} wantDeskMode={wantDeskMode} onDeskModeHandled={() => setWantDeskMode(false)} /> : null}
      {sheet === "offices" && !me.travel ? <OfficesSheet onPick={pickOffice} /> : null}
      {sheet === "profile" ? (
        <ProfileSheet />
      ) : null}
      {arrivalFade > 0 ? <div style={{ position: "absolute", inset: 0, background: "#0B0B1A", opacity: Math.min(1, arrivalFade), pointerEvents: "none", zIndex: 50, transition: "opacity 300ms" }} /> : null}
    </div>
  );
}
