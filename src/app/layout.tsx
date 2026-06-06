import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Stabilimento Santa Severa',
  description: 'Prenotazione ombrelloni online',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className={inter.className}>{children}
      import type { Metadata } from "next";
import { Inter } from "google-fonts/roboto"; // o il tuo font attuale
import "./globals.css";
import DynamicManifest from "@/components/DynamicManifest";

export const metadata: Metadata = {
  title: "Stabilimento Balneare Santa Severa",
  description: "Sistema di prenotazione e controllo accessi",
  // Rimuovi l'eventuale campo manifest statico da qui se presente
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        {/* Inietta dinamicamente il manifest corretto in base all'URL */}
        <DynamicManifest />
        {children}
      </body>
    </html>
  );
}
      </body>
    </html>
  )
}
