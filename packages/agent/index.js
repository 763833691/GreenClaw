import http from "node:http";
import { calculateProject } from "@greenclaw/calculation";

const PORT = Number(process.env.GATEWAY_PORT || process.env.PORT || 18789);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
const CALC_ENGINE_URL = process.env.CALC_ENGINE_URL || "http://localhost:8000";

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
    "Access-Control-Allow-Credentials": "true"
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

async function callPythonCalculator(project) {
  const response = await fetch(`${CALC_ENGINE_URL}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project })
  });
  if (!response.ok) {
    throw new Error(`python_calculator_http_${response.status}`);
  }
  return response.json();
}

async function runCalculation(project) {
  // Prefer python service if /calculate is available; fallback to local JS tool.
  try {
    const remote = await callPythonCalculator(project);
    return { source: "python-calculator", result: remote };
  } catch {
    const local = await calculateProject(project);
    return { source: "local-calculation-package", result: local };
  }
}

function inferPatchFromMessage(message) {
  const patch = {};
  if (message.includes("保温")) patch.wallInsulation = "thicker_5cm";
  if (message.includes("窗墙比")) patch.windowWallRatio = "0.35";
  if (message.includes("遮阳")) patch.shadingStrategy = "external_louver";
  return patch;
}

async function handleAgentChat(req, res) {
  const body = await readJsonBody(req);
  if (!body) {
    sendJson(res, 400, { error: "invalid_json" });
    return;
  }

  const message = typeof body.message === "string" ? body.message : "";
  const project = body.project && typeof body.project === "object" ? body.project : null;
  if (!message) {
    sendJson(res, 400, { error: "message_required" });
    return;
  }

  const lower = message.toLowerCase();
  const needCalc = lower.includes("计算") || lower.includes("重算") || lower.includes("优化");
  const patch = inferPatchFromMessage(message);
  const patchedProject = project ? { ...project, params: { ...(project.params || {}), ...patch } } : null;

  if (needCalc && patchedProject) {
    const calculation = await runCalculation(patchedProject);
    sendJson(res, 200, {
      mode: "openclaw-agent-loop",
      message,
      steps: [
        { step: "intent", detail: "解析优化意图" },
        { step: "tool_call", detail: "调用 calculate_project 工具", tool: calculation.source }
      ],
      projectPatch: patch,
      calculationSource: calculation.source,
      calculation: calculation.result,
      reply: "已根据意图更新参数并完成计算。"
    });
    return;
  }

  sendJson(res, 200, {
    mode: "openclaw-agent-loop",
    message,
    steps: [{ step: "intent", detail: "解析优化意图" }],
    projectPatch: patch,
    reply: project ? "请在消息中加入“计算/重算/优化”触发工具调用。" : "请提供 project 对象以执行计算。"
  });
}

async function handleApiCalculate(req, res) {
  const body = await readJsonBody(req);
  if (!body) {
    sendJson(res, 400, { error: "invalid_json" });
    return;
  }

  const project = body.project && typeof body.project === "object" ? body.project : null;
  if (!project) {
    sendJson(res, 400, { error: "project_required" });
    return;
  }

  const calculation = await runCalculation(project);
  sendJson(res, 200, {
    status: "ok",
    calculationSource: calculation.source,
    result: calculation.result
  });
}

async function handleProxyCalcHealth(res) {
  try {
    const response = await fetch(`${CALC_ENGINE_URL}/health`);
    const data = await response.json();
    sendJson(res, response.status, {
      status: "ok",
      service: "gateway",
      calcEngineUrl: CALC_ENGINE_URL,
      calcHealth: data
    });
  } catch (error) {
    sendJson(res, 502, {
      status: "degraded",
      service: "gateway",
      calcEngineUrl: CALC_ENGINE_URL,
      error: String(error)
    });
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": FRONTEND_ORIGIN,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    });
    res.end();
    return;
  }

  if ((req.url === "/health" || req.url === "/api/health") && req.method === "GET") {
    sendJson(res, 200, {
      status: "ok",
      service: "gateway",
      timestamp: new Date().toISOString()
    });
    return;
  }

  if (req.url === "/api/calc/health" && req.method === "GET") {
    await handleProxyCalcHealth(res);
    return;
  }

  if ((req.url === "/agent/chat" || req.url === "/api/agent/chat") && req.method === "POST") {
    await handleAgentChat(req, res);
    return;
  }

  if (req.url === "/api/calculate" && req.method === "POST") {
    await handleApiCalculate(req, res);
    return;
  }

  sendJson(res, 404, { error: "not_found", message: `Route ${req.method} ${req.url} not found` });
});

server.listen(PORT, () => {
  console.log(`OpenClaw Gateway running on http://localhost:${PORT}`);
  console.log(`Calculator endpoint: ${CALC_ENGINE_URL}`);
});
