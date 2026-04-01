/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true },
  async rewrites() {
    return [
      {
        // 将所有以 /api/remote 开头的请求转发到阿里云
        source: "/api/remote/:path*",
        destination: "http://101.133.237.134:4000/:path*"
      }
    ];
  }
};

export default nextConfig;
