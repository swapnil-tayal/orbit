import { useEffect, useMemo, useRef, useState } from "react";
import { unitCentre, unitIdFor, type PublicUser, type UnitId } from "@orbit/shared";
import { api } from "../../net/api.ts";
import { useSession } from "../../state/session.ts";
import { toast } from "../../state/ui.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { Button, CONTROL_BOTTOM, Eyebrow, GLASS_CONTROL } from "../../ui/primitives.tsx";
import { IconLocate, IconMinus, IconPlus, IconSearch } from "../../ui/Icons.tsx";
import { GlobeCanvas } from "../../world/globe/GlobeCanvas.tsx";
import { Anchor, GlobeOverlay } from "../../world/globe/Overlay.tsx";
import { useGlobe } from "../../world/globe/handle.ts";
import { loadLand } from "../../world/globe/land.ts";
import { H_ORBIT, LOG_H_MIN, LOG_H_ORBIT } from "../../world/globe/constants.ts";
import { formatLocalTime, guessFromTimezone, loadPlaces, nearestPlace, searchPlaces, type Place } from "./places.ts";

export interface LocationStepProps {
  initialUnit: UnitId | null;
  stepLabel?: string;
  onConfirm: (unitId: UnitId) => void;
  onBack?: () => void;
}

interface Selection {
  unitId: UnitId;
  lat: number;
  lng: number;
  tz: string | null;
}

