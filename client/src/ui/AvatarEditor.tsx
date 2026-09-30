import { useState } from "react";
import { AVATAR_OPTIONS, type AvatarOption, type AvatarSpec } from "@orbit/shared";
import { Avatar } from "./Avatar.tsx";
import { IconClose } from "./Icons.tsx";

type Tab = "base" | "clothing" | "accessories" | "extras";

interface Sub {
  key: string;
  label: string;
  field: keyof AvatarSpec | null;
  options: readonly AvatarOption<string>[] | null;
  colorField: keyof AvatarSpec | null;
  palette: readonly AvatarOption<string>[] | null;
  preview: "bust" | "figure";
}

const SUBS: Record<Tab, Sub[]> = {
  base: [
    { key: "skin", label: "Skin", field: null, options: null, colorField: "skin", palette: AVATAR_OPTIONS.skins, preview: "bust" },
    { key: "hair", label: "Hair", field: "hair", options: AVATAR_OPTIONS.hairs, colorField: "hairColor", palette: AVATAR_OPTIONS.hairColors, preview: "bust" },
    { key: "face", label: "Expression", field: "face", options: AVATAR_OPTIONS.faces, colorField: null, palette: null, preview: "bust" },
  ],
  clothing: [
    { key: "top", label: "Top", field: "top", options: AVATAR_OPTIONS.tops, colorField: "topColor", palette: AVATAR_OPTIONS.clothingColors, preview: "figure" },
    { key: "jacket", label: "Jacket", field: "jacket", options: AVATAR_OPTIONS.jackets, colorField: "jacketColor", palette: AVATAR_OPTIONS.clothingColors, preview: "figure" },
    { key: "bottom", label: "Bottom", field: "bottom", options: AVATAR_OPTIONS.bottoms, colorField: "bottomColor", palette: AVATAR_OPTIONS.clothingColors, preview: "figure" },
    { key: "shoes", label: "Shoes", field: "shoes", options: AVATAR_OPTIONS.shoes, colorField: "shoesColor", palette: AVATAR_OPTIONS.clothingColors, preview: "figure" },
  ],
  accessories: [
    { key: "hat", label: "Hat", field: "hat", options: AVATAR_OPTIONS.hats, colorField: "hatColor", palette: AVATAR_OPTIONS.clothingColors, preview: "bust" },
    { key: "glasses", label: "Glasses", field: "glasses", options: AVATAR_OPTIONS.glasses, colorField: null, palette: null, preview: "bust" },
  ],
  extras: [{ key: "extra", label: "Extra", field: "extra", options: AVATAR_OPTIONS.extras, colorField: "extraColor", palette: AVATAR_OPTIONS.clothingColors, preview: "figure" }],
};

const TABS: Array<[Tab, string]> = [
  ["base", "Base"],
  ["clothing", "Clothing"],
  ["accessories", "Accessories"],
  ["extras", "Extras"],
];

const selectedRing = "0 0 0 2px #14122B, 0 0 0 4px #F4F2FF";
const idleRing = "inset 0 0 0 1px rgba(255,255,255,0.14)";

export function AvatarEditor({ spec, onChange }: { spec: AvatarSpec; onChange: (next: AvatarSpec) => void }) {
  const [tab, setTab] = useState<Tab>("base");
  const [subKey, setSubKey] = useState<string>("skin");
  const subs = SUBS[tab];
  const sub = subs.find((s) => s.key === subKey) ?? subs[0];
  const set = (field: keyof AvatarSpec, value: string) => onChange({ ...spec, [field]: value } as AvatarSpec);
  const pickTab = (t: Tab) => {
    setTab(t);
    setSubKey(SUBS[t][0].key);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <nav aria-label="Avatar sections" style={{ display: "flex", borderBottom: "2px solid rgba(190,180,255,0.16)" }}>
        {TABS.map(([t, label]) => (
          <button key={t} aria-current={tab === t ? "page" : undefined} onClick={() => pickTab(t)} style={{ flexGrow: 1, padding: "10px 6px 12px", marginBottom: -2, border: 0, borderBottom: `2px solid ${tab === t ? "#F4F2FF" : "transparent"}`, background: "transparent", color: tab === t ? "#F4F2FF" : "#8A84BA", font: `${tab === t ? 700 : 600} 15px var(--font-ui)`, cursor: "pointer" }}>
            {label}
          </button>
        ))}
      </nav>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {subs.map((s) => (
          <button key={s.key} aria-pressed={sub.key === s.key} onClick={() => setSubKey(s.key)} style={{ padding: "9px 16px", borderRadius: 999, border: 0, background: sub.key === s.key ? "rgba(190,180,255,0.28)" : "rgba(190,180,255,0.08)", color: sub.key === s.key ? "#F4F2FF" : "#BDB8E6", font: "700 14px var(--font-ui)", cursor: "pointer" }}>
            {s.label}
          </button>
        ))}
      </div>
      {sub.palette && sub.colorField ? (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {sub.palette.map((c) => {
            const sel = spec[sub.colorField!] === c.value;
            return <button key={c.value} aria-label={`${sub.label} ${c.label}`} aria-pressed={sel} onClick={() => set(sub.colorField!, c.value)} style={{ width: 36, height: 36, borderRadius: "50%", border: 0, background: c.value, boxShadow: sel ? selectedRing : idleRing, cursor: "pointer", flexShrink: 0 }} />;
          })}
        </div>
      ) : null}
      {sub.options && sub.field ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          {sub.options.map((o) => {
            const sel = spec[sub.field!] === o.value;
            const preview = { ...spec, [sub.field!]: o.value } as AvatarSpec;
            return (
              <button key={o.value} aria-label={`${sub.label}: ${o.label}`} aria-pressed={sel} title={o.label} onClick={() => set(sub.field!, o.value)} style={{ height: 96, borderRadius: 18, border: 0, display: "grid", placeItems: "center", background: sel ? "rgba(190,180,255,0.3)" : "rgba(190,180,255,0.1)", boxShadow: sel ? "inset 0 0 0 2.5px #F4F2FF" : "inset 0 0 0 1px rgba(190,180,255,0.12)", cursor: "pointer", overflow: "hidden" }}>
                {o.value === "none" ? <IconClose size={22} color="#F4F2FF" strokeWidth={2.4} /> : sub.preview === "bust" ? <Avatar spec={preview} size={62} presence="none" /> : <Avatar spec={preview} mode="figure" size={84} presence="none" />}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
