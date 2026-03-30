import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectRecord, UserRecord } from "./types.js";

type DbShape = {
  users: UserRecord[];
  projects: ProjectRecord[];
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../../..");
const dataDir = path.resolve(rootDir, "data");
const dbFile = path.resolve(dataDir, "backend-db.json");

function ensureDbFile() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbFile)) {
    const initial: DbShape = { users: [], projects: [] };
    fs.writeFileSync(dbFile, JSON.stringify(initial, null, 2), "utf-8");
  }
}

export function readDb(): DbShape {
  ensureDbFile();
  const raw = fs.readFileSync(dbFile, "utf-8");
  return JSON.parse(raw) as DbShape;
}

export function writeDb(db: DbShape) {
  ensureDbFile();
  fs.writeFileSync(dbFile, JSON.stringify(db, null, 2), "utf-8");
}

export function listProjectsForUser(userId: string): ProjectRecord[] {
  const db = readDb();
  return db.projects.filter((p) => p.ownerId === userId);
}
