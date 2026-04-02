const API_BASE = "/api/remote";
const ACCESS_CODE_STORAGE_KEY = "gc_access_code";
const ACCESS_CODE_REQUIRED_EVENT = "gc:access-code-required";

function resolveBackendBaseUrl(): string {
  return API_BASE;
}

const BACKEND_BASE_URL = resolveBackendBaseUrl();

export function getApiBaseCandidates(): string[] {
  return [resolveBackendBaseUrl()];
}

/** 当前前端请求使用的 API 基址（与 apiFetch 一致，用于展示） */
export function getConfiguredApiBaseUrl(): string {
  return resolveBackendBaseUrl();
}

export function getFallbackApiBaseUrl(): string {
  return BACKEND_BASE_URL;
}

export type BackendHealthProbe = {
  url: string;
  ok: boolean;
  status?: number;
  service?: string;
  error?: string;
};

function getAccessCode() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(ACCESS_CODE_STORAGE_KEY) ?? "";
}

export function setAccessCode(code: string) {
  if (typeof window === "undefined") return;
  if (code) {
    localStorage.setItem(ACCESS_CODE_STORAGE_KEY, code);
    return;
  }
  localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
}

export function clearAccessCode() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
}

export function emitAccessCodeRequired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ACCESS_CODE_REQUIRED_EVENT));
}

export function onAccessCodeRequired(handler: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  const wrapped = () => handler();
  window.addEventListener(ACCESS_CODE_REQUIRED_EVENT, wrapped);
  return () => window.removeEventListener(ACCESS_CODE_REQUIRED_EVENT, wrapped);
}

export function getAccessCodeHeaders(): Record<string, string> {
  const code = getAccessCode().trim();
  if (!code) return {};
  return {
    Authorization: `Bearer ${code}`,
    "x-code": code
  };
}

/**
 * 探测后端健康检查（与 apps/backend/src/index.js 中 app.get("/health") 与 app.get("/api/health") 对齐）。
 * 基址为同源代理前缀时（如 /api/remote），Next rewrite 会把 /api/remote/health 转到后端根路径 /health。
 * 优先 /health，避免部分网关对 /api/remote/api/health 的双层 /api 解析异常；404 时再试 /api/health。
 */
export async function probeApiHealth(baseUrl: string, timeoutMs = 4000): Promise<BackendHealthProbe> {
  const base = baseUrl.replace(/\/$/, "");
  const paths = ["/health", "/api/health"];
  let last: BackendHealthProbe = {
    url: baseUrl,
    ok: false,
    error: "无法连接"
  };

  for (const path of paths) {
    const healthUrl = `${base}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(healthUrl, {
        signal: controller.signal,
        mode: "cors",
        credentials: "omit",
        headers: {
          ...getAccessCodeHeaders()
        }
      });
      clearTimeout(timer);
      const data = (await res.json().catch(() => ({}))) as { service?: string; status?: string };
      const probe: BackendHealthProbe = {
        url: baseUrl,
        ok: res.ok,
        status: res.status,
        service: typeof data.service === "string" ? data.service : undefined,
        error: res.ok ? undefined : `HTTP ${res.status}`
      };
      if (res.ok) return probe;
      last = probe;
      if (res.status !== 404) return probe;
    } catch (e) {
      clearTimeout(timer);
      const name = e instanceof Error ? e.name : "";
      last = {
        url: baseUrl,
        ok: false,
        error: name === "AbortError" ? "请求超时" : "无法连接"
      };
    }
  }

  return last;
}

type RequestOptions = RequestInit & {
  retryOnAuthError?: boolean;
  timeoutMs?: number;
  retries?: number;
};

function getJwtToken() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("gc_jwt") ?? "";
}

export function setJwtToken(token: string) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem("gc_jwt", token);
  }
}

export function clearJwtToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("gc_jwt");
}

function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function shouldRetryApiOnAnotherBase(path: string, res: Response): Promise<boolean> {
  if (!path.startsWith("/api/") || res.status !== 404) return false;
  const data = await res.clone().json().catch(() => null);
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error === "not_found") {
    return true;
  }
  // 部分网关返回 404 且无 JSON，仍尝试下一基址
  return data == null;
}

export async function apiFetch(path: string, options: RequestOptions = {}) {
  const { retryOnAuthError = true, timeoutMs = 10000, retries = 1, ...init } = options;
  const authToken = getJwtToken();
  const accessCodeHeaders = getAccessCodeHeaders();
  let response: Response;

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const bases = getApiBaseCandidates();
      let lastRes: Response | null = null;
      for (let b = 0; b < bases.length; b += 1) {
        const baseUrl = bases[b];
        const innerTimeout = withTimeout(timeoutMs);
        try {
          const requestUrl = `${baseUrl}${path}`;
          response = await fetch(requestUrl, {
            ...init,
            signal: innerTimeout.signal,
            mode: "cors",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
              ...accessCodeHeaders,
              ...(init.headers ?? {})
            }
          });
        } finally {
          innerTimeout.clear();
        }
        lastRes = response;
        const retryOther =
          b < bases.length - 1 && (await shouldRetryApiOnAnotherBase(path, response));
        if (!retryOther) {
          break;
        }
      }
      response = lastRes as Response;
      if (response.status >= 500 && attempt < retries) {
        await sleep(250 * (attempt + 1));
        continue;
      }

      if (response.status === 401 && retryOnAuthError) {
        const refreshOk = await tryRefresh(timeoutMs);
        if (refreshOk) {
          return apiFetch(path, { ...options, retryOnAuthError: false });
        }
      }
      if (response.status === 401) {
        emitAccessCodeRequired();
      }

      return response;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(250 * (attempt + 1));
        continue;
      }
    }
  }
  const isAbort = lastError instanceof Error && lastError.name === "AbortError";
  return new Response(
    JSON.stringify({
      error: isAbort ? "request_timeout" : "network_unreachable",
      message: isAbort ? "请求超时，请稍后重试。" : "无法连接后端服务，请确认网关可访问。"
    }),
    {
      status: 503,
      headers: { "Content-Type": "application/json" }
    }
  );
}

export async function tryRefresh(timeoutMs = 8000) {
  const timeout = withTimeout(timeoutMs);
  const refreshUrl = `${BACKEND_BASE_URL}/api/auth/refresh`;
  try {
    const response = await fetch(refreshUrl, {
      method: "POST",
      signal: timeout.signal,
      mode: "cors",
      credentials: "include",
      headers: {
        ...getAccessCodeHeaders()
      }
    });
    timeout.clear();
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      if (typeof data?.accessToken === "string" && data.accessToken) {
        setJwtToken(data.accessToken);
      }
    } else if (response.status === 401) {
      clearJwtToken();
    }
    return response.ok;
  } catch {
    timeout.clear();
    return false;
  }
}
