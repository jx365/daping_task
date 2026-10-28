/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['exceljs'],
    cpus: 1,
    workerThreads: false,
  },
};

module.exports = nextConfig;
