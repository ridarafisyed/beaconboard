import type { Metadata } from 'next';
import { Geist } from 'next/font/google';

import { Providers } from './providers';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Beaconboard',
  description: 'Real-time HTTP monitoring dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} min-h-screen bg-gray-50 text-gray-900 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
