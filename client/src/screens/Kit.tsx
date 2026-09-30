import { AVATAR_OPTIONS, BOTS, DEFAULT_AVATAR, normalizeAvatar, officeLayout, destinationLayout } from "@orbit/shared";
import { OfficeFloor, type DeskVisual } from "../world/space/OfficeFloor.tsx";
import { PlanViewport } from "../ui/PlanViewport.tsx";

const KIT_LAYOUT = officeLayout("250:500", 2);
const KIT_DESKS: DeskVisual[] = KIT_LAYOUT.desks.map((desk, i) => ({ desk, state: i === 5 ? "selected" : "free", ownerColor: "#FF3D9A", ring: i === 5 ? "selected" : "free" }));
import { Avatar } from "../ui/Avatar.tsx";
import { CarSprite, PlaneSprite } from "./world/VehicleSprites.tsx";
import { IslandFloor } from "../world/space/IslandFloor.tsx";
import { Dock } from "../ui/Dock.tsx";
import { Button, Keycap, Kbd, Waveform, StepBar, GlassPill, Eyebrow } from "../ui/primitives.tsx";
import { IconCar, IconEye, IconPlane } from "../ui/Icons.tsx";

function Sheet({ title, specs }: { title: string; specs: Array<{ label: string; spec: Parameters<typeof normalizeAvatar>[0] }> }) {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <h2 style={{ margin: 0, font: "700 16px var(--font-display)", color: "#BDB8E6" }}>{title}</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
        {specs.map((s) => (
          <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: 10, borderRadius: 14, background: "rgba(20,18,44,0.8)" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
              <Avatar spec={normalizeAvatar(s.spec)} size={150} mode="figure" presence="none" />
              <Avatar spec={normalizeAvatar(s.spec)} size={84} presence="none" />
            </div>
            <span style={{ font: "600 11px var(--font-mono)", color: "#8A84BA" }}>{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

const O = AVATAR_OPTIONS;
const base = { ...DEFAULT_AVATAR, hair: "short" as const, hat: "none" as const, glasses: "none" as const, extra: "none" as const, jacket: "none" as const, top: "tee" as const };

export function Kit() {
  const sheets = [
    { title: "Hair", specs: O.hairs.map((h) => ({ label: h.label, spec: { ...base, hair: h.value } })) },
    { title: "Expression", specs: O.faces.map((f) => ({ label: f.label, spec: { ...base, face: f.value } })) },
    { title: "Tops", specs: O.tops.map((t) => ({ label: t.label, spec: { ...base, top: t.value } })) },
    { title: "Jackets over a shirt", specs: O.jackets.map((j) => ({ label: j.label, spec: { ...base, top: "shirt" as const, jacket: j.value, jacketColor: "#5B6CFF" } })) },
    { title: "Bottoms", specs: O.bottoms.map((b) => ({ label: b.label, spec: { ...base, bottom: b.value } })) },
    { title: "Shoes", specs: O.shoes.map((s) => ({ label: s.label, spec: { ...base, shoes: s.value, bottom: "shorts" as const } })) },
    { title: "Hats (on long hair)", specs: O.hats.map((h) => ({ label: h.label, spec: { ...base, hair: "long" as const, hat: h.value, hatColor: "#FFD23F" } })) },
    { title: "Glasses", specs: O.glasses.map((g) => ({ label: g.label, spec: { ...base, glasses: g.value } })) },
    { title: "Extras", specs: O.extras.map((e) => ({ label: e.label, spec: { ...base, extra: e.value, extraColor: "#9B5CFF" } })) },
  ];
  return (
    <div style={{ padding: 40, display: "flex", flexDirection: "column", gap: 28, overflow: "auto", height: "100%" }}>
      <h1 style={{ margin: 0, font: "800 40px/42px var(--font-display)", letterSpacing: "-0.04em" }}>
        Neon <span style={{ color: "#FF3D9A", textShadow: "0 0 36px rgba(255,61,154,0.55)" }}>Orbit</span> kit
      </h1>
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ margin: 0, font: "700 16px var(--font-display)", color: "#BDB8E6" }}>Vehicles</h2>
        <div style={{ position: "relative", height: 140, borderRadius: 14, background: "linear-gradient(90deg, #27C46F, #1440D8)" }}>
          <div style={{ position: "absolute", left: 90, top: 70 }}><PlaneSprite scale={1} pink /></div>
          <div style={{ position: "absolute", left: 300, top: 70 }}><PlaneSprite scale={1} /></div>
          <div style={{ position: "absolute", left: 480, top: 70, transform: "rotate(-30deg)" }}><PlaneSprite scale={0.5} pink /></div>
          <div style={{ position: "absolute", left: 620, top: 70 }}><CarSprite scale={0.5} pink /></div>
        </div>
      </section>
      <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <h2 style={{ margin: 0, font: "700 16px var(--font-display)", color: "#BDB8E6" }}>Island</h2>
        <div style={{ width: 1440 * 0.6, height: 900 * 0.6, borderRadius: 14, overflow: "hidden", background: "radial-gradient(900px 620px at 50% 50%, #0F2A6B 0%, #0B0B1A 72%)" }}>
          <div style={{ transform: "scale(0.6)", transformOrigin: "0 0" }}>
            <IslandFloor layout={destinationLayout("bali", "181:650")} circles={[{ key: "fire", active: true, members: 2 }]} />
          </div>
        </div>
      </section>
      {sheets.map((s) => (
        <Sheet key={s.title} title={s.title} specs={s.specs} />
      ))}
      <div style={{ display: "flex", gap: 18, alignItems: "flex-end" }}>
        <Avatar spec={DEFAULT_AVATAR} size={58} you presence="online" />
        <Avatar spec={BOTS[0].avatar} size={58} presence="online" speaking />
        <Avatar spec={BOTS[4].avatar} size={58} presence="traveling" />
        <Avatar spec={BOTS[9].avatar} size={58} presence="offline" />
        <Avatar spec={BOTS[2].avatar} size={58} presence="online" pulse label="Kabir" />
        <Avatar spec={{ ...BOTS[5].avatar, hat: "headphones" }} size={96} mode="figure" presence="none" />
        <Avatar spec={DEFAULT_AVATAR} size={200} mode="figure" presence="none" you />
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
        {AVATAR_OPTIONS.faces.map((f) => (
          <Avatar key={f.value} spec={{ ...DEFAULT_AVATAR, face: f.value }} size={72} presence="none" />
        ))}
      </div>
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Avatar spec={normalizeAvatar({ top: "tank", topColor: "#22C1F5", bottom: "shorts", shoes: "sandals", hair: "afro", face: "grin" })} size={170} mode="figure" presence="none" />
        <Avatar spec={normalizeAvatar({ top: "tee", topColor: "#FFD23F", bottom: "skirt", bottomColor: "#9B5CFF", hair: "braids", face: "wink", glasses: "round" })} size={170} mode="figure" presence="none" />
        <Avatar spec={normalizeAvatar({ top: "shirt", topColor: "#FFFFFF", jacket: "blazer", jacketColor: "#2A2A36", bottom: "chinos", bottomColor: "#E9CFAE", shoes: "loafers", hair: "sidepart", facialHair: "beard", face: "neutral" })} size={170} mode="figure" presence="none" />
        <Avatar spec={normalizeAvatar({ top: "hoodie", topColor: "#5B6CFF", bottom: "joggers", shoes: "boots", hair: "mohawk", hairColor: "#FF3D9A", hat: "beanie", face: "laugh", extra: "scarf" })} size={170} mode="figure" presence="none" />
        <Avatar spec={normalizeAvatar({ top: "sweater", topColor: "#2E9E4A", jacket: "puffer", jacketColor: "#F53B2B", hair: "bun", face: "surprised", glasses: "sunglasses", hat: "cap", extra: "necklace" })} size={170} mode="figure" presence="none" />
      </div>
      <div style={{ display: "flex", gap: 20 }}>
        <Dock context="globe" online={21} me={DEFAULT_AVATAR} />
        <Dock context="space" online={21} me={DEFAULT_AVATAR}/>
        <Dock context="space" online={21} me={DEFAULT_AVATAR} />
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="tinted">Tinted</Button>
        <Button variant="yellow" height={42}>
          Move to desk 4
        </Button>
        <Button height={56}>
          Travel here <Keycap>T</Keycap>
        </Button>
        <Kbd>W</Kbd>
        <Waveform />
        <StepBar step={1} />
      </div>
      <div style={{ display: "flex", gap: 14 }}>
        <GlassPill border="rgba(255,61,154,0.35)">
          <Avatar spec={DEFAULT_AVATAR} size={30} you presence="online" />
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontWeight: 700 }}>At your desk</span>
            <span style={{ fontSize: 12, color: "#BDB8E6" }}>Home office · 4:12 PM</span>
          </span>
        </GlassPill>
        <GlassPill border="rgba(255,210,63,0.45)" style={{ padding: "7px 7px 7px 14px" }}>
          <IconEye size={16} color="#FFD23F" strokeWidth={2} />
          <span style={{ fontWeight: 600 }}>Peeking</span>
          <span style={{ padding: "6px 12px", borderRadius: 999, background: "rgba(255,61,154,0.18)", color: "#FF3D9A", fontWeight: 700 }}>Back to me</span>
        </GlassPill>
        <GlassPill border="rgba(182,255,59,0.55)" glow="rgba(182,255,59,0.2)" style={{ padding: "8px 16px" }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#B6FF3B", boxShadow: "0 0 8px #B6FF3B" }} />
          <span>
            You&apos;re in <span style={{ font: "700 13px var(--font-display)", color: "#B6FF3B" }}>Meera&apos;s space</span>
          </span>
        </GlassPill>
      </div>
      <div style={{ display: "flex", gap: 12, width: 420 }}>
        <div style={{ flex: 1, padding: 16, borderRadius: 20, background: "rgba(255,61,154,0.16)", border: "2px solid #FF3D9A", boxShadow: "0 0 24px rgba(255,61,154,0.3)" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FF3D9A", color: "#1A0012", display: "grid", placeItems: "center" }}>
            <IconCar size={22} strokeWidth={2} />
          </div>
          <div style={{ font: "700 22px var(--font-mono)", color: "#FF3D9A", marginTop: 10 }}>20 s</div>
          <div style={{ fontSize: 12, color: "#BDB8E6" }}>Car · on the ground</div>
        </div>
        <div style={{ flex: 1, padding: 16, borderRadius: 20, background: "rgba(34,227,255,0.08)", border: "2px solid rgba(34,227,255,0.35)" }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(34,227,255,0.2)", color: "#22E3FF", display: "grid", placeItems: "center" }}>
            <IconPlane size={22} strokeWidth={2} />
          </div>
          <div style={{ font: "700 22px var(--font-mono)", color: "#22E3FF", marginTop: 10 }}>5 s</div>
          <div style={{ fontSize: 12, color: "#BDB8E6" }}>Flight · over the curve</div>
        </div>
      </div>
      <div style={{ position: "relative", height: 640, flexShrink: 0 }}>
        <PlanViewport planWidth={992} planHeight={KIT_LAYOUT.height - 900 + 652} offsetX={-224} offsetY={-124}>
          <OfficeFloor layout={KIT_LAYOUT} desks={KIT_DESKS} zones={[]} showSpawnPulse={false} />
        </PlanViewport>
      </div>
      <Eyebrow color="#22E3FF">01 · Foundations</Eyebrow>
    </div>
  );
}
