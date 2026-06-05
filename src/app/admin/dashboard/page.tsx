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
  notes: string | null;
  zone_id: string | null;
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
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const router = useRouter();

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Recupera gli ombrelloni attivi dal database
      const { data: spotsData, error: spotsErr } = await supabase
        .from('spots')
        .select('id, internal_code, is_available, notes, zone_id')
        .eq('is_active', true)
        .order('internal_code', { ascending: true });

      if (spotsErr) throw spotsErr;

      // 2. Recupera le prenotazioni per la data selezionata (sia confermate che in attesa)
      const { data: bookingsData, error: bookErr } = await supabase
        .from('bookings')
        .select('id, booking_date, status, spot_id')
        .eq('booking_date', filterDate)
        .in('status', ['confirmed', 'pending']);

      if (bookErr) throw bookErr;

      setSpots((spotsData as Spot[]) || []);
      setBookings((bookingsData as Booking[]) || []);
    } catch (err) {
      console.error('Errore nel caricamento dei dati in tempo reale:', err);
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
  }, [router, filterDate]);

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
      alert("Errore durante l'aggiornamento dello stato dell'ombrellone");
    } else {
      setSelectedSpot(null);
      setNoteBlock('');
      fetchData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const totalSpots = spots.length;
  const closedSpots = spots.filter(s => !s.is_available).length;
  const activeBookingsCount = bookings.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm font-medium font-mono">
        <RefreshCw className="animate-spin mr-3 h-5 w-5 text-blue-500" />
        SINCRO IN CORSO...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase">Lido Control Panel</h1>
            <p className="text-xs text-slate-400">Mappa Interattiva</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold uppercase">Data Mappa:</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-semibold focus:outline-none cursor-pointer text-xs"
            />
          </div>
          <button 
            onClick={() => router.push('/admin/prenotazioni')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs px-4 py-2 rounded-lg transition font-medium"
          >
            <FileText className="h-4 w-4" /> Registro Prenotazioni
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs px-4 py-2 rounded-lg border border-red-900/50 transition font-medium"
          >
            <LogOut className="h-4 w-4" /> Esci
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Postazioni Totali</p>
              <h3 className="text-3xl font-black text-white mt-1">{totalSpots}</h3>
            </div>
            <Umbrella className="h-10 w-10 text-slate-700" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Occupati il {filterDate}</p>
              <h3 className="text-3xl font-black text-emerald-400 mt-1">{activeBookingsCount}</h3>
            </div>
            <CheckCircle className="h-10 w-10 text-emerald-600/30" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider font-bold text-slate-400">Blocchi Manutenzione</p>
              <h3 className="text-3xl font-black text-amber-500 mt-1">{closedSpots}</h3>
            </div>
            <ShieldAlert className="h-10 w-10 text-amber-600/30" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <Umbrella className="h-4 w-4 text-blue-500" /> Planimetria Spiaggia
              </h2>
              <button onClick={fetchData} className="text-slate-400 hover:text-white p-1 transition">
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {spots.map((spot) => {
                const isBooked = bookings.some(b => b.spot_id === spot.id);
                
                let bgClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"; 
                if (!spot.is_available) bgClass = "bg-amber-500/10 border-amber-500/30 text-amber-500 hover:bg-amber-500/20"; 
                if (isBooked) bgClass = "bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"; 

                return (
                  <button
                    key={spot.id}
                    onClick={() => setSelectedSpot(spot)}
                    className={`aspect-square border rounded-xl flex flex-col items-center justify-center font-mono text-sm transition shadow-md ${bgClass} ${selectedSpot?.id === spot.id ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <span className="text-[10px] opacity-50 uppercase font-sans">N°</span>
                    <span className="text-base font-black">{spot.internal_code}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-fit">
            <h2 className="text-sm font-bold text-white uppercase tracking-wide border-b border-slate-800 pb-4 mb-4">
              Ispezione Sezione
            </h2>
            
            {selectedSpot ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl font-black text-white font-mono">Ombrellone {selectedSpot.internal_code}</span>
                    <span className={`px-2 py-0.5 text-[10px] rounded font-bold uppercase tracking-wider border ${
                      selectedSpot.is_available ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {selectedSpot.is_available ? 'Online' : 'Bloccato'}
                    </span>
                  </div>
                  {selectedSpot.notes && (
                    <p className="mt-3 text-xs bg-slate-950 p-2.5 border border-slate-800 rounded-md text-amber-400 font-mono">
                      <strong className="text-slate-400 uppercase text-[10px] block mb-0.5">Nota Interna:</strong> 
                      {selectedSpot.notes}
                    </p>
                  )}
                </div>

                <div className="space-y-3 bg-slate-950 p-4 border border-slate-800 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Azione Rapida Stato</h4>
                  {selectedSpot.is_available ? (
                    <div className="space-y-2">
                      <label className="text-[11px] text-slate-500 font-medium">Motivazione chiusura:</label>
                      <input 
                        type="text" 
                        placeholder="Es. Manutenzione..."
                        value={noteBlock}
                        onChange={(e) => setNoteBlock(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                      />
                      <button
                        onClick={() => handleToggleSpot(selectedSpot)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase py-2.5 rounded-lg flex items-center justify-center gap-2 transition tracking-wider"
                      >
                        <XCircle className="h-4 w-4" /> Invalida Vendita Online
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleToggleSpot(selectedSpot)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase py-2.5 rounded-lg flex items-center justify-center gap-2 transition tracking-wider"
                    >
                      <CheckCircle className="h-4 w-4" /> Ripristina Disponibilità
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs text-center py-12 font-medium">
                Seleziona una postazione numerata sulla mappa.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
