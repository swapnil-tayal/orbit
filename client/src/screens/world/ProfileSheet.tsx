import { useState } from "react";
import { DEFAULT_AVATAR, parseDeskId, type AvatarSpec } from "@orbit/shared";
import { useSession } from "../../state/session.ts";
import { useUI, toast } from "../../state/ui.ts";
import { requestDeskRelease, updateProfile } from "../../net/socket.ts";
import { clearToken } from "../../net/identity.ts";
import { googleSignOut } from "../../ui/GoogleSignIn.tsx";
import { Avatar } from "../../ui/Avatar.tsx";
import { AvatarEditor } from "../../ui/AvatarEditor.tsx";
import { Button } from "../../ui/primitives.tsx";
import { IconClose } from "../../ui/Icons.tsx";
import { LocationStep } from "../onboarding/LocationStep.tsx";
import { api } from "../../net/api.ts";
import { useWorld } from "../../state/world.ts";

type Tab = "avatar" | "home" | "desk";

export function ProfileSheet() {
  const me = useSession((s) => s.me);
  const setMe = useSession((s) => s.setMe);
  const userId = useSession((s) => s.userId);
  const setSheet = useUI((s) => s.setSheet);
  const [tab, setTab] = useState<Tab>("avatar");
  const [name, setName] = useState(me?.name ?? "");
  const [spec, setSpec] = useState<AvatarSpec>(me?.avatar ?? DEFAULT_AVATAR);
  const [changingHome, setChangingHome] = useState(false);
  const [saving, setSaving] = useState(false);
  if (!me) return null;
  const dirty = name.trim() !== me.name || JSON.stringify(spec) !== JSON.stringify(me.avatar);
  const officeName = me.officeUnit ? (useWorld.getState().offices[me.officeUnit]?.name ?? null) : null;
  const officeDeskNo = me.officeDeskId ? (parseDeskId(me.officeDeskId)?.idx ?? 0) + 1 : null;
  const worksFromHome = !!me.homeUnit;
  const tabs: Tab[] = worksFromHome ? ["avatar", "home", "desk"] : ["avatar", "desk"];

  const save = async () => {
    setSaving(true);
    const res = await updateProfile({ name: name.trim() || me.name, avatar: spec });
    setSaving(false);
    if (res.ok && res.user) {
      setMe(res.user);
      toast("Profile saved", "info");
      setSheet("none");
    } else toast("Could not save profile", "error");
  };

  const giveUp = async (role: "home" | "office") => {
    const res = await requestDeskRelease({ role });
    if (res.ok) toast(role === "home" ? "Your home desk is free for others" : "Your office desk is free for others", "info");
    else toast("Could not release the desk", "error");
  };

  const signOut = () => {
    clearToken();
    googleSignOut();
    window.location.reload();
  };

  if (changingHome) {
    return (
      <div style={{ position: "absolute", inset: 0, zIndex: 30, background: "#0B0B1A" }}>
        <LocationStep
          stepLabel="Change home"
          initialUnit={me.homeUnit}
          onBack={() => setChangingHome(false)}
          onConfirm={async (unitId) => {
            try {
              const { user } = await api.patchUser(userId, { homeUnit: unitId });
              setMe(user);
              toast("Home moved. A desk in the new office is yours.", "info");
              setChangingHome(false);
              setSheet("none");
            } catch {
              toast("Could not change home", "error");
            }
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 30, background: "rgba(11,11,26,0.5)", display: "grid", placeItems: "center", backdropFilter: "blur(4px)" }} onClick={() => setSheet("none")}>
      <section role="dialog" aria-label="Your profile" onClick={(e) => e.stopPropagation()} style={{ width: "min(1100px, calc(100% - 48px))", height: "min(740px, calc(100% - 48px))", display: "grid", gridTemplateColumns: "minmax(280px, 400px) 1fr", borderRadius: 34, background: "rgba(20,18,44,0.94)", border: "1px solid rgba(190,180,255,0.16)", overflow: "hidden", boxShadow: "0 40px 120px rgba(0,0,0,0.65), 0 0 60px rgba(255,61,154,0.12)" }}>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 32px", background: "radial-gradient(300px 360px at 50% 62%, rgba(255,61,154,0.28), rgba(155,92,255,0.12) 55%, rgba(20,18,44,0) 80%)" }}>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={24} aria-label="Your name" style={{ width: "100%", textAlign: "center", background: "transparent", border: 0, borderBottom: "1px dashed rgba(190,180,255,0.3)", outline: "none", color: "#F4F2FF", font: "700 36px/44px var(--font-display)", letterSpacing: "-0.03em" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "#BDB8E6" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: me.presence === "traveling" ? "#22E3FF" : "#B6FF3B", boxShadow: `0 0 8px ${me.presence === "traveling" ? "#22E3FF" : "#B6FF3B"}` }} />
            {me.presence === "traveling" ? "Traveling" : me.seated ? "Online · at your desk" : "Online · in a space"}
          </div>
          <div style={{ position: "relative", flexGrow: 1, display: "flex", alignItems: "flex-end", justifyContent: "center", width: "100%", paddingBottom: 40 }}>
            <Avatar spec={spec} mode="figure" size={340} presence="none" />
          </div>
          <p style={{ position: "absolute", left: 32, right: 32, bottom: 26, margin: 0, fontSize: 12, lineHeight: "18px", color: "#8A84BA", textAlign: "center" }}>Presence is automatic: online while the app is open, offline when you close it.</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "36px 40px", overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <nav aria-label="Profile sections" style={{ display: "flex", gap: 6, padding: 4, borderRadius: 999, background: "rgba(190,180,255,0.07)" }}>
              {tabs.map((t) => (
                <button key={t} aria-current={tab === t ? "page" : undefined} onClick={() => setTab(t)} style={{ padding: "9px 18px", borderRadius: 999, border: 0, background: tab === t ? "#FF3D9A" : "transparent", color: tab === t ? "#1A0012" : "#BDB8E6", fontSize: 14, fontWeight: tab === t ? 700 : 600 }}>
                  {t === "avatar" ? "Avatar" : t === "home" ? "Home" : "Desk"}
                </button>
              ))}
            </nav>
            <button aria-label="Close profile" onClick={() => setSheet("none")} style={{ width: 40, height: 40, borderRadius: "50%", border: 0, background: "rgba(190,180,255,0.1)", color: "#BDB8E6", display: "grid", placeItems: "center" }}>
              <IconClose size={16} />
            </button>
          </div>
          {tab === "avatar" ? <AvatarEditor spec={spec} onChange={setSpec} /> : null}
          {tab === "home" ? (
            <div style={{ display: "flex", gap: 16, padding: 18, borderRadius: 22, background: "rgba(34,227,255,0.08)", border: "1px solid rgba(34,227,255,0.25)" }}>
              <div style={{ position: "relative", width: 92, height: 92, flexShrink: 0, borderRadius: "50%", background: "radial-gradient(circle at 40% 35%, #1F5BFF, #0A1C7A 70%)", boxShadow: "0 0 0 2px rgba(34,227,255,0.5)" }}>
                <div style={{ position: "absolute", left: 41, top: 38, width: 8, height: 8, borderRadius: "50%", background: "#FF3D9A", boxShadow: "0 0 10px #FF3D9A" }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ font: "700 14px var(--font-display)" }}>Home area</span>
                <span style={{ fontSize: 12, lineHeight: "18px", color: "#BDB8E6" }}>An approximate area. It stays put if you move.</span>
                <button onClick={() => setChangingHome(true)} style={{ alignSelf: "flex-start", border: 0, background: "transparent", padding: 0, fontSize: 13, fontWeight: 700, color: "#22E3FF" }}>
                  Change home →
                </button>
              </div>
            </div>
          ) : null}
          {tab === "desk" ? (
            <div style={{ display: "grid", gridTemplateColumns: worksFromHome ? "1fr 1fr" : "1fr", gap: 16 }}>
              {worksFromHome ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 18, borderRadius: 22, background: "rgba(255,210,63,0.08)", border: "1px solid rgba(255,210,63,0.25)" }}>
                  <span style={{ font: "700 14px var(--font-display)" }}>Home desk</span>
                  <span style={{ fontSize: 12, lineHeight: "18px", color: "#BDB8E6" }}>You work from home. This desk is yours alone, and office desks stay free for office people.</span>
                </div>
              ) : null}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: 18, borderRadius: 22, background: "rgba(190,180,255,0.06)", border: "1px solid rgba(190,180,255,0.16)" }}>
                <span style={{ font: "700 14px var(--font-display)" }}>{officeDeskNo ? `${officeName ?? "Office"} · desk ${officeDeskNo}` : worksFromHome ? "No office desk" : "No desk yet"}</span>
                <span style={{ fontSize: 12, lineHeight: "18px", color: "#BDB8E6" }}>{!worksFromHome ? "You work from this office. It is where you start each day. Use Desk mode there to move." : officeDeskNo ? "A second desk at a team office." : "You can visit any office, but desks there belong to people who work from it."}</span>
                {officeDeskNo && worksFromHome ? (
                  <button onClick={() => void giveUp("office")} style={{ alignSelf: "flex-start", border: 0, background: "transparent", padding: 0, fontSize: 13, color: "#BDB8E6", marginTop: 4 }}>
                    Give up
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <button onClick={signOut} style={{ border: 0, background: "transparent", padding: 0, fontSize: 13, color: "#BDB8E6" }}>
              Sign out · you&apos;ll show as offline
            </button>
            <Button height={52} disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

