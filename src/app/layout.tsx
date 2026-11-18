import { Analytics } from '@vercel/analytics/react';
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fff8ec',
};

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'https://holding-it-two.vercel.app'
  ),
  title: "Holding It — The World's Live Bladder & Bowel Bureau",
  description:
    'Track holding it live with strangers worldwide, battle constipation in the trenches, and get your official court ruling certificate. No signups, 100% free.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-180.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Holding It',
    statusBarStyle: 'default',
  },
  openGraph: {
    type: 'website',
    title: "Holding It — The World's Live Bladder & Bowel Bureau",
    description:
      'Track holding it live with strangers worldwide, battle constipation in the trenches, and get your official court ruling certificate.',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Holding It — The World's Live Bladder & Bowel Bureau",
    description:
      'Track holding it live with strangers worldwide, battle constipation in the trenches, and get your official court ruling certificate.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400;500;600;700&family=Courier+Prime:wght@400;700&family=Fredoka:wght@400;500;700;800&family=Vazirmatn:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Handjet:wght@400..800&text=%DB%B0%DB%B1%DB%B2%DB%B3%DB%B4%DB%B5%DB%B6%DB%B7%DB%B8%DB%B9&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
