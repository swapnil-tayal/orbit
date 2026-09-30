import { randomAvatar, type AvatarSpec } from "@orbit/shared";
import { useSession } from "../../state/session.ts";
import { Avatar } from "../../ui/Avatar.tsx";
import { AvatarEditor } from "../../ui/AvatarEditor.tsx";
import { Button, Eyebrow } from "../../ui/primitives.tsx";
import { IconShuffle } from "../../ui/Icons.tsx";

export interface AvatarStepProps {
  stepLabel?: string;
  onContinue: () => void;
  onBack: () => void;
  busy?: boolean;
}

export function AvatarStep({ onContinue, onBack, busy, stepLabel = "Step 3 of 3" }: AvatarStepProps) {
  const draft = useSession((s) => s.draft);
  const patchDraft = useSession((s) => s.patchDraft);
  const spec = draft.avatar;
  const setSpec = (next: AvatarSpec) => patchDraft({ avatar: next });
  const nameOk = draft.name.trim().length >= 1;

  return (
    <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr minmax(440px, 520px)", gap: 24, padding: "110px 48px 40px" }}>
      <div style={{ position: "absolute", left: "50%", top: "22%", width: 560, height: 560, transform: "translateX(-60%)", borderRadius: "50%", background: "radial-gradient(closest-side, rgba(255,61,154,0.22), rgba(155,92,255,0.1) 55%, rgba(11,11,26,0))", pointerEvents: "none" }} />
      <section style={{ display: "flex", flexDirection: "column", gap: 16, alignSelf: "start", marginTop: 20 }}>
        <Eyebrow>{stepLabel}</Eyebrow>
        <h1 style={{ margin: 0, font: "700 40px/44px var(--font-display)", letterSpacing: "-0.03em" }}>
          Be <span style={{ color: "#B6FF3B" }}>you</span>, but brighter
        </h1>
        <p style={{ margin: 0, fontSize: 15, lineHeight: "23px", color: "#BDB8E6" }}>This is how people spot you on the globe and across a room.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <label htmlFor="name" style={{ fontSize: 13, fontWeight: 700, color: "#BDB8E6" }}>
            Your name
          </label>
          <input
            id="name"
            value={draft.name}
            maxLength={24}
            onChange={(e) => patchDraft({ name: e.target.value })}
            placeholder="What should people call you?"
            style={{ height: 48, padding: "0 16px", borderRadius: 14, background: "rgba(190,180,255,0.07)", border: "1.5px solid rgba(190,180,255,0.16)", color: "#F4F2FF", font: "500 15px var(--font-ui)", outline: "none" }}
          />
        </div>
      </section>

      <section style={{ position: "relative", display: "flex", alignItems: "flex-end", justifyContent: "center", minHeight: 480 }}>
        <div style={{ position: "relative", marginBottom: 20 }}>
          <Avatar spec={spec} mode="figure" size={Math.min(460, Math.max(300, window.innerHeight * 0.5))} presence="none" />
        </div>
      </section>

      <section aria-label="Customize avatar" style={{ display: "flex", flexDirection: "column", gap: 18, padding: 24, borderRadius: 28, background: "rgba(20,18,44,0.88)", border: "1px solid rgba(190,180,255,0.16)", boxShadow: "0 30px 80px rgba(0,0,0,0.55)", backdropFilter: "blur(18px)", alignSelf: "start", maxHeight: "100%", overflow: "auto" }}>
        <AvatarEditor spec={spec} onChange={setSpec} />
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
          <Button variant="secondary" height={54} onClick={onBack}>
            Back
          </Button>
          <Button variant="tinted" height={54} onClick={() => setSpec(randomAvatar())}>
            <IconShuffle size={16} /> Shuffle
          </Button>
          <Button height={54} grow disabled={!nameOk || busy} onClick={onContinue}>
            {busy ? "Saving…" : "Continue"}
          </Button>
        </div>
      </section>
    </div>
  );
}
