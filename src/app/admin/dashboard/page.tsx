'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { LayoutGrid, ClipboardList, LogOut, Shield, User } from 'lucide-react';
import BeachMap from '@/components/map/BeachMap'; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardPage() {
  const [ruolo, setRuolo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tabAttiva, setTabAttiva] = useState<'spiaggia' | 'registro'>('spiaggia');
  
  // Gestione data per la mappa all'interno del pannello di controllo
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Di base parte con la data di oggi
  );
  
  const router = useRouter();

  useEffect(() => {
    const controllaSessione = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      // 1. Lettura dei ruoli compatibile al 100% con TypeScript
      const ruoloUtente = user.user_metadata?.ruolo || user.app_metadata?.ruolo;

      // 2. Se è un operatore, blocca la visualizzazione solo sulla spiaggia
      if (ruoloUtente === 'operators') {
        setTabAttiva('spiaggia');
      }

      // Sicurezza: se non ha un ruolo valido, esegui il logout automatico
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
            {/* Pulsante Spiaggia - Visibile a TUTTI */}
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

            {/* PULSANTE REGISTRO — Logica Condizionale: Visibile SOLO se admin */}
            {ruolo === 'admin' && (
              <button
                onClick={() => setTabAttiva('registro')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                  tabAttiva === 'registro'
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <ClipboardList className="h-5 w-5" />
                <span>Registro Prenotazioni</span>
              </button>
            )}
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
            <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-white">Mappa degli Ombrelloni</h1>
                <p className="text-sm text-slate-400">Monitora e gestisci le postazioni in tempo reale sul lido.</p>
              </div>
              
              {/* Controllo della data per permettere ai cassieri/operatori di cambiare giorno */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <span className="text-xs font-bold text-slate-400 uppercase pl-2">Giorno:</span>
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => e.target.value && setSelectedDate(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-xs font-bold text-white outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {/* Componente della mappa spiaggia — Passiamo i dati fittizi di controllo per non rompere il tipo */}
            <div className="mt-6 bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <BeachMap 
                selectedDate={selectedDate} 
                userData={{
                  nome: 'OPERATORE',
                  cognome: 'LIDO',
                  email: 'interno@stabilimento.it',
                  numUtenti: 1,
                  categoria: ruolo === 'admin' ? 'admin' : 'operators',
                  extraSdraio: 0,
                  extraSpiaggine: 0,
                  prezzoExtra: 0
                }} 
              />
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
