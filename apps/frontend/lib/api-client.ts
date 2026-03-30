const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type RequestOptions = RequestInit & { retryOnAuthError?: boolean };

export async function apiFetch(path: string, options: RequestOptions = {}) {
  const { retryOnAuthError = true, ...init } = options;
  let response: Response;
  try {
    response = await fetch(`${BACKEND_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {})
      }
    });
  } catch {
    return new Response(
      JSON.stringify({
        error: "network_unreachable",
        message: "无法连接后端服务，请确认 backend 已启动。"
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" }
      }
    );
  }

  if (response.status === 401 && retryOnAuthError) {
    const refreshOk = await tryRefresh();
    if (refreshOk) {
      return apiFetch(path, { ...options, retryOnAuthError: false });
    }
  }

  return response;
}

export async function tryRefresh() {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include"
    });
    return response.ok;
  } catch {
    return false;
  }
}
