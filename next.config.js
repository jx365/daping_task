/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'exceljs'],
    // 单 CPU 构建，避免静态生成并行 Worker 在小内存机上 SIGSEGV
    cpus: 1,
    workerThreads: false,
  },
};

module.exports = nextConfig;
