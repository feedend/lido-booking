import BeachMap from '@/components/map/BeachMap';

export default function Home() {
  // Otteniamo la data di oggi in formato YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-50">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-900">
        Stabilimento Santa Severa - Mappa Ombrelloni
      </h1>
      
      {/* Passiamo la data richiesta al componente */}
      <BeachMap selectedDate={today} />
      
    </main>
  );
}
