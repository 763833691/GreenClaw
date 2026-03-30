import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
const ACCESS_COOKIE_NAME = process.env.ACCESS_COOKIE_NAME || "gc_access";
const REFRESH_COOKIE_NAME = process.env.REFRESH_COOKIE_NAME || "gc_refresh";

let dataDir = path.join("/tmp", "data");
let usersPath = path.join(dataDir, "users.json");
let projectsPath = path.join(dataDir, "projects.json");
let refreshTokensPath = path.join(dataDir, "refresh_tokens.json");

app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

async function ensureDataFiles() {
  // Vercel serverless runtime allows writes in /tmp.
  dataDir = path.join("/tmp", "data");
  usersPath = path.join(dataDir, "users.json");
  projectsPath = path.join(dataDir, "projects.json");
  refreshTokensPath = path.join(dataDir, "refresh_tokens.json");

  try {
    await mkdir(dataDir, { recursive: true });
    console.log(`✅ Data directory ready: ${dataDir}`);
  } catch (error) {
    if (error?.code === "EEXIST") {
      console.log(`Data directory already exists: ${dataDir}`);
    } else {
      console.error("❌ Failed to create data directory:", error);
      // For easier testing in serverless, keep running and surface later if file writes fail.
    }
  }

  for (const filePath of [usersPath, projectsPath, refreshTokensPath]) {
    try {
      await readFile(filePath, "utf-8");
    } catch {
      await writeFile(filePath, "[]", "utf-8");
    }
  }

  return dataDir;
}

async function readJson(filePath) {
  const raw = await readFile(filePath, "utf-8");
  return JSON.parse(raw || "[]");
}

async function writeJson(filePath, value) {
  await writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, tokenType: "access" }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, tokenType: "refresh" }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN
  });
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: COOKIE_SECURE,
    sameSite: "strict",
    path: "/",
    maxAge: maxAgeMs
  };
}

async function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  const refreshTokens = await readJson(refreshTokensPath);
  refreshTokens.push({
    token: refreshToken,
    userId: user.id,
    createdAt: new Date().toISOString()
  });
  await writeJson(refreshTokensPath, refreshTokens);

  res.cookie(ACCESS_COOKIE_NAME, accessToken, cookieOptions(15 * 60 * 1000));
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions(30 * 24 * 60 * 60 * 1000));
}

function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE_NAME, { path: "/" });
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
}

function getTokenFromRequest(req) {
  const cookieToken = req.cookies?.[ACCESS_COOKIE_NAME];
  if (cookieToken) return cookieToken;

  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return null;
}

function authMiddleware(req, res, next) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ error: "missing_token" });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.tokenType !== "access") {
      return res.status(401).json({ error: "invalid_token_type" });
    }
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return res.status(401).json({ error: "invalid_token" });
  }
}

app.get("/health", (_, res) => {
  res.json({ status: "ok", service: "backend", timestamp: new Date().toISOString() });
});

async function registerHandler(req, res) {
  const { email, password, name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email_password_required" });
  }

  const users = await readJson(usersPath);
  if (users.some((u) => u.email === email)) {
    return res.status(409).json({ error: "email_exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = {
    id: uuidv4(),
    email,
    name: name || email.split("@")[0],
    passwordHash,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  await writeJson(usersPath, users);

  await issueSession(res, user);
  return res.status(201).json({
    user: { id: user.id, email: user.email, name: user.name }
  });
}

async function loginHandler(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "email_password_required" });
  }

  const users = await readJson(usersPath);
  const user = users.find((u) => u.email === email);
  if (!user) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ error: "invalid_credentials" });
  }

  await issueSession(res, user);
  return res.json({
    user: { id: user.id, email: user.email, name: user.name }
  });
}

async function refreshHandler(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (!refreshToken) {
    return res.status(401).json({ error: "missing_refresh_token" });
  }

  const refreshTokens = await readJson(refreshTokensPath);
  const stored = refreshTokens.find((rt) => rt.token === refreshToken);
  if (!stored) {
    clearSessionCookies(res);
    return res.status(401).json({ error: "refresh_not_found" });
  }

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    if (payload.tokenType !== "refresh") {
      clearSessionCookies(res);
      return res.status(401).json({ error: "invalid_token_type" });
    }

    const users = await readJson(usersPath);
    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      clearSessionCookies(res);
      return res.status(401).json({ error: "user_not_found" });
    }

    const accessToken = signAccessToken(user);
    res.cookie(ACCESS_COOKIE_NAME, accessToken, cookieOptions(15 * 60 * 1000));
    return res.json({ ok: true });
  } catch {
    clearSessionCookies(res);
    return res.status(401).json({ error: "invalid_refresh_token" });
  }
}

