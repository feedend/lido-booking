import './globals.css';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import dynamic from 'next/dynamic'; // <-- Importa il caricatore dinamico

const inter = Inter({ subsets: ['latin'] });

// Carica il componente Manifest SOLO sul client, evitando crash di idratazione o Error #321
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
        {/* Ora viene eseguito in totale sicurezza solo sul browser */}
        <DynamicManifest />
        {children}
      </body>
    </html>
  );
}
