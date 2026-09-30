import { clearToken, getToken } from "../net/identity.ts";
import { connectSocket } from "../net/socket.ts";
import { useSession } from "../state/session.ts";
import { api, ApiError } from "../net/api.ts";
import type { MeUser } from "@orbit/shared";

export function applySignedIn(user: MeUser): void {
  const session = useSession.getState();
  useSession.setState({ userId: user.id });
  session.setMe(user);
  if (!user.onboarded) session.patchDraft({ name: user.name, avatar: user.avatar, homeUnit: user.homeUnit, officeUnit: user.officeUnit, workMode: user.homeUnit ? "home" : user.officeUnit ? "office" : null });
}

export async function boot(): Promise<void> {
  const session = useSession.getState();
  if (getToken()) {
    try {
      const { user } = await api.me();
      applySignedIn(user);
      session.setStatus(user.onboarded ? "world" : "landing");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) clearToken();
      session.setStatus("landing");
    }
  } else {
    session.setStatus("landing");
  }
  connectSocket();
}
