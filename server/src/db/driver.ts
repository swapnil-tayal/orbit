import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type Row = Record<string, unknown>;

export interface Statement {
  run(...params: unknown[]): { changes: number };
  get(...params: unknown[]): Row | undefined;
  all(...params: unknown[]): Row[];
}

export interface Db {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  transaction<T>(fn: () => T): T;
  close(): void;
}

export function openDatabase(file: string): Db {
  if (file !== ":memory:") mkdirSync(dirname(file), { recursive: true });
  const raw = new DatabaseSync(file);
  raw.exec("PRAGMA journal_mode = WAL");
  raw.exec("PRAGMA foreign_keys = ON");
  raw.exec("PRAGMA busy_timeout = 2000");
  let depth = 0;
  return {
    prepare(sql) {
      const st = raw.prepare(sql);
      return {
        run: (...params) => {
          const r = st.run(...(params as never[]));
          return { changes: Number(r.changes) };
        },
        get: (...params) => st.get(...(params as never[])) as Row | undefined,
        all: (...params) => st.all(...(params as never[])) as Row[],
      };
    },
    exec: (sql) => raw.exec(sql),
    transaction(fn) {
      if (depth > 0) return fn();
      depth++;
      raw.exec("BEGIN IMMEDIATE");
      try {
        const out = fn();
        raw.exec("COMMIT");
        return out;
      } catch (e) {
        raw.exec("ROLLBACK");
        throw e;
      } finally {
        depth--;
      }
    },
    close: () => raw.close(),
  };
}
