import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#fff8ec',
};

export const metadata: Metadata = {
  title: 'نگه داشتم — زنده',
  description: 'ثبت زنده‌ی مأموریت‌های دستشویی، آمار روزانه و پیدا کردن دستشویی نزدیک؛ بدون ثبت‌نام.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-180.png',
  },
  openGraph: {
    type: 'website',
    title: 'نگه داشتم — دادگاه عالی امور مثانه و روده',
    description: 'مأموریت‌های سبک، سنگین و نبردهای یبوست را ثبت کن و حکم رسمی مثانه و روده‌ات را بگیر.',
  },
  twitter: {
    card: 'summary',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
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
      <body>{children}</body>
    </html>
  );
}
