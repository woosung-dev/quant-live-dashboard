import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { NetworkStatusProvider } from "@/hooks/useNetworkStatus"
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL('https://quant-live-dashboard.vercel.app'),
  title: {
    template: '%s | Quant Live',
    default: 'Quant Live Dashboard - AI 기반 퀀트 트레이딩 플랫폼',
  },
  description: '실시간 암호화폐 백테스팅, 자동매매 봇, 전략 마켓플레이스를 제공하는 AI 기반 퀀트 트레이딩 플랫폼. Pine Script 지원, Binance 연동.',
  keywords: ['퀀트 트레이딩', 'crypto trading', 'backtesting', 'trading bot', 'Pine Script', 'Binance', '암호화폐', '자동매매'],
  authors: [{ name: 'Quant Live Team' }],
  creator: 'Quant Live',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Quant Live Dashboard - AI 기반 퀀트 트레이딩',
    description: '실시간 암호화폐 백테스팅, 자동매매 봇, 전략 마켓플레이스',
    siteName: 'Quant Live',
    type: 'website',
    locale: 'ko_KR',
    url: 'https://quant-live-dashboard.vercel.app',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quant Live Dashboard',
    description: 'AI 기반 퀀트 트레이딩 플랫폼',
  },
  alternates: {
    canonical: 'https://quant-live-dashboard.vercel.app',
    languages: {
      'en': 'https://quant-live-dashboard.vercel.app/en',
      'ko': 'https://quant-live-dashboard.vercel.app/ko',
    },
  },
};

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;
  if (!routing.locales.includes(locale as any)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-background font-sans text-foreground" suppressHydrationWarning>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NetworkStatusProvider>
              {children}
            </NetworkStatusProvider>
            <Toaster />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

