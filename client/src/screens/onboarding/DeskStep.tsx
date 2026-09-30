import { useEffect, useMemo, useState } from "react";
import { officeLayout, type DeskDef, type DeskInfo, type PublicUser, type UnitId } from "@orbit/shared";
import { api } from "../../net/api.ts";
import { useSession } from "../../state/session.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { Button, Eyebrow } from "../../ui/primitives.tsx";
import { PlanViewport } from "../../ui/PlanViewport.tsx";
import { DeskTag, OfficeFloor, type DeskVisual } from "../../world/space/OfficeFloor.tsx";

export interface DeskStepProps {
  unitId: UnitId;
  role: "home" | "office";
  onClaim: (deskId: string | null) => void;
  onBack: () => void;
  busy?: boolean;
  stepLabel?: string;
}

export function DeskStep({ unitId, role, onClaim, onBack, busy, stepLabel }: DeskStepProps) {
  const [desks, setDesks] = useState<DeskInfo[]>([]);
  const [rows, setRows] = useState(2);
  const [users, setUsers] = useState<Record<string, PublicUser>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const draft = useSession((s) => s.draft);

  useEffect(() => {
    let alive = true;
    Promise.all([api.office(unitId), api.world()])
      .then(([o, w]) => {
        if (!alive) return;
        setDesks(o.desks);
        setRows(o.rows);
        setUsers(Object.fromEntries(w.users.map((u) => [u.id, u])));
        const firstFree = o.desks.find((d) => !d.ownerId);
        setSelected(firstFree?.id ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [unitId]);

  const layout = useMemo(() => officeLayout(unitId, rows), [unitId, rows]);
  const deskInfo = useMemo(() => new Map(desks.map((d) => [d.id, d])), [desks]);

  const visuals: DeskVisual[] = layout.desks.map((desk: DeskDef) => {
    const info = deskInfo.get(desk.id);
    const owner = info?.ownerId ? users[info.ownerId] : null;
    if (!info || !info.ownerId) {
      const isSel = desk.id === selected;
      return { desk, state: isSel ? "selected" : "free", ownerColor: "#3E3880", ring: isSel ? "selected" : "free" };
    }
    if (!owner || owner.presence === "offline") return { desk, state: "offline", ownerColor: "#6E6A8F", ring: "none" };
    const seatedHere = owner.currentUnit === unitId && owner.seated;
    if (seatedHere) return { desk, state: "online", ownerColor: owner.avatar.topColor, ring: "open" };
    return { desk, state: "away", ownerColor: owner.avatar.topColor, ring: "none" };
  });

  const freeCount = desks.filter((d) => !d.ownerId).length;
  const takenCount = desks.length - freeCount;
  const selectedDesk = layout.desks.find((d) => d.id === selected) ?? null;

  return (
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(900px 620px at 62% 50%, #1C1745 0%, #0B0B1A 72%)" }}>
      <PlanViewport planWidth={992} planHeight={layout.height - 900 + 652} offsetX={-224} offsetY={-124} padding={0} paddingY={48} justify="end" style={{ left: 446, right: 42 }}>
        <OfficeFloor layout={layout} desks={visuals} zones={[]} showSpawnPulse={false} onDeskClick={(d) => !deskInfo.get(d.id)?.ownerId && setSelected(d.id)}>
          {layout.desks.map((desk) => {
            const info = deskInfo.get(desk.id);
            const owner = info?.ownerId ? users[info.ownerId] : null;
            if (!info?.ownerId) {
              if (desk.id === selected) return <DeskTag key={desk.id} x={desk.x} y={desk.y} kind="selected" label={`Desk ${desk.number} · yours?`} />;
              return <DeskTag key={desk.id} x={desk.x} y={desk.y} kind="free" label="Free" />;
            }
            if (!owner || owner.presence === "offline") return <DeskTag key={desk.id} x={desk.x} y={desk.y} kind="offline" label={owner?.name ?? "Taken"} />;
            if (owner.currentUnit === unitId && owner.seated) return <DeskTag key={desk.id} x={desk.x} y={desk.y} kind="online" label={owner.name} />;
            return <DeskTag key={desk.id} x={desk.x} y={desk.y} kind="meeting" label={`${owner.name} · away`} />;
          })}
          {layout.desks.map((desk) => {
            const info = deskInfo.get(desk.id);
            const owner = info?.ownerId ? users[info.ownerId] : null;
            if (owner && owner.presence === "online" && owner.currentUnit === unitId && owner.seated) {
              return (
                <div key={`av-${desk.id}`} style={{ position: "absolute", left: desk.seatX - 19, top: desk.seatY - 19, pointerEvents: "none" }}>
                  <Avatar spec={owner.avatar} size={38} presence="online" />
                </div>
              );
            }
            return null;
          })}
          {selectedDesk ? (
            <div style={{ position: "absolute", left: selectedDesk.seatX - 19, top: selectedDesk.seatY - 19, width: 38, height: 38, borderRadius: "50%", border: "2px dashed #FFD23F", display: "grid", placeItems: "center", font: "700 16px var(--font-display)", color: "#FFD23F", pointerEvents: "none" }}>
              <Avatar spec={draft.avatar} size={30} presence="none" style={{ opacity: 0.7 }} />
            </div>
          ) : null}
        </OfficeFloor>
      </PlanViewport>

      <section style={{ position: "absolute", left: 48, top: "50%", transform: "translateY(-50%)", width: 356, display: "flex", flexDirection: "column", gap: 22 }}>
        <Eyebrow>{stepLabel ?? "Step 3 of 3"}</Eyebrow>
        <h1 style={{ margin: 0, font: "700 44px/48px var(--font-display)", letterSpacing: "-0.03em" }}>
          Pick your <span style={{ color: "#FFD23F" }}>desk</span>
        </h1>
        <p style={{ margin: 0, fontSize: 16, lineHeight: "24px", color: "#BDB8E6" }}>Whoever walks up to it is with you. It stays yours until you give it up.</p>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ display: "flex", gap: 8, padding: "8px 12px", borderRadius: 999, background: "rgba(34,227,255,0.12)", color: "#22E3FF", fontSize: 13, fontWeight: 600 }}>
            <span className="mono">{freeCount}</span> free
          </span>
          <span style={{ display: "flex", gap: 8, padding: "8px 12px", borderRadius: 999, background: "rgba(190,180,255,0.1)", color: "#BDB8E6", fontSize: 13, fontWeight: 600 }}>
            <span className="mono">{takenCount}</span> taken
          </span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" height={54} onClick={onBack}>
            Back
          </Button>
          <Button height={54} grow disabled={busy || (!selectedDesk && freeCount > 0)} onClick={() => onClaim(selectedDesk?.id ?? null)}>
            {busy ? "Claiming…" : selectedDesk ? `Claim desk ${selectedDesk.number}` : freeCount === 0 ? "Add a desk and claim it" : "Pick a free desk"}
          </Button>
        </div>
        {freeCount === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: "#BDB8E6" }}>
            Office full? <span style={{ color: "#22E3FF", fontWeight: 600 }}>A new desk is added for you.</span>
          </p>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "#BDB8E6" }}>
            {role === "home" ? "This is your desk at home." : "This is your desk. You start here every day, and anyone who walks up joins you."}
          </p>
        )}
      </section>
    </div>
  );
}
