import type { Metadata } from 'next';
import { Belleza, Cormorant_Garamond, Geist } from 'next/font/google';
import './globals.css';

const geist = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });

// Aproximação do serifado da marca (o original não veio em arquivo).
const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

// Substituta da Optima em quem não tem a fonte (Windows, Android). No Mac a Optima
// do sistema vence — ver `.optima` no globals.css.
const belleza = Belleza({ variable: '--font-belleza', subsets: ['latin'], weight: '400' });

export const metadata: Metadata = {
  title: 'La Fortuna Academy',
  description: 'Área das tutoras e área das mentoradas.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script abaixo põe `data-tema` antes do React chegar.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          // Aplica o tema escolhido antes de pintar, para a página não piscar.
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('tema');if(t==='claro'||t==='escuro')document.documentElement.dataset.tema=t}catch(e){}`,
          }}
        />
      </head>
      <body className={`${geist.variable} ${cormorant.variable} ${belleza.variable} antialiased`}>{children}</body>
    </html>
  );
}
