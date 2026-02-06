import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 워크스페이스 루트 설정 (lockfile 경고 해결)
  outputFileTracingRoot: __dirname,

  // 개발 시 GET /api ... 로그 제거 (콘솔 노이즈 감소)
  logging: {
    incomingRequests: {
      ignore: [/\/api\//],
    },
  },

  // 성능 최적화
  compress: true,
  
  // 보안 설정
  poweredByHeader: false,
  
  // 개발 인디케이터 비활성화 (화면 하단 N 버튼 숨김)
  devIndicators: false,
  
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
