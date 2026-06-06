import './globals.css';
import { Inter } from 'next/font/google';
import DynamicManifest from '@/components/DynamicManifest';
import { Metadata } from 'next';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Stabilimento Balneare Santa Severa',
  description: 'Sistema di prenotazione e controllo accessi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className={inter.className}>
        {/* Inietta dinamicamente il manifest corretto in base all'URL (Admin, Operatore, Bagnante) */}
        <DynamicManifest />
        {children}
      </body>
    </html>
  );
}
