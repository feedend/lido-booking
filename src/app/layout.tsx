import './globals.css';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import dynamic from 'next/dynamic';

const inter = Inter({ subsets: ['latin'] });

// Carica il gestore del manifest e del Service Worker SOLO ed esclusivamente sul browser client
const DynamicManifest = dynamic(() => import('@/components/DynamicManifest'), {
  ssr: false,
});

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
        {/* Eseguito in totale sicurezza sul browser dopo l'idratazione */}
        <DynamicManifest />
        {children}
      </body>
    </html>
  );
}
