const API_BASE = "http://101.133.237.134:4000";

export function getGatewayBaseUrl() {
  return API_BASE;
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
