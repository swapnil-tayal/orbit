import { useState } from "react";
import type { UnitId } from "@orbit/shared";
import { api, ApiError } from "../../net/api.ts";
import { sayHello } from "../../net/socket.ts";
import { useSession } from "../../state/session.ts";
import { toast, useUI } from "../../state/ui.ts";
import { Wordmark } from "../../ui/primitives.tsx";
import { ModeStep } from "./ModeStep.tsx";
import { LocationStep } from "./LocationStep.tsx";
import { OfficeStep } from "./OfficeStep.tsx";
import { AvatarStep } from "./AvatarStep.tsx";
import { DeskStep } from "./DeskStep.tsx";

/**
 * Work from home: mode → home area → avatar → done (your own desk at home).
 * Work from an office: mode → office → avatar → desk → done (no home area).
 */
export function Onboarding() {
  const draft = useSession((s) => s.draft);
  const patchDraft = useSession((s) => s.patchDraft);
  const userId = useSession((s) => s.userId);
  const setMe = useSession((s) => s.setMe);
  const setStatus = useSession((s) => s.setStatus);
  const [busy, setBusy] = useState(false);
  const step = draft.step;
  const mode = draft.workMode;

  const finish = async (officeDeskId?: string) => {
    setBusy(true);
    try {
      const { user } = await api.complete(userId, { deskId: null, officeDeskId });
      setMe(user);
      useUI.getState().setEnterOnReady(true);
      setStatus("world");
      await sayHello();
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "error";
      toast(code === "desk_taken" ? "That desk was just taken. Pick another." : code === "office_full" ? "This office is full." : code === "desk_required" ? "Pick a desk in your office to finish." : "Could not finish onboarding", "error");
    } finally {
      setBusy(false);
    }
  };

  const onAvatarContinue = async () => {
    const place = mode === "office" ? (draft.officeUnit ? { officeUnit: draft.officeUnit } : null) : draft.homeUnit ? { homeUnit: draft.homeUnit } : null;
    if (!place) {
      patchDraft({ step: "mode" });
      return;
    }
    setBusy(true);
    try {
      const res = await api.setup(userId, { name: draft.name.trim(), avatar: draft.avatar, ...place });
      setMe(res.user);
      if (mode === "office") patchDraft({ step: "desk" });
      else await finish();
    } catch (e) {
      const code = e instanceof ApiError ? e.code : "error";
      toast(code === "world_full" ? "The world is full (50 people)." : code === "not_habitable" ? "No homes on water or desert" : code === "no_office" ? "That office is not open yet" : "Could not save your profile", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "absolute", inset: 0, background: "#0B0B1A" }}>
      {step === "mode" ? <ModeStep initial={mode} onPick={(m) => patchDraft({ workMode: m, step: m === "home" ? "location" : "office" })} /> : null}
      {step === "location" ? (
        <LocationStep stepLabel="Step 2 of 3" initialUnit={draft.homeUnit} onBack={() => patchDraft({ step: "mode" })} onConfirm={(unitId: UnitId) => patchDraft({ homeUnit: unitId, officeUnit: null, officeDeskId: null, step: "avatar" })} />
      ) : null}
      {step === "office" ? (
        <OfficeStep
          stepLabel="Step 2 of 4"
          initialUnit={draft.officeUnit}
          onBack={() => patchDraft({ step: "mode" })}
          onConfirm={(unitId) => patchDraft({ officeUnit: unitId, homeUnit: null, step: "avatar" })}
        />
      ) : null}
      {step === "avatar" ? <AvatarStep stepLabel={mode === "office" ? "Step 3 of 4" : "Step 3 of 3"} busy={busy} onBack={() => patchDraft({ step: mode === "office" ? "office" : "location" })} onContinue={onAvatarContinue} /> : null}
      {step === "desk" && draft.officeUnit ? (
        <DeskStep
          unitId={draft.officeUnit}
          role="office"
          stepLabel="Step 4 of 4"
          busy={busy}
          onBack={() => patchDraft({ step: "avatar" })}
          onClaim={(deskId) => {
            if (!deskId) {
              toast("This office is full", "error");
              return;
            }
            patchDraft({ officeDeskId: deskId });
            void finish(deskId);
          }}
        />
      ) : null}
      <header style={{ position: "absolute", left: 48, top: 30, display: "flex", alignItems: "center", gap: 10, pointerEvents: "none" }}>
        <Wordmark />
      </header>
    </div>
  );
}
