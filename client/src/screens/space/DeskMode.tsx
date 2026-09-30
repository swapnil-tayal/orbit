import type { DeskDef, DeskInfo } from "@orbit/shared";
import { Button } from "../../ui/primitives.tsx";
import { IconDesk, IconPlus } from "../../ui/Icons.tsx";

export interface DeskModeProps {
  desks: DeskInfo[];
  myDeskId: string | null;
  selected: DeskDef | null;
  canAdd: boolean;
  busy: boolean;
  onMove: () => void;
  onKeep: () => void;
  onGiveUp: () => void;
  onAdd: () => void;
  onDone: () => void;
}

export function DeskModeBar({ onDone }: { onDone: () => void }) {
  return (
    <div style={{ position: "absolute", left: "50%", top: 28, transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 12, padding: "7px 7px 7px 16px", borderRadius: 999, background: "rgba(20,18,44,0.9)", border: "1px solid rgba(34,227,255,0.45)", fontSize: 13, zIndex: 22, whiteSpace: "nowrap" }}>
      <IconDesk size={16} color="#22E3FF" />
      <span style={{ font: "600 13px var(--font-display)" }}>Desk mode</span>
      <span style={{ color: "#BDB8E6" }}>tap a free desk</span>
      <button onClick={onDone} style={{ padding: "7px 14px", borderRadius: 999, border: 0, background: "rgba(190,180,255,0.12)", color: "#F4F2FF", fontWeight: 600 }}>
        Done
      </button>
    </div>
  );
}

export function DeskModePanel({ desks, myDeskId, selected, canAdd, busy, onMove, onKeep, onGiveUp, onAdd }: DeskModeProps) {
  const claimed = desks.filter((d) => d.ownerId).length;
  const myNo = myDeskId ? desks.findIndex((d) => d.id === myDeskId) + 1 : 0;
  return (
    <>
      <div style={{ position: "absolute", left: 24, top: 110, width: 200, display: "flex", flexDirection: "column", gap: 14, zIndex: 22 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ font: "500 36px/40px var(--font-display)", color: "#FF3D9A" }}>
            {claimed}
            <span style={{ fontSize: 20, color: "#8A84BA" }}>/{desks.length}</span>
          </span>
          <span style={{ fontSize: 12, color: "#BDB8E6" }}>desks claimed</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12, lineHeight: "17px", color: "#BDB8E6" }}>
          <span>One desk each, yours until you give it up.</span>
          <span>Claimed desks are never offered to anyone else.</span>
          <span>Add desk fills the next slot. Full row? A new row appears.</span>
        </div>
        {myNo > 0 ? (
          <button onClick={onGiveUp} disabled={busy} style={{ height: 40, borderRadius: 999, border: "1px solid rgba(190,180,255,0.2)", background: "transparent", color: "#F4F2FF", fontSize: 13 }}>
            Give up desk {myNo}
          </button>
        ) : null}
        {canAdd ? (
          <button onClick={onAdd} disabled={busy} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, height: 40, borderRadius: 999, border: "1.5px dashed #22E3FF", background: "rgba(34,227,255,0.14)", color: "#22E3FF", fontSize: 13, fontWeight: 700 }}>
            <IconPlus size={12} strokeWidth={3} /> Add desk
          </button>
        ) : null}
      </div>
      {selected ? (
        <div style={{ position: "absolute", right: 22, top: 170, width: 196, display: "flex", flexDirection: "column", gap: 10, padding: 16, borderRadius: 18, background: "rgba(20,18,44,0.94)", border: "1px solid rgba(255,210,63,0.5)", boxShadow: "0 0 30px rgba(255,210,63,0.18), 0 20px 50px rgba(0,0,0,0.5)", zIndex: 22 }}>
          <span style={{ font: "600 15px var(--font-display)" }}>{myNo > 0 ? "Move here?" : "Claim this desk?"}</span>
          <span style={{ fontSize: 12, lineHeight: "17px", color: "#BDB8E6" }}>{myNo > 0 ? `Desk ${myNo} is freed for others.` : "It stays yours until you give it up."}</span>
          <Button variant="yellow" height={42} disabled={busy} onClick={onMove} style={{ fontSize: 14 }}>
            {myNo > 0 ? `Move to desk ${selected.number}` : `Claim desk ${selected.number}`}
          </Button>
          <button onClick={onKeep} style={{ height: 32, border: 0, background: "transparent", color: "#BDB8E6", fontSize: 13 }}>
            {myNo > 0 ? "Keep mine" : "Cancel"}
          </button>
        </div>
      ) : null}
    </>
  );
}
