import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal ATS Resume-Matcher & Optimization Studio',
  description: 'Local Next.js web application for 3-pass ATS matching, industry lensing, 3-tier gap suggestions, and raw-extraction parseability harness.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080c14] text-gray-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
