import type { AvatarSpec, DeskInfo, DestinationInfo, MeUser, OfficeInfo, PublicUser, UnitId } from "@orbit/shared";
import { getToken } from "./identity.ts";
import { API_BASE, TUNNEL_HEADERS } from "./config.ts";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { ...TUNNEL_HEADERS };
  if (body) headers["content-type"] = "application/json";
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let code = `http_${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) code = j.error;
    } catch {
      code = `http_${res.status}`;
    }
    throw new ApiError(res.status, code);
  }
  return (await res.json()) as T;
}

export interface WorldResponse {
  serverNow: number;
  users: PublicUser[];
  offices: OfficeInfo[];
  destinations: DestinationInfo[];
  maxUsers: number;
}

export interface OfficeResponse {
  office: OfficeInfo;
  desks: DeskInfo[];
  rows: number;
  height: number;
  people: PublicUser[];
}

export interface UnitResponse {
  unitId: UnitId;
  office: OfficeInfo | null;
  destination: DestinationInfo | null;
  people: PublicUser[];
  residents: PublicUser[];
  habitable: boolean;
}

export interface AuthResponse {
  token: string;
  user: MeUser;
}

export const api = {
  authConfig: () => request<{ google: boolean; dev: boolean }>("GET", "/auth/config"),
  authGoogle: (body: { credential?: string; accessToken?: string; linkUserId?: string | null }) => request<AuthResponse>("POST", "/auth/google", body),
  authDev: (profile: string) => request<AuthResponse>("POST", "/auth/dev", { profile }),
  me: () => request<{ user: MeUser }>("GET", "/auth/me"),
  world: () => request<WorldResponse>("GET", "/world"),
  user: (id: string) => request<{ user: MeUser | null }>("GET", `/users/${encodeURIComponent(id)}`),
  setup: (id: string, body: { name: string; avatar: AvatarSpec; homeUnit?: UnitId; officeUnit?: UnitId }) =>
    request<{ user: MeUser; office: OfficeInfo; desks: DeskInfo[] }>("POST", `/users/${encodeURIComponent(id)}/setup`, body),
  complete: (id: string, body: { deskId: string | null; officeDeskId?: string }) =>
    request<{ user: MeUser }>("POST", `/users/${encodeURIComponent(id)}/complete`, body),
  patchUser: (id: string, body: { name?: string; avatar?: AvatarSpec; homeUnit?: UnitId }) =>
    request<{ user: MeUser }>("PATCH", `/users/${encodeURIComponent(id)}`, body),
  office: (unitId: UnitId) => request<OfficeResponse>("GET", `/offices/${encodeURIComponent(unitId)}`),
  unit: (unitId: UnitId) => request<UnitResponse>("GET", `/units/${encodeURIComponent(unitId)}`),
};
