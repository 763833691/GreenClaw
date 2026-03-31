const DEFAULT_GATEWAY = "http://localhost:18789";

export function getGatewayBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE ??
    process.env.NEXT_PUBLIC_GATEWAY_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    DEFAULT_GATEWAY
  );
}

export function getAgentWsUrl(path = "/ws/agent") {
  const base = getGatewayBaseUrl();
  const wsBase = base.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
  return `${wsBase}${path}`;
}

export function createAgentSocket(path = "/ws/agent") {
  if (typeof window === "undefined") return null;
  return new WebSocket(getAgentWsUrl(path));
}
