const API_BASE = "/api/remote";

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

/**
 * 探测指定基址的 /api/health，用于首页展示「是否连对后端」。
 */
export async function probeApiHealth(baseUrl: string, timeoutMs = 4000): Promise<BackendHealthProbe> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const healthUrl = `${baseUrl}/api/health`;
  try {
    const res = await fetch(healthUrl, {
      signal: controller.signal,
      mode: "cors",
      credentials: "omit"
    });
    clearTimeout(timer);
    const data = (await res.json().catch(() => ({}))) as { service?: string; status?: string };
    return {
      url: baseUrl,
      ok: res.ok,
      status: res.status,
      service: typeof data.service === "string" ? data.service : undefined,
      error: res.ok ? undefined : `HTTP ${res.status}`
    };
  } catch (e) {
    clearTimeout(timer);
    const name = e instanceof Error ? e.name : "";
    return {
      url: baseUrl,
      ok: false,
      error: name === "AbortError" ? "请求超时" : "无法连接"
    };
  }
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
      credentials: "include"
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
