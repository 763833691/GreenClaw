const DEFAULT_GATEWAY = "http://localhost:18789";
const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE ??
  process.env.NEXT_PUBLIC_GATEWAY_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  DEFAULT_GATEWAY;

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

export async function apiFetch(path: string, options: RequestOptions = {}) {
  const { retryOnAuthError = true, timeoutMs = 10000, retries = 1, ...init } = options;
  const authToken = getJwtToken();
  let response: Response;

  let lastError: unknown = null;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const timeout = withTimeout(timeoutMs);
    try {
      response = await fetch(`${BACKEND_BASE_URL}${path}`, {
        ...init,
        signal: timeout.signal,
        mode: "cors",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(init.headers ?? {})
        }
      });
      timeout.clear();
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
      timeout.clear();
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
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/refresh`, {
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
