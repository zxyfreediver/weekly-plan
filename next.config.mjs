import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 生成独立的 server 产物，便于打包成轻量 Docker 镜像
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
