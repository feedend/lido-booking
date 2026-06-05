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
  Umbrella,
  User
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
}

interface Booking {
  id: string;
  spot_id: string;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  booking_category: string | null;
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

  // La stessa identica struttura di righe e corridoi della mappa pubblica
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

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Recupera tutti gli ombrelloni attivi
      const { data: spotsData, error: spotsErr } = await supabase
        .from('spots')
        .select('id, internal_code, is_available, notes')
        .eq('is_active', true);

      if (spotsErr) throw spotsErr;

      // 2. Recupera le prenotazioni del giorno con i nuovi dati anagrafici diretti
      const { data: bookingsData, error: bookErr } = await supabase
        .from('bookings')
        .select('id, spot_id, guest_first_name, guest_last_name, guest_email, guest_phone, booking_category')
        .eq('booking_date', filterDate)
        .not('status', 'eq', 'cancelled');

      if (bookErr) throw bookErr;

      setSpots((spotsData as Spot[]) || []);
      setBookings((bookingsData as Booking[]) || []);
    } catch (err) {
      console.error('Errore nel caricamento dei dati della dashboard:', err);
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
      alert("Errore durante l'aggiornamento dello stato");
    } else {
      setSelectedSpot(prev => prev ? { ...prev, is_available: updatedAvailability, notes: updatedAvailability ? null : (noteBlock || 'Chiuso manualmente') } : null);
      setNoteBlock('');
      fetchData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  // Trova la prenotazione associata a un ombrellone (se esiste)
  const getBookingForSpot = (spotId: string) => {
    return bookings.find(b => b.spot_id === spotId);
  };

  const renderAdminSpot = (num: number) => {
    const correspondingSpot = spots.find(s => parseInt(s.internal_code) === num);
    
    if (!correspondingSpot) {
      return <div key={num} className="w-10 h-12 opacity-10" />;
    }

    const booking = getBookingForSpot(correspondingSpot.id);
    const isBooked = !!booking;
    const isManuallyBlocked = !correspondingSpot.is_available;

    // Colore di stato prioritario
    let btnClass = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20"; 
    if (isManuallyBlocked) {
      btnClass = "bg-amber-500/20 border-amber-500/60 text-amber-500 hover:bg-amber-500/30 font-bold";
    } else if (isBooked) {
      btnClass = "bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30";
    }

    return (
      <button
        key={num}
        onClick={() => setSelectedSpot(correspondingSpot)}
        className={`w-10 h-12 border rounded-lg flex flex-col items-center justify-center font-mono text-xs transition relative group ${btnClass} ${selectedSpot?.id === correspondingSpot.id ? 'ring-2 ring-blue-500' : ''}`}
      >
        <span className="text-[10px] font-black">{num}</span>
        {isBooked && !isManuallyBlocked && (
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Navbar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg text-white">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white uppercase">Lido Control Panel</h1>
            <p className="text-xs text-slate-400">Planimetria Simmetrica Real-Time</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold uppercase">Data:</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-white font-semibold text-xs"
            />
          </div>
          <button 
            onClick={() => router.push('/admin/prenotazioni')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs px-4 py-2 rounded-lg transition font-medium"
          >
            <FileText className="h-4 w-4" /> Registro
          </button>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs px-4 py-2 rounded-lg border border-red-900/50 transition font-medium"
          >
            <LogOut className="h-4 w-4" /> Esci
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Layout a due Colonne: Mappa della spiaggia a sinistra, Ispezione a destra */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* MAPPA SPIAGGIA (Prende 2 colonne di spazio) */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 overflow-x-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 min-w-[900px]">
              <h2 className="text-xs font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <Umbrella className="h-4 w-4 text-orange-500" /> Disposizione Speculare Spiaggia
              </h2>
              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider">
                <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500/20 border border-emerald-500"></span> Libero</span>
                <span className="flex items-center gap-1.5 text-red-400"><span className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500"></span> Prenotato</span>
                <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2 h-2 rounded-full bg-amber-500/20 border border-amber-500"></span> Blocco Fisso</span>
              </div>
            </div>

            {/* Contenitore Griglia identico al Client */}
            <div className="flex flex-col gap-2 min-w-[900px] pt-2">
              {rows.map((row, rowIndex) => (
                <div key={rowIndex} className="flex items-center justify-start gap-3">
                  
                  {/* Settore Sinistro (Colonne 1-10) */}
                  <div className="w-[410px] grid grid-cols-10 gap-1 justify-items-start">
                    {row.startL ? (
                      <>
                        {Array.from({ length: 10 - (row.endL! - row.startL! + 1) }).map((_, i) => (
                          <div key={`empty-l-${i}`} className="w-10 h-12 opacity-0 pointer-events-none" />
                        ))}
                        {Array.from({ length: row.endL! - row.startL! + 1 }, (_, i) => row.startL! + i).map(renderAdminSpot)}
                      </>
                    ) : (
                      Array.from({ length: 10 }).map((_, i) => <div key={`blank-l-${i}`} className="w-10 h-12" />)
                    )}
                  </div>
                  
                  {/* Corridoio Centrale */}
                  <div className="w-14 shrink-0 flex justify-center items-center font-black text-slate-400 uppercase text-[9px] tracking-wider bg-slate-950 py-1.5 rounded-lg border border-slate-800 shadow-inner text-center">
                    {row.center || "•"}
                  </div>
                  
                  {/* Settore Destro (Colonne 11-20) */}
                  <div className="w-[410px] grid grid-cols-10 gap-1 justify-items-start">
                    {row.startR ? (
                      <>
                        {Array.from({ length: row.endR! - row.startR! + 1 }, (_, i) => row.startR! + i).map(renderAdminSpot)}
                        {Array.from({ length: 10 - (row.endR! - row.startR! + 1) }).map((_, i) => (
                          <div key={`empty-r-${i}`} className="w-10 h-12 opacity-0 pointer-events-none" />
                        ))}
                      </>
                    ) : (
                      Array.from({ length: 10 }).map((_, i) => <div key={`blank-r-${i}`} className="w-10 h-12" />)
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* ISPEZIONE DETTAGLIATA PANNELLO LATERALE */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl h-fit space-y-4">
            <h2 className="text-xs font-bold text-white uppercase tracking-wide border-b border-slate-800 pb-3">
              Ispezione Postazione
            </h2>
            
            {selectedSpot ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-black text-white font-mono">Ombrellone {selectedSpot.internal_code}</span>
                  <span className={`px-2 py-0.5 text-[9px] rounded font-bold uppercase border ${
                    selectedSpot.is_available ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    }`}>
                    {selectedSpot.is_available ? 'Disponibile Online' : 'Blocco Totale'}
                  </span>
                </div>

                {/* Mostra i dati anagrafici reali estratti direttamente se c'è una prenotazione */}
                {getBookingForSpot(selectedSpot.id) ? (
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2 text-xs">
                    <p className="text-red-400 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <User className="w-3.5 h-3.5" /> Dati Occupante Giorno Selezionato:
                    </p>
                    <div className="space-y-1 text-slate-300 font-mono">
                      <p><strong>Nome:</strong> {getBookingForSpot(selectedSpot.id)?.guest_first_name} {getBookingForSpot(selectedSpot.id)?.guest_last_name}</p>
                      <p><strong>Email:</strong> {getBookingForSpot(selectedSpot.id)?.guest_email || 'Non fornita'}</p>
                      <p><strong>Tel:</strong> {getBookingForSpot(selectedSpot.id)?.guest_phone || 'Non fornito'}</p>
                      <p><strong>Tariffa:</strong> <span className="text-orange-400">{getBookingForSpot(selectedSpot.id)?.booking_category}</span></p>
                    </div>
                  </div>
                ) : (
                  !isSubmitting && selectedSpot.is_available && (
                    <p className="text-[11px] text-slate-500 font-medium italic text-center py-2">
                      Nessuna prenotazione attiva per questo giorno.
                    </p>
                  )
                )}

                {selectedSpot.notes && (
                  <p className="text-xs bg-slate-950 p-2.5 border border-slate-800 rounded-lg text-amber-400 font-mono">
                    <strong className="text-slate-400 uppercase text-[9px] block mb-0.5">Nota Blocco Fisso:</strong> 
                    {selectedSpot.notes}
                  </p>
                )}

                {/* Pannello di Blocco Manuale permanente */}
                <div className="space-y-3 bg-slate-950 p-4 border border-slate-800 rounded-xl pt-3">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Gestione Stato ad Oltranza</h4>
                  {selectedSpot.is_available ? (
                    <div className="space-y-2">
                      <input 
                        type="text" 
                        placeholder="Motivo del blocco (es. Riservato Direzione)..."
                        value={noteBlock}
                        onChange={(e) => setNoteBlock(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-orange-500"
                      />
                      <button
                        onClick={() => handleToggleSpot(selectedSpot)}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold uppercase py-2 rounded-lg flex items-center justify-center gap-2 transition"
                      >
                        <XCircle className="h-4 w-4" /> Blocca per ogni giorno
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleToggleSpot(selectedSpot)}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase py-2 rounded-lg flex items-center justify-center gap-2 transition"
                    >
                      <CheckCircle className="h-4 w-4" /> Sblocca Ombrellone
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs text-center py-12 font-medium">
                Seleziona un ombrellone sulla mappa simmetrica per vederne i bagnanti o modificarne lo stato permanente.
              </p>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
