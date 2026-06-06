'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LayoutGrid, ClipboardList, LogOut, Shield, User } from 'lucide-react';
import BeachMap from '@/components/map/BeachMap'; // Il componente della mappa che abbiamo sistemato

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [ruolo, setRuolo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabAttiva, setTabAttiva] = useState<'spiaggia' | 'registro'>('spiaggia');
  const router = useRouter();

  useEffect(() => {
    const controllaSessione = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // Lettura sicura del ruolo per TypeScript (evita il blocco su Vercel)
      const ruoloUtente = user.user_metadata?.ruolo || user.app_metadata?.ruolo;

      // Sicurezza: se non c'è ruolo o non è valido, rimanda al login
      if (ruoloUtente !== 'admin' && ruoloUtente !== 'operators') {
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      setRuolo(ruoloUtente);
      setLoading(false);
    };

    controllaSessione();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <p className="text-sm font-medium tracking-wide animate-pulse">Caricamento pannello...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* SIDEBAR DI NAVIGAZIONE */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Lido Control Panel</h2>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {ruolo === 'admin' ? (
                <>
                  <Shield className="h-3.5 w-3.5 text-amber-500" />
                  <span>Amministratore</span>
                </>
              ) : (
                <>
                  <User className="h-3.5 w-3.5 text-blue-400" />
                  <span>Operatore</span>
                </>
              )}
            </div>
          </div>

          <nav className="space-y-2">
            {/* Pulsante Spiaggia - Visibile e attivo per TUTTI */}
            <button
              onClick={() => setTabAttiva('spiaggia')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                tabAttiva === 'spiaggia'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-5 w-5" />
              <span>Gestione Spiaggia</span>
            </button>

            {/* PULSANTE REGISTRO — Offuscato e disabilitato se è operatore */}
            <button
              disabled={ruolo !== 'admin'}
              onClick={() => setTabAttiva('registro')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                ruolo !== 'admin'
                  ? 'opacity-40 cursor-not-allowed text-slate-500 line-through' // Stile offuscato/disabilitato
                  : tabAttiva === 'registro'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <ClipboardList className="h-5 w-5" />
              <span>Registro Prenotazioni</span>
            </button>
          </nav>
        </div>

        {/* Pulsante di Disconnessione */}
        <button
          onClick={handleLogout}
          className="mt-8 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 transition-colors border border-transparent hover:border-red-500/20"
        >
          <LogOut className="h-5 w-5" />
          <span>Esci dal sistema</span>
        </button>
      </aside>

      {/* CONTENUTO PRINCIPALE DELLA DASHBOARD */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        {tabAttiva === 'spiaggia' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h1 className="text-2xl font-bold tracking-tight text-white">Mappa degli Ombrelloni</h1>
              <p className="text-sm text-slate-400">Monitora e gestisci le postazioni in tempo reale sul lido.</p>
            </div>
            
            {/* Componente della mappa spiaggia (Totalmente Inalterato) */}
            <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <BeachMap />
            </div>
          </div>
        )}

        {/* Renderizzato solo se admin seleziona il registro */}
        {tabAttiva === 'registro' && ruolo === 'admin' && (
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <h1 className="text-2xl font-bold tracking-tight text-white">Registro Storico Prenotazioni</h1>
              <p className="text-sm text-slate-400">Visualizza i dettagli finanziari, i dati degli utenti ed esporta i resoconti.</p>
            </div>
            
            <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400 text-sm">
              Tabella del registro prenotazioni, incassi complessivi e filtri avanzati.
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
