/**
 * 将浏览器请求的同源 `/api/*` 转发到公网临时后端（ngrok / 云主机）。
 * 在 Vercel 项目环境变量中设置 VERCEL_BACKEND_ORIGIN（或 BACKEND_PROXY_URL），无需写进代码仓库。
 */
const backendOrigin = (process.env.VERCEL_BACKEND_ORIGIN || process.env.BACKEND_PROXY_URL || "").replace(/\/$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true },
  async rewrites() {
    if (!backendOrigin) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`
      }
    ];
  }
};

export default nextConfig;
