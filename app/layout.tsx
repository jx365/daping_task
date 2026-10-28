import type { Metadata } from 'next';
import './globals.css';

// 构建阶段不预渲染页面，避免静态生成并行 Worker 内存爆掉（SIGSEGV）
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: '任务参与统计',
  description: '内部任务参与次数统计',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-dvh bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
