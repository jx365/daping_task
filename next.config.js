/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'exceljs'],
    // 单 CPU 构建，避免静态生成并行 Worker 在小内存机上 SIGSEGV
    cpus: 1,
    workerThreads: false,
  },
  // 确保 API 在 standalone 镜像中能找到原生/重型依赖
  outputFileTracingIncludes: {
    '/api/**/*': [
      './node_modules/better-sqlite3/**/*',
      './node_modules/exceljs/**/*',
    ],
    '/*': [
      './node_modules/better-sqlite3/**/*',
      './node_modules/exceljs/**/*',
    ],
  },
};

module.exports = nextConfig;
