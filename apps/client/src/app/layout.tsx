import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { Providers } from './providers';
import { Header } from '@/components/layout/header';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'Video Search',
  description: 'Search your videos by describing scenes or what was said'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <Providers>
          <div className="bg-background relative min-h-screen">
            <Header />
            <main>{children}</main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
