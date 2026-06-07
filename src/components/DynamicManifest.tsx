'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DynamicManifest() {
  const pathname = usePathname();
  const [manifestPath, setManifestPath] = useState('/manifest-guest.json');

  useEffect(() => {
    if (pathname.startsWith('/admin/dashboard/opdashboard')) {
      setManifestPath('/manifest-operator.json');
    } else if (pathname.startsWith('/admin')) {
      setManifestPath('/manifest-admin.json');
    } else {
      setManifestPath('/manifest-guest.json');
    }
  }, [pathname]);

  useEffect(() => {
    // Cerca se esiste già un tag link manifest esistente
    let link: HTMLLinkElement | null = document.querySelector('link[rel="manifest"]');
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    
    link.href = manifestPath;
  }, [manifestPath]);

  return null; // Non renderizza nulla graficamente
}
// Aggiungi questo useEffect dentro DynamicManifest.tsx
useEffect(() => {
  if ('serviceWorker' in navigator && window.workbox === undefined) {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('Service Worker registrato con successo!', reg.scope))
      .catch((err) => console.error('Errore registrazione Service Worker:', err));
  }
}, []);
