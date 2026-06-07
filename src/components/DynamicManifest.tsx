'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DynamicManifest() {
  const pathname = usePathname();
  const [manifestPath, setManifestPath] = useState('/manifest-guest.json');

  // 1. Cambia il manifest in base alla rotta
  useEffect(() => {
    if (pathname?.startsWith('/admin/dashboard/opdashboard')) {
      setManifestPath('/manifest-operator.json');
    } else if (pathname?.startsWith('/admin')) {
      setManifestPath('/manifest-admin.json');
    } else {
      setManifestPath('/manifest-guest.json');
    }
  }, [pathname]);

  // 2. Inietta il tag link nell'head dell'HTML
  useEffect(() => {
    let link: HTMLLinkElement | null = document.querySelector('link[rel="manifest"]');
    
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    
    link.href = manifestPath;
  }, [manifestPath]);

  // 3. Registra il Service Worker (SPOSTATO DENTRO IL COMPONENTE)
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          console.log('Service Worker registrato con successo! Scope:', reg.scope);
        })
        .catch((err) => {
          console.error('Errore durante la registrazione del Service Worker:', err);
        });
    }
  }, []);

  return null; // Non renderizza nulla graficamente
}
