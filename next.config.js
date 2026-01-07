// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: true,
  experimental: {
    // 启用输出目录导出
    output: 'export',
  },
  images: {
    unoptimized: true, // 由于使用export模式，禁用Next.js图像优化
  },
  // 避免构建时的错误
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // 在客户端禁用 fs 模块
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;