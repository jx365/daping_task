/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 使用完整 node_modules + `next start`，不再用 standalone
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'exceljs'],
    cpus: 1,
    workerThreads: false,
  },
};

module.exports = nextConfig;
