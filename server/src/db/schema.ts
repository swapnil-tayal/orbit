import type { Db } from "./driver.ts";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_bot INTEGER NOT NULL DEFAULT 0,
  avatar_json TEXT NOT NULL,
  home_unit TEXT,
  home_desk_id TEXT,
  office_unit TEXT,
  office_desk_id TEXT,
  current_unit TEXT,
  space_id TEXT,
  pos_x REAL,
  pos_y REAL,
  onboarded INTEGER NOT NULL DEFAULT 0,
  last_mode TEXT,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS offices (
  unit_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rows INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS desks (
  id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL REFERENCES offices(unit_id),
  idx INTEGER NOT NULL,
  owner_id TEXT,
  claimed_at INTEGER,
  UNIQUE(unit_id, idx)
);
CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  template TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS desks_owner ON desks(owner_id);
CREATE INDEX IF NOT EXISTS users_unit ON users(current_unit);
`;

export function migrate(db: Db): void {
  db.exec(SCHEMA);
  const cols = new Set(db.prepare("PRAGMA table_info(users)").all().map((r) => String(r.name)));
  if (!cols.has("google_sub")) db.exec("ALTER TABLE users ADD COLUMN google_sub TEXT");
  if (!cols.has("email")) db.exec("ALTER TABLE users ADD COLUMN email TEXT");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL");
}
