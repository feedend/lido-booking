'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  Layers, 
  CheckCircle, 
  XCircle, 
  FileText, 
  LogOut, 
  RefreshCw, 
  ShieldAlert,
  Umbrella
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Spot {
  id: string;
  internal_code: string; // Allineato al Database
  is_available: boolean; // Allineato al Database
  is_active: boolean;    // Allineato al Database
  notes: string | null;
  zone_id: string;
}

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  spot_id: string;
}

export default function AdminDashboard() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [noteBlock, setNoteBlock] = useState('');
  const router = useRouter();

// Carica i dati iniziali dal Database (Versione pulita per evitare il 400)
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Recupera TUTTI gli ombrelloni senza filtri aggressivi
      const { data: spotsData, error: spotsError } = await supabase
        .from('spots')
        .select('*');

      if (spotsError) throw spotsError;

      // 2. Recupera le prenotazioni attive
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*');

      if (bookingsError) throw bookingsError;

      if (spotsData) setSpots(spotsData);
      if (bookingsData) setBookings(bookingsData);
    } catch (err) {
      console.error('Errore nel caricamento dati:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin/login');
      } else {
        fetchData();
      }
    };
    checkUser();
  }, [router]);

  // Funzione per Aprire/Chiudere manualmente un ombrellone
  const handleToggleSpot = async (spot: Spot) => {
    const updatedAvailability = !spot.is_available;
    
    const { error } = await supabase
      .from('spots')
      .update({ 
        is_available: updatedAvailability,
        notes: updatedAvailability ? null : (noteBlock || 'Chiuso manualmente')
      })
      .eq('id', spot.id);

    if (error) {
      alert("Errore durante l'aggiornamento dell'ombrellone");
    } else {
      setSelectedSpot(null);
      setNoteBlock('');
      fetchData(); // Ricarica la griglia aggiornata
    }
  };

  // Funzione di Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  // Calcolo statistiche rapide
  const totalSpots = spots.length;
  const closedSpots = spots.filter(s => !s.is_available).length;
  const activeBookingsCount = bookings.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-lg font-medium">
        <RefreshCw className="animate-spin mr-3 h-6 w-6 text-blue-500" />
        Caricamento pannello di controllo...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      
      {/* NAVBAR */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Lido Control Panel</h1>
            <p className="text-xs text-slate-400">Gestione Mappa & Disponibilità</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/admin/prenotazioni')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-lg transition"
          >
            <FileText className="h-4 w-4" /> Gestione Prenotazioni
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-sm px-4 py-2 rounded-lg border border-red-900/50 transition"
          >
            <LogOut className="h-4 w-4" /> Esci
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Ombrelloni Totali</p>
              <h3 className="text-3xl font-bold text-white mt-1">{totalSpots}</h3>
            </div>
            <Umbrella className="h-10 w-10 text-slate-600" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Prenotati Oggi</p>
              <h3 className="text-3xl font-bold text-emerald-400 mt-1">{activeBookingsCount}</h3>
            </div>
            <CheckCircle className="h-10 w-10 text-emerald-600/50" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-400">Bloccati/Manutenzione</p>
              <h3 className="text-3xl font-bold text-amber-500 mt-1">{closedSpots}</h3>
            </div>
            <ShieldAlert className="h-10 w-10 text-amber-600/50" />
          </div>
        </div>

        {/* CONTENUTO PRINCIPALE */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* GRIGLIA OMBRELLONI */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Umbrella className="h-5 w-5 text-blue-500" /> Stato Beach Club Interattivo
              </h2>
              <button onClick={fetchData} className="text-slate-400 hover:text-white p-1 transition">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {spots.map((spot) => {
                const isBooked = bookings.some(b => b.spot_id === spot.id);
                
                let bgClass = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"; // Libero
                if (!spot.is_available) bgClass = "bg-amber-500/10 border-amber-500/40 text-amber-500 hover:bg-amber-500/20"; // Bloccato Admin
                if (isBooked) bgClass = "bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20"; // Prenotato

                return (
                  <button
                    key={spot.id}
                    onClick={() => setSelectedSpot(spot)}
                    className={`aspect-square border rounded-xl flex flex-col items-center justify-center gap-1 font-semibold text-sm transition shadow-sm ${bgClass}`}
                  >
                    <span className="text-xs opacity-60">N°</span>
                    <span className="text-base font-bold">{spot.internal_code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PANNELLO DI DETTAGLIO */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-fit">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-4 mb-4">
              Dettaglio Ombrellone
            </h2>
            
            {selectedSpot ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-white">Ombrellone {selectedSpot.internal_code}</span>
                    <span className={`px-2 py-1 text-xs rounded-md font-bold uppercase tracking-wider ${
                      selectedSpot.is_available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {selectedSpot.is_available ? 'In Vendita Online' : 'Bloccato / Privato'}
                    </span>
                  </div>
                  {selectedSpot.notes && (
                    <p className="mt-2 text-xs bg-slate-950 p-2 border border-slate-800 rounded-md text-amber-400">
                      <strong>Nota admin:</strong> {selectedSpot.notes}
                    </p>
                  )}
                </div>

                <div className="space-y-3 bg-slate-950 p-4 border border-slate-800 rounded-xl">
                  <h4 className="text-sm font-semibold text-slate-300">Azioni Rapide</h4>
                  
                  {selectedSpot.is_available ? (
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">Motivo del blocco (opzionale):</label>
                      <input 
                        type="text" 
                        placeholder="Es. Manutenzione, riservato..."
                        value={noteBlock}
                        onChange={(e) => setNoteBlock(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleToggleSpot(selectedSpot)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition"
                      >
                        <XCircle className="h-4 w-4" /> Chiudi/Ritiro dalla vendita
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleToggleSpot(selectedSpot)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition"
                    >
                      <CheckCircle className="h-4 w-4" /> Riapri ed Estendi online
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-12">
                Seleziona un ombrellone dalla mappa per controllarne lo stato o bloccarlo.
              </p>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
