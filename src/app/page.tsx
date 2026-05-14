import BeachMap from '@/components/map/BeachMap';

export default function Home() {
  // Calcoliamo la data di oggi lato client/server per passarla alla mappa
  const today = new Date().toISOString().split('T')[0];

  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="max-w-5xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
        <div className="p-6 bg-blue-600 text-white text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wide">
            Stabilimento Santa Severa
          </h1>
          <p className="text-blue-100 text-sm">Gestione Mappa Ombrelloni</p>
        </div>

        <div className="p-4">
          {/* Qui passiamo finalmente la prop obbligatoria */}
          <BeachMap selectedDate={today} />
        </div>
      </div>
    </main>
  );
}
