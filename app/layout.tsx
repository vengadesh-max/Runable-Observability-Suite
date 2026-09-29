import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Observability Suite — Monitoring Pipeline for Multi-Agent SaaS Platforms',
  description: 'Ops monitoring pipeline watching LLM credit burn, database health, and API uptime with real-time Slack paging.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg text-text-primary min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
