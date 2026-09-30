import { useEffect, useMemo, useRef } from "react";
import type { PublicUser } from "@orbit/shared";
import { useComm } from "../state/comm.ts";
import { hasMediaSupport, stopScreenShare } from "./media.ts";
import { MockProvider } from "./MockProvider.ts";
import { WebRtcProvider } from "./WebRtcProvider.ts";
import type { CommProvider } from "./provider.ts";
import { playChime } from "./audioGraph.ts";

let provider: CommProvider | null = null;

export function getProvider(myId: string): CommProvider {
  if (!provider) provider = hasMediaSupport() ? new WebRtcProvider(myId) : new MockProvider();
  return provider;
}

export function useCommSession(myId: string | null, zoneId: string | null, members: string[], users: Record<string, PublicUser>, ownedZoneId: string | null): void {
  const muted = useComm((s) => s.muted);
  const localScreen = useComm((s) => s.localScreen);
  const membersKey = members.join("|");
  const prevMembers = useRef<string[]>([]);
  const peers = useMemo(() => members.filter((id) => id !== myId).map((id) => ({ id, isBot: users[id]?.isBot ?? false })), [membersKey, users, myId]);

  useEffect(() => {
    if (!myId) return;
    const p = getProvider(myId);
    if (!zoneId) {
      stopScreenShare();
      p.leave();
      useComm.getState().setConversation("idle");
      prevMembers.current = [];
      return;
    }
    void p.join(zoneId, peers);
    const others = peers.map((x) => x.id);
    if (zoneId === ownedZoneId && others.some((id) => !prevMembers.current.includes(id))) playChime();
    prevMembers.current = others;
    useComm.getState().setConversation(others.length > 0 ? "active" : "entering");
  }, [myId, zoneId, peers, ownedZoneId]);

  useEffect(() => {
    if (!myId) return;
    getProvider(myId).setMuted(muted);
  }, [muted, myId]);

  useEffect(() => {
    if (!myId) return;
    getProvider(myId).setScreen(localScreen);
  }, [localScreen, myId]);

  useEffect(() => () => stopScreenShare(), []);
}
