export default function Home() {
  // Otteniamo la data di oggi in formato YYYY-MM-DD
  const today = new Error().toISOString().split('T')[0]; 

  return (
    <main className="min-h-screen p-8 bg-slate-50">
      <h1 className="text-2xl font-bold mb-6 text-center text-blue-900">
        Isola del Pescatore - Prenotazioni
      </h1>
      {/* Passiamo la prop richiesta */}
      <BeachMap selectedDate={today} />
    </main>
  );
}