export function LocationStep({ initialUnit, stepLabel = "Step 2 of 3", onConfirm, onBack }: LocationStepProps) {
  const globe = useGlobe();
  const draft = useSession((s) => s.draft);
  const [places, setPlaces] = useState<Place[] | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [residents, setResidents] = useState<PublicUser[]>([]);
  const [locating, setLocating] = useState(false);
  const [zoomLog, setZoomLog] = useState(LOG_H_ORBIT);
  const [clock, setClock] = useState(() => new Date());
  const initialised = useRef(false);

  useEffect(() => {
    void loadPlaces().then(setPlaces);
    void loadLand();
    const t = window.setInterval(() => setClock(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!globe) return;
    return globe.subscribe((f) => {
      const v = f.pose.logH;
      setZoomLog((prev) => (Math.abs(prev - v) > 0.01 ? v : prev));
    });
  }, [globe]);

  const select = (lat: number, lng: number, animate = true) => {
    const unitId = unitIdFor(lat, lng);
    const c = unitCentre(unitId);
    const tz = places ? (nearestPlace(places, c.lat, c.lng)?.tz ?? null) : null;
    setSelected({ unitId, lat: c.lat, lng: c.lng, tz });
    if (globe) {
      if (animate) void globe.flyTo(c, { h: 60, ms: 900 });
      else globe.jumpTo(c, 60);
      globe.setHighlights([{ unitId, color: 0xff3d9a, opacity: 0.5, pulse: true }]);
      globe.setPoints([{ id: "home", lat: c.lat, lng: c.lng }]);
    }
  };

  useEffect(() => {
    if (!globe || !places || initialised.current) return;
    initialised.current = true;
    if (initialUnit) {
      const c = unitCentre(initialUnit);
      select(c.lat, c.lng, false);
      globe.jumpTo(c, H_ORBIT);
      return;
    }
    const guess = guessFromTimezone(places);
    globe.jumpTo(guess ? { lat: guess.lat, lng: guess.lng } : { lat: 20, lng: 20 }, H_ORBIT);
  }, [globe, places, initialUnit]);

  useEffect(() => {
    if (!selected) {
      setResidents([]);
      return;
    }
    let alive = true;
    api
      .unit(selected.unitId)
      .then((u) => {
        if (!alive) return;
        setResidents(u.residents);
        if (!u.habitable) toast("No homes on water or desert", "error");
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [selected?.unitId]);

  useEffect(() => {
    if (!places) return;
    setResults(searchPlaces(places, query));
  }, [query, places]);

  const pick = (p: Place) => {
    setQuery(`${p.name}, ${p.country}`);
    setResults([]);
    select(p.lat, p.lng);
  };

  const locate = () => {
    if (!navigator.geolocation) {
      toast("Location is not available in this browser", "error");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setQuery("");
        select(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        const guess = places ? guessFromTimezone(places) : null;
        if (guess) {
          setQuery(`${guess.name}, ${guess.country}`);
          select(guess.lat, guess.lng);
          toast("Using your time zone as an approximate location", "info");
        } else toast("Could not get an approximate location", "error");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 },
    );
  };

  const events = useMemo(
    () => ({
      onDoubleClick: (e: { unitId: UnitId; lat: number; lng: number; land: boolean }) => {
        if (!e.land) {
          toast("No homes on water or desert", "error");
          return;
        }
        setQuery("");
        select(e.lat, e.lng);
      },
    }),
    [globe, places],
  );

  const zoomBy = (d: number) => globe?.zoomBy(d);
  const thumbTop = Math.round(((zoomLog - LOG_H_MIN) / (LOG_H_ORBIT - LOG_H_MIN)) * 46);
  const canConfirm = !!selected;
  const localTime = formatLocalTime(selected?.tz ?? null, clock);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <GlobeCanvas events={events} shiftX={0.17} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(90deg, rgba(11,11,26,0.92) 0%, rgba(11,11,26,0.55) 33%, rgba(11,11,26,0) 52%)" }} />
      <GlobeOverlay>
        {selected ? (
          <Anchor id="home">
            <div style={{ position: "absolute", left: -46, top: -28, width: 92, height: 56, borderRadius: "50%", border: "2px solid #FF3D9A", animation: "ping-wide 2s ease-out infinite" }} />
            <div style={{ position: "absolute", left: -4, top: -4, width: 8, height: 8, borderRadius: "50%", background: "#FF3D9A", boxShadow: "0 0 14px #FF3D9A" }} />
            <div style={{ position: "absolute", left: -1, top: -24, width: 2, height: 22, background: "linear-gradient(rgba(255,61,154,0), #FF3D9A)" }} />
            <div style={{ position: "absolute", left: 0, top: -30, transform: "translate(-50%, -100%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 12px", borderRadius: 14, background: "rgba(20,18,44,0.9)", border: "1px solid rgba(255,61,154,0.55)", whiteSpace: "nowrap" }}>
              <span style={{ font: "600 13px var(--font-display)" }}>Home area</span>
              <span style={{ font: "12px/16px var(--font-mono)", color: "#BDB8E6" }}>{localTime}</span>
            </div>
          </Anchor>
        ) : null}
      </GlobeOverlay>

      <div role="group" aria-label="Zoom" style={{ ...GLASS_CONTROL, position: "absolute", right: 32, bottom: CONTROL_BOTTOM, gap: 4, padding: 6 }}>        <button aria-label="Zoom out" onClick={() => zoomBy(0.6)} style={{ width: 50, height: 50, borderRadius: "50%", border: 0, background: "transparent", color: "#F4F2FF", display: "grid", placeItems: "center" }}>
          <IconMinus size={18} strokeWidth={2.2} />
        </button>
        <div style={{ width: 56, height: 3, borderRadius: 3, background: "rgba(244,242,255,0.25)", position: "relative" }}>
          <div style={{ position: "absolute", left: 51 - thumbTop, top: -3.5, width: 10, height: 10, borderRadius: "50%", background: "#F4F2FF" }} />
        </div>

        <button aria-label="Zoom in" onClick={() => zoomBy(-0.6)} disabled={zoomLog <= LOG_H_MIN + 0.02} style={{ width: 50, height: 50, borderRadius: "50%", border: 0, background: "transparent", color: zoomLog <= LOG_H_MIN + 0.02 ? "#6E6A8F" : "#F4F2FF", display: "grid", placeItems: "center" }}>
          <IconPlus size={18} strokeWidth={2.2} />
        </button>
      </div>

      <section style={{ position: "absolute", left: 48, top: 130, width: 400, display: "flex", flexDirection: "column", gap: 22, pointerEvents: "auto" }}>
        <Eyebrow>{stepLabel}</Eyebrow>
        <h1 style={{ margin: 0, font: "700 46px/50px var(--font-display)", letterSpacing: "-0.03em" }}>
          Where&apos;s <span style={{ color: "#22E3FF" }}>home?</span>
        </h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: "24px", color: "#BDB8E6" }}>
          Pick your area. People see the area — never your address or city.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
          <label htmlFor="place" style={{ fontSize: 13, fontWeight: 600, color: "#BDB8E6" }}>
            Search a place
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 10, height: 52, padding: "0 16px", borderRadius: 16, background: "rgba(20,18,44,0.9)", border: "1.5px solid #FF3D9A", boxShadow: "0 0 20px rgba(255,61,154,0.25)" }}>
            <IconSearch size={18} color="#FF3D9A" />
            <input
              id="place"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="City or town"
              autoComplete="off"
              style={{ flexGrow: 1, border: 0, outline: "none", background: "transparent", color: "#F4F2FF", font: "500 16px var(--font-ui)" }}
            />
          </div>
          {results.length > 0 ? (
            <ul style={{ position: "absolute", top: 82, left: 0, right: 0, margin: 0, padding: 6, listStyle: "none", borderRadius: 16, background: "rgba(20,18,44,0.96)", border: "1px solid rgba(190,180,255,0.16)", boxShadow: "0 20px 50px rgba(0,0,0,0.5)", zIndex: 5 }}>
              {results.map((p) => (
                <li key={`${p.name}-${p.lat}-${p.lng}`}>
                  <button onClick={() => pick(p)} style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 12px", border: 0, borderRadius: 10, background: "transparent", color: "#F4F2FF", fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    <span style={{ color: "#8A84BA", fontSize: 12 }}>
                      {p.province ? `${p.province}, ` : ""}
                      {p.country}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <button onClick={locate} disabled={locating} style={{ display: "flex", alignItems: "center", gap: 10, height: 44, padding: "0 16px", borderRadius: 14, border: 0, background: "rgba(34,227,255,0.1)", color: "#22E3FF", fontSize: 14, fontWeight: 600 }}>
            <IconLocate size={16} />
            {locating ? "Finding your area…" : "Use my approximate location"}
          </button>
          <span style={{ fontSize: 12, color: "#8A84BA" }}>Or double-click the globe.</span>
        </div>
        {selected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 30 }}>
            <div style={{ display: "flex" }}>
              {residents.slice(0, 3).map((u, i) => (
                <div key={u.id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                  <Avatar spec={u.avatar} size={30} presence={u.presence} />
                </div>
              ))}
            </div>
            <span style={{ fontSize: 14, color: "#BDB8E6" }}>
              {residents.length > 0 ? (
                <>
                  <span style={{ color: "#B6FF3B", fontWeight: 700 }}>
                    {residents.length} {residents.length === 1 ? "person" : "people"}
                  </span>{" "}
                  already {residents.length === 1 ? "lives" : "live"} here
                </>
              ) : (
                <>You&apos;d be the first one here</>
              )}
            </span>
          </div>
        ) : (
          <div style={{ minHeight: 30, fontSize: 14, color: "#8A84BA" }}>Pick an area to see who lives there.</div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          {onBack ? (
            <Button variant="secondary" height={56} onClick={onBack}>
              Back
            </Button>
          ) : null}
          <Button height={56} grow disabled={!canConfirm} onClick={() => selected && onConfirm(selected.unitId)}>
            Set as home
          </Button>
        </div>
      </section>
    </div>
  );
}