async function logoutHandler(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
  if (refreshToken) {
    const refreshTokens = await readJson(refreshTokensPath);
    const nextTokens = refreshTokens.filter((rt) => rt.token !== refreshToken);
    await writeJson(refreshTokensPath, nextTokens);
  }
  clearSessionCookies(res);
  return res.json({ ok: true });
}

app.post("/api/auth/register", registerHandler);
app.post("/api/auth/login", loginHandler);
app.post("/api/auth/refresh", refreshHandler);
app.post("/api/auth/logout", logoutHandler);
app.post("/auth/register", registerHandler);
app.post("/auth/login", loginHandler);
app.post("/auth/refresh", refreshHandler);
app.post("/auth/logout", logoutHandler);

app.get("/api/me", authMiddleware, async (req, res) => {
  const users = await readJson(usersPath);
  const user = users.find((u) => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: "user_not_found" });
  }
  return res.json({ id: user.id, email: user.email, name: user.name });
});

app.get("/api/projects", authMiddleware, async (req, res) => {
  const projects = await readJson(projectsPath);
  const ownProjects = projects.filter((p) => p.ownerId === req.user.id);
  return res.json({ items: ownProjects });
});

app.post("/api/projects", authMiddleware, async (req, res) => {
  const { name, buildingType, city } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: "name_required" });
  }
  const projects = await readJson(projectsPath);
  const now = new Date().toISOString();
  const project = {
    id: uuidv4(),
    ownerId: req.user.id,
    name,
    buildingType: buildingType || "公共建筑",
    city: city || "上海",
    params: {},
    createdAt: now,
    updatedAt: now
  };
  projects.push(project);
  await writeJson(projectsPath, projects);
  return res.status(201).json(project);
});

app.get("/api/projects/:id", authMiddleware, async (req, res) => {
  const projects = await readJson(projectsPath);
  const project = projects.find((p) => p.id === req.params.id && p.ownerId === req.user.id);
  if (!project) {
    return res.status(404).json({ error: "project_not_found" });
  }
  return res.json(project);
});

app.patch("/api/projects/:id/params", authMiddleware, async (req, res) => {
  const { patch, meta } = req.body || {};
  if (!patch || typeof patch !== "object") {
    return res.status(400).json({ error: "patch_required" });
  }
  const projects = await readJson(projectsPath);
  const idx = projects.findIndex((p) => p.id === req.params.id && p.ownerId === req.user.id);
  if (idx < 0) {
    return res.status(404).json({ error: "project_not_found" });
  }
  projects[idx].params = { ...projects[idx].params, ...patch };
  if (meta && typeof meta === "object") {
    if (typeof meta.buildingType === "string") {
      projects[idx].buildingType = meta.buildingType;
    }
    if (typeof meta.city === "string") {
      projects[idx].city = meta.city;
    }
  }
  projects[idx].updatedAt = new Date().toISOString();
  await writeJson(projectsPath, projects);
  return res.json(projects[idx]);
});

app.post("/api/calculate", authMiddleware, async (req, res) => {
  const { projectId } = req.body || {};
  if (!projectId) {
    return res.status(400).json({ error: "project_id_required" });
  }

  try {
    const projects = await readJson(projectsPath);
    const project = projects.find((p) => p.id === projectId && p.ownerId === req.user.id);
    if (!project) {
      return res.status(404).json({ error: "project_not_found" });
    }

    // 1. 调用 calculation 包进行真实计算
    const { calculateProject } = await import("@greenclaw/calculation");
    const jobId = uuidv4();

    // 异步触发计算（推荐用队列，但先用立即计算）
    const result = await calculateProject(project);

    // 2. 保存计算结果到项目
    const idx = projects.findIndex((p) => p.id === projectId);
    projects[idx].params = { ...projects[idx].params, ...result.params };
    projects[idx].lastCalculatedAt = new Date().toISOString();
    await writeJson(projectsPath, projects);

    return res.json({
      jobId,
      status: "completed",
      message: "calculation_completed",
      result
    });
  } catch (error) {
    console.error("Calculate error:", error);
    return res.status(500).json({
      error: "calculation_failed",
      message: error?.message || "unknown_error"
    });
  }
});

await ensureDataFiles();

// 导出 app，供 Vercel Serverless Function 使用
export default app;
