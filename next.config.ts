import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 워크스페이스 루트 설정 (lockfile 경고 해결)
  outputFileTracingRoot: __dirname,
  
  // 성능 최적화
  compress: true,
  
  // 보안 설정
  poweredByHeader: false,
  
  // 이미지 최적화
  images: {
    unoptimized: false,
  },
  
  // 웹팩 설정
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
};

export default nextConfig;
