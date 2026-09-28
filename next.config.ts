import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "10.2.0.2",
    "127.0.0.1:3000",
    "localhost:3000",
    "10.2.0.2:3000"
  ],
};

export default nextConfig;
