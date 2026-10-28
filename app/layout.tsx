import type { Metadata } from 'next';
import './globals.css';

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
