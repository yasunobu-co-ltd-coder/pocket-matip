import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegistration } from './components/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'pocket-matip',
  description: '音声から議事録を自動生成',
  manifest: '/manifest.json',
  openGraph: {
    title: 'pocket-matip',
    description: '音声から議事録を自動生成',
    siteName: 'pocket-matip',
    images: [{ url: '/favicon.png', width: 512, height: 512, alt: 'pocket-matip' }],
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'pocket-matip',
    description: '音声から議事録を自動生成',
    images: ['/favicon.png'],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'pocket-matip',
  },
};

export const viewport: Viewport = {
  themeColor: '#f8fafc',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className="max-w-[600px] mx-auto min-h-screen relative">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
