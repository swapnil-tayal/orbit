import { createServer } from "node:http";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import express from "express";
import { Server } from "socket.io";
import { CONFIG } from "@orbit/shared";
import { migrate } from "./db/schema.ts";
import { createRepo } from "./db/repo.ts";
import { World } from "./world/state.ts";
import { seed } from "./seed/seed.ts";
import { createRoutes } from "./http/routes.ts";
import { createAuthRoutes, type AuthConfig } from "./http/auth.ts";
import { attachHandlers, createEmitter } from "./socket/handlers.ts";
import { BotSimulator } from "./bots/simulator.ts";
import { land } from "./world/geo.ts";

process.removeAllListeners("warning");
process.on("warning", (w) => {
  if (w.name !== "ExperimentalWarning") console.warn(w);
});

const here = dirname(fileURLToPath(import.meta.url));
const dev = process.argv.includes("--dev");
const envFile = join(here, "..", ".env");
if (existsSync(envFile)) process.loadEnvFile(envFile);
const sessionSecret = process.env.SESSION_SECRET ?? (dev ? "orbit-dev-only-secret" : "");
if (!sessionSecret) {
  console.error("SESSION_SECRET is required outside dev mode");
  process.exit(1);
}
const auth: AuthConfig = { googleClientId: process.env.GOOGLE_CLIENT_ID || null, secret: sessionSecret, dev };
const corsOrigins = (process.env.CORS_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim().replace(/\/+$/, ""))
  .filter(Boolean);
const allowOrigin = (origin: string | undefined): boolean => !!origin && (dev || corsOrigins.includes(origin));
const port = Number(process.env.PORT ?? 3001);
const dbFile = process.env.ORBIT_DB ?? join(here, "..", "data", "orbit.db");
const botsEnabled = process.env.ORBIT_BOTS === "1";

const { openDatabase } = await import("./db/driver.ts");
const db = openDatabase(dbFile);
migrate(db);
const repo = createRepo(db);
const world = new World(repo);
seed(repo, world, botsEnabled);
world.loadAll();
land();

const app = express();
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Headers", "authorization, content-type, ngrok-skip-browser-warning");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
    res.setHeader("Access-Control-Max-Age", "600");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});
app.use(express.json({ limit: "64kb" }));
app.use("/api/auth", createAuthRoutes(world, auth));
app.use("/api", createRoutes(world, auth));

const clientDist = join(here, "..", "..", "client", "dist");
if (!dev && existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(clientDist, "index.html")));
}

const http = createServer(app);
const io = new Server(http, {
  pingInterval: 5000,
  pingTimeout: 10000,
  cors: { origin: (origin, cb) => cb(null, !origin || allowOrigin(origin)), allowedHeaders: ["ngrok-skip-browser-warning"] },
});
world.emitter = createEmitter(io, world);
attachHandlers(io, world, auth);

const bots = new BotSimulator(world);
if (botsEnabled) bots.start();

setInterval(() => world.flushPositions(), CONFIG.rates.persistPositionMs);

http.listen(port, () => {
  console.log(`orbit server on http://localhost:${port} (${dev ? "dev" : "prod"}) db=${dbFile} bots=${botsEnabled ? "on" : "off"} google=${auth.googleClientId ? "on" : "off"} cors=${dev ? "any" : corsOrigins.join(",") || "none"}`);
});

function shutdown(): void {
  bots.stop();
  world.flushPositions();
  io.close();
  http.close();
  db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
