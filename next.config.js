/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'exceljs'],
    // 限制静态生成 Worker 并发，降低小内存机器构建时 OOM/SIGSEGV 风险
    cpus: 1,
  },
};

module.exports = nextConfig;
