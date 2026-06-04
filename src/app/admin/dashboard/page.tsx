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
  internal_code: string;
  is_available: boolean;
  is_active: boolean;
  notes: string | null;
  zone_id: string;
}

interface Booking {
  id: string;
  booking_date: string;
  status: string;
  spot_id: string;
  booking_category?: string;
  internal_code?: string;
}

export default function AdminDashboard() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);
  const [noteBlock, setNoteBlock] = useState('');
  const router = useRouter();

  // Carica i dati iniziali dal Database (Dashboard Admin)
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Recupera tutti gli ombrelloni
      const { data: spotsData, error: spotsError } = await supabase
        .from('spots')
        .select('*');

      if (spotsError) throw spotsError;

      // 2. Recupera le prenotazioni confermate
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'confirmed');

      if (bookingsError) throw bookingsError;

      // Sincronizza la data odierna (formato YYYY-MM-DD locale)
      const todayStr = new Date().toISOString().split('T')[0];

      // Filtra le prenotazioni per mostrare solo quelle valide per OGGI
      const todaysBookings = (bookingsData || []).filter(b => {
        if (!b.booking_date) return false;
        const bDate = b.booking_date.split('T')[0];
        return bDate === todayStr;
      });

      setSpots(spotsData || []);
      setBookings(todaysBookings);
    } catch (err) {
      console.error('Errore nel caricamento dati in Dashboard:', err);
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
      await fetchData(); 
      setSelectedSpot(null);
      setNoteBlock('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const totalSpots = spots.length;
  const closedSpots = spots.filter(s => !s.is_available).length;
  const activeBookingsCount = bookings.length;

  // MATRICE GEOMETRICA REALE DELLA SPIAGGIA (Sincronizzata con il Client)
  const rows = [
    { startL: 1, endL: 10, startR: 11, endR: 20, center: "Bagnino" },
    { startL: 21, endL: 30, startR: 31, endR: 40, center: "" },
    { startL: 41, endL: 50, startR: 51, endR: 60, center: "" },
    { startL: 61, endL: 70, startR: 71, endR: 80, center: "P" },
    { startL: 81, endL: 90, startR: 91, endR: 100, center: "a" },
    { startL: 101, endL: 110, startR: 111, endR: 120, center: "s" },
    { startL: 121, endL: 129, startR: 130, endR: 139, center: "s" },
    { startL: 140, endL: 146, startR: 147, endR: 154, center: "e" },
    { startL: 155, endL: 160, startR: 161, endR: 167, center: "r" },
    { startL: null, endL: null, startR: 168, endR: 171, center: "a" },
    { startL: null, endL: null, startR: 172, endR: 174, center: "" },
  ];

  const renderAdminSpot = (num: number) => {
    // Trova l'oggetto spot corrispondente nel database
    const spot = spots.find(s => parseInt(s.internal_code) === num);
    if (!spot) return <div key={`missing-${num}`} className="w-10 h-10 bg-slate-900 border border-dashed border-slate-800 rounded opacity-40 shrink-0" />;

    // Controllo flessibile e blindato per verificare se è prenotato oggi
    const isBooked = bookings.some(b => 
      b.spot_id === spot.id || 
      b.internal_code === spot.internal_code || 
      (b.booking_category && parseInt(b.booking_category.split('|')[0]) === num)
    );

    let bgClass = "";
    if (isBooked) {
      bgClass = "bg-red-500/20 border-red-500/60 text-red-400 hover:bg-red-500/40";
    } else if (!spot.is_available) {
      bgClass = "bg-amber-500/20 border-amber-500/60 text-amber-500 hover:bg-amber-500/40";
    } else {
      bgClass = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30";
    }

    const isSelected = selectedSpot?.id === spot.id;

    return (
      <button
        key={spot.id}
        onClick={() => setSelectedSpot(spot)}
        className={`w-9 h-11 border rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition shadow-sm shrink-0 relative
          ${bgClass} ${isSelected ? 'ring-2 ring-blue-500 border-transparent scale-105 z-10' : ''}`}
      >
        <span>{spot.internal_code}</span>
        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
          isBooked ? 'bg-red-500' : !spot.is_available ? 'bg-amber-500' : 'bg-emerald-500'
        }`} />
      </button>
    );
  };

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

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Ombrelloni Totali</p>
              <h3 className="text-2xl font-bold text-white mt-1">{totalSpots}</h3>
            </div>
            <Umbrella className="h-8 w-8 text-slate-600" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Prenotati Oggi</p>
              <h3 className="text-2xl font-bold text-emerald-400 mt-1">{activeBookingsCount}</h3>
            </div>
            <CheckCircle className="h-8 w-8 text-emerald-600/50" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Bloccati / Chiusi</p>
              <h3 className="text-2xl font-bold text-amber-500 mt-1">{closedSpots}</h3>
            </div>
            <ShieldAlert className="h-8 w-8 text-amber-600/50" />
          </div>
        </div>

        {/* CONTENUTO PRINCIPALE */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* MAPPA REALE DELLA SPIAGGIA LATO ADMIN */}
          <div className="xl:col-span-3 bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Umbrella className="h-4 w-4 text-blue-500" /> Disposizione Planimetrica Spiaggia
              </h2>
              <button onClick={fetchData} className="text-slate-400 hover:text-white p-1 transition">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {/* Contenitore responsive con scrollbar orizzontale se lo schermo è piccolo */}
            <div className="w-full overflow-x-auto pb-2">
              <div className="flex flex-col gap-2 w-[920px] mx-auto pl-1">
                {rows.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex items-center justify-start gap-3">
                    
                    {/* Settore Sinistro */}
                    <div className="w-[410px] grid grid-cols-10 gap-1 justify-items-start">
                      {row.startL ? (
                        <>
                          {Array.from({ length: 10 - (row.endL! - row.startL! + 1) }).map((_, i) => (
                            <div key={`empty-l-${i}`} className="w-9 h-11 opacity-0 pointer-events-none" />
                          ))}
                          {Array.from({ length: row.endL! - row.startL! + 1 }, (_, i) => row.startL! + i).map(renderAdminSpot)}
                        </>
                      ) : (
                        Array.from({ length: 10 }).map((_, i) => <div key={`blank-l-${i}`} className="w-9 h-11" />)
                      )}
                    </div>
                    
                    {/* Corridoio Centrale */}
                    <div className="w-10 shrink-0 h-8 flex justify-center items-center font-black text-amber-500 uppercase text-[9px] tracking-wider bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
                      {row.center || "•"}
                    </div>
                    
                    {/* Settore Destro */}
                    <div className="w-[410px] grid grid-cols-10 gap-1 justify-items-start">
                      {row.startR ? (
                        <>
                          {Array.from({ length: row.endR! - row.startR! + 1 }, (_, i) => row.startR! + i).map(renderAdminSpot)}
                          {Array.from({ length: 10 - (row.endR! - row.startR! + 1) }).map((_, i) => (
                            <div key={`empty-r-${i}`} className="w-9 h-11 opacity-0 pointer-events-none" />
                          ))}
                        </>
                      ) : (
                        Array.from({ length: 10 }).map((_, i) => <div key={`blank-r-${i}`} className="w-9 h-11" />)
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </div>
            
            {/* LEGENDA RAPIDA */}
            <div className="flex gap-4 text-xs pt-2 border-t border-slate-800/60 justify-center">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Libero / Online</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Bloccato Manuale</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Prenotato Cliente</div>
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
                      bookings.some(b => b.spot_id === selectedSpot.id || b.internal_code === selectedSpot.internal_code || (b.booking_category && parseInt(b.booking_category.split('|')[0]) === parseInt(selectedSpot.internal_code)))
                        ? 'bg-red-500/20 text-red-400'
                        : selectedSpot.is_available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                    }`}>
                      {bookings.some(b => b.spot_id === selectedSpot.id || b.internal_code === selectedSpot.internal_code || (b.booking_category && parseInt(b.booking_category.split('|')[0]) === parseInt(selectedSpot.internal_code)))
                        ? 'Occupato Oggi'
                        : selectedSpot.is_available ? 'In Vendita Online' : 'Bloccato / Privato'}
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
                  
                  {bookings.some(b => b.spot_id === selectedSpot.id || b.internal_code === selectedSpot.internal_code || (b.booking_category && parseInt(b.booking_category.split('|')[0]) === parseInt(selectedSpot.internal_code))) ? (
                    <p className="text-xs text-red-400 text-center py-2 bg-red-950/20 rounded-lg border border-red-900/30">
                      Questo ombrellone è occupato da un cliente per la giornata di oggi. Gestisci lo stato dal registro prenotazioni.
                    </p>
                  ) : selectedSpot.is_available ? (
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
