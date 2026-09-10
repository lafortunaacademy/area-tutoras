import type { Metadata } from 'next';
import { Cormorant_Garamond, Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

// Aproximação do serifado da marca (o original não veio em arquivo).
const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Área das tutoras | La Fortuna Academy',
  description: 'Acompanhamento das mentoradas.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} ${cormorant.variable} antialiased`}>{children}</body>
    </html>
  );
}
