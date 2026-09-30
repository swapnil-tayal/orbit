import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type NextFunction, type Request, type Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { CONFIG, DEFAULT_AVATAR, type UserId } from "@orbit/shared";
import type { World } from "../world/state.ts";
import type { StoredUser } from "../db/repo.ts";

const TOKEN_DAYS = 30;

export interface AuthConfig {
  googleClientId: string | null;
  secret: string;
  dev: boolean;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function signToken(secret: string, userId: UserId): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_DAYS * 86400;
  const body = `${b64url(Buffer.from(userId))}.${exp}`;
  const mac = b64url(createHmac("sha256", secret).update(body).digest());
  return `${body}.${mac}`;
}

export function verifyToken(secret: string, token: unknown): UserId | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [idPart, expPart, macPart] = parts;
  const expected = createHmac("sha256", secret).update(`${idPart}.${expPart}`).digest();
  let given: Buffer;
  try {
    given = Buffer.from(macPart, "base64url");
  } catch {
    return null;
  }
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const exp = Number(expPart);
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return null;
  const userId = Buffer.from(idPart, "base64url").toString();
  return /^[A-Za-z0-9_-]{6,64}$/.test(userId) ? userId : null;
}

export function userFromRequest(auth: AuthConfig, req: Request): UserId | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return verifyToken(auth.secret, header.slice(7).trim());
}

export function requireSelf(auth: AuthConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userId = userFromRequest(auth, req);
    if (!userId || userId !== req.params.id) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    next();
  };
}

function cleanName(input: unknown): string {
  if (typeof input !== "string") return "Guest";
  const n = input.trim().replace(/\s+/g, " ").slice(0, 24);
  return n.length ? n : "Guest";
}

function newUser(id: UserId, name: string, now: number): StoredUser {
  return {
    id,
    name,
    isBot: false,
    avatar: { ...DEFAULT_AVATAR },
    homeUnit: null,
    homeDeskId: null,
    officeUnit: null,
    officeDeskId: null,
    currentUnit: null,
    spaceId: null,
    posX: null,
    posY: null,
    onboarded: false,
    lastMode: null,
    createdAt: now,
    lastSeenAt: now,
  };
}

export function createAuthRoutes(world: World, auth: AuthConfig): Router {
  const r = Router();
  const google = auth.googleClientId ? new OAuth2Client(auth.googleClientId) : null;

  r.get("/config", (_req, res) => {
    res.json({ google: !!google, dev: auth.dev });
  });

  r.post("/google", async (req, res) => {
    if (!google || !auth.googleClientId) {
      res.status(503).json({ error: "google_not_configured" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (typeof body.credential !== "string" && typeof body.accessToken !== "string") {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    let sub: string;
    let email: string | null;
    let name: string;
    try {
      if (typeof body.credential === "string") {
        const ticket = await google.verifyIdToken({ idToken: body.credential, audience: auth.googleClientId });
        const p = ticket.getPayload();
        if (!p || !p.sub || p.email_verified === false) throw new Error("no payload");
        sub = p.sub;
        email = p.email ?? null;
        name = cleanName(p.given_name ?? p.name);
      } else {
        const accessToken = body.accessToken as string;
        const info = await google.getTokenInfo(accessToken);
        if (info.aud !== auth.googleClientId || !info.sub) throw new Error("wrong audience");
        const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { authorization: `Bearer ${accessToken}` } });
        if (!r.ok) throw new Error("userinfo failed");
        const u = (await r.json()) as { sub?: string; email?: string; email_verified?: boolean; given_name?: string; name?: string };
        if (u.sub !== info.sub || u.email_verified === false) throw new Error("userinfo mismatch");
        sub = info.sub;
        email = u.email ?? info.email ?? null;
        name = cleanName(u.given_name ?? u.name);
      }
    } catch {
      res.status(401).json({ error: "invalid_google_token" });
      return;
    }
    let id = world.repo.users.byGoogleSub(sub);
    if (!id && auth.dev && typeof body.linkUserId === "string") {
      const legacy = world.repo.users.get(body.linkUserId);
      if (legacy && !legacy.isBot && !world.repo.users.googleSubOf(legacy.id)) {
        world.repo.users.setGoogle(legacy.id, sub, email);
        id = legacy.id;
      }
    }
    if (!id) {
      if (world.repo.users.countHumans() >= CONFIG.maxUsers) {
        res.status(403).json({ error: "world_full" });
        return;
      }
      id = `u_${randomBytes(12).toString("hex")}`;
      const stored = newUser(id, name, world.now());
      world.repo.users.insert(stored);
      world.repo.users.setGoogle(id, sub, email);
      world.addUser(stored);
    } else {
      world.repo.users.setGoogle(id, sub, email);
    }
    const live = world.users.get(id);
    if (!live) {
      res.status(500).json({ error: "user_missing" });
      return;
    }
    res.json({ token: signToken(auth.secret, id), user: world.meUser(live) });
  });

  r.post("/dev", (req, res) => {
    if (!auth.dev) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    const body = (req.body ?? {}) as Record<string, unknown>;
    const profile = typeof body.profile === "string" && /^[A-Za-z0-9_-]{1,16}$/.test(body.profile) ? body.profile : null;
    if (!profile) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const id = `u_dev_${profile}`;
    if (!world.users.get(id)) {
      if (world.repo.users.countHumans() >= CONFIG.maxUsers) {
        res.status(403).json({ error: "world_full" });
        return;
      }
      const stored = newUser(id, cleanName(profile), world.now());
      world.repo.users.insert(stored);
      world.addUser(stored);
    }
    const live = world.users.get(id)!;
    res.json({ token: signToken(auth.secret, id), user: world.meUser(live) });
  });

  r.get("/me", (req, res) => {
    const id = userFromRequest(auth, req);
    const live = id ? world.users.get(id) : null;
    if (!live) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    res.json({ user: world.meUser(live) });
  });

  return r;
}
