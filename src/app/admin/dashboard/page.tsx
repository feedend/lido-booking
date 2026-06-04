'use client';

import { useEffect, useState, useCallback } from 'react';
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

// Inizializzazione protetta contro stringhe vuote o indefinite
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

interface Spot {
  id: string;
  internal_code: string;
  is_available: boolean | string | null;
  is_active: boolean | string | null;
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
  const [dbError, setDbError] = useState<string | null>(null);
  const router = useRouter();

  // Generatore di emergenza locale se Supabase è offline o vuoto
  const generateFallback = useCallback(() => {
    const fallbackSpots: Spot[] = Array.from({ length: 174 }, (_, i) => ({
      id: `fallback-${i + 1}`,
      internal_code: (i + 1).toString(),
      is_available: true,
      is_active: true,
      notes: null,
      zone_id: 'default-zone'
    }));
    setSpots(fallbackSpots);
  }, []);

  // Caricamento Dati isolato con useCallback per evitare loop nel rendering
  const fetchData = useCallback(async () => {
    if (!supabase) {
      setDbError("Chiavi di Supabase non configurate nel file .env.local o non lette correttamente.");
      generateFallback();
      setLoading(false);
      return;
    }

    setLoading(true);
    setDbError(null);
    
    try {
      // 1. Recupero spot
      const { data: spotsData, error: spotsError } = await supabase
        .from('spots')
        .select('*');

      if (spotsError) throw spotsError;

      // 2. Recupero prenotazioni
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'confirmed');

      if (bookingsError) throw bookingsError;

      const todayStr = new Date().toISOString().split('T')[0];
      const todaysBookings = (bookingsData || []).filter(b => {
        if (!b.booking_date) return false;
        return b.booking_date.split('T')[0] === todayStr;
      });

      if (!spotsData || spotsData.length === 0) {
        setDbError("La tabella 'spots' ha risposto senza record. Mostro mappa locale temporanea.");
        generateFallback();
      } else {
        setSpots(spotsData);
      }
      setBookings(todaysBookings);

    } catch (err: any) {
      console.error('Errore durante il fetch dei dati:', err);
      setDbError(err.message || "Impossibile connettersi al database.");
      generateFallback();
    } finally {
      setLoading(false);
    }
  }, [generateFallback]);

  // Controllo sessione utente all'avvio
  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      if (!supabase) {
        if (isMounted) fetchData();
        return;
      }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && isMounted) {
          router.push('/admin/login');
        } else if (isMounted) {
          fetchData();
        }
      } catch (e) {
        console.error("Errore autenticazione:", e);
        if (isMounted) fetchData();
      }
    };

    checkUser();
    return () => { isMounted = false; };
  }, [router, fetchData]);

  const handleToggleSpot = async (spot: Spot) => {
    if (!supabase || spot.id.startsWith('fallback-')) {
      alert("Azione non disponibile in modalità provvisoria locale.");
      return;
    }

    // Lettura sicura dello stato booleano (gestisce sia booleani puri che stringhe "TRUE"/"false")
    const isAvailableNow = spot.is_available === true || 
                          spot.is_available === 'TRUE' || 
                          spot.is_available === 'true';
    
    const updatedAvailability = !isAvailableNow;

    const { error } = await supabase
      .from('spots')
      .update({ 
        is_available: updatedAvailability,
        notes: updatedAvailability ? null : (noteBlock || 'Chiuso manualmente')
      })
      .eq('id', spot.id);

    if (error) {
      alert("Errore durante l'aggiornamento dello stato dell'ombrellone.");
    } else {
      await fetchData(); 
      setSelectedSpot(null);
      setNoteBlock('');
    }
  };

  // MATRICE PLANIMETRICA DEL LIDO (1 - 174)
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

  // Renderizzatore universale del quadratino dell'ombrellone
  const renderSpotButton = (spot: Spot) => {
    // Controllo prenotazione incrociato su ID e codice pulito da spazi
    const spotCodeClean = spot.internal_code?.toString().trim().toLowerCase();
    
    const isBooked = bookings.some(b => {
      const bSpotId = b.spot_id;
      const bCodeClean = b.internal_code?.toString().trim().toLowerCase();
      return bSpotId === spot.id || (bCodeClean && bCodeClean === spotCodeClean);
    });

    const isAvailable = spot.is_available === true || 
                        spot.is_available === 'TRUE' || 
                        spot.is_available === 'true';

    let bgClass = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30";
    if (isBooked) {
      bgClass = "bg-red-500/20 border-red-500/60 text-red-400 hover:bg-red-500/40";
    } else if (!isAvailable) {
      bgClass = "bg-amber-500/20 border-amber-500/60 text-amber-500 hover:bg-amber-500/40";
    }

    const isSelected = selectedSpot?.id === spot.id;
    const isLongText = spotCodeClean.length > 3;

    return (
      <button
        key={spot.id}
        onClick={() => setSelectedSpot(spot)}
        className={`w-9 h-11 border rounded-lg flex flex-col items-center justify-center font-bold transition shadow-sm shrink-0 relative
          ${bgClass} ${isSelected ? 'ring-2 ring-blue-500 border-transparent scale-105 z-10' : ''}`}
      >
        <span className={isLongText ? 'text-[7px] leading-tight text-center px-0.5 uppercase' : 'text-[10px]'}>
          {spot.internal_code}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
          isBooked ? 'bg-red-500' : !isAvailable ? 'bg-amber-500' : 'bg-emerald-500'
        }`} />
      </button>
    );
  };

  // Trova lo spot per numero sulla griglia (con pulizia rigorosa delle stringhe)
  const renderAdminSpotByNum = (num: number) => {
    const targetStr = num.toString();
    const spot = spots.find(s => s.internal_code?.toString().trim() === targetStr);

    if (!spot) {
      // Box segnaposto vuoto se il codice non esiste temporaneamente nel DB
      return (
        <div key={`missing-${num}`} className="w-9 h-11 bg-slate-900/40 border border-dashed border-slate-800 rounded opacity-20 shrink-0 flex items-center justify-center text-[8px] text-slate-600">
          {num}
        </div>
      );
    }

    return renderSpotButton(spot);
  };

  // Gestione del corridoio centrale (es. se trova lo spot con testo "Bagnino")
  const renderCenterSpot = (centerLabel: string) => {
    if (!centerLabel || centerLabel.trim() === "") return <span className="opacity-20">•</span>;

    const specialSpot = spots.find(s => 
      s.internal_code?.toString().trim().toLowerCase() === centerLabel.trim().toLowerCase()
    );

    if (specialSpot) {
      return renderSpotButton(specialSpot);
    }

    return <span className="text-slate-500 select-none">{centerLabel}</span>;
  };

  // Calcolo dinamico dei codici fuori griglia (es. la serie 900)
  const extraSpots = spots.filter(s => {
    const codeStr = s.internal_code?.toString().trim() || '';
    if (codeStr.toLowerCase() === 'bagnino') return false;
    
    const codeNum = parseInt(codeStr, 10);
    // Se non è un numero o è fuori dal range 1-174, lo mandiamo nei fuori serie
    return isNaN(codeNum) || codeNum < 1 || codeNum > 174;
  });

  const totalSpots = spots.length;
  const closedSpots = spots.filter(s => {
    return !(s.is_available === true || s.is_available === 'TRUE' || s.is_available === 'true');
  }).length;
  const activeBookingsCount = bookings.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm font-medium">
        <RefreshCw className="animate-spin mr-2 h-5 w-5 text-blue-500" />
        Sincronizzazione della spiaggia in corso...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      
      {/* NAVBAR */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">Lido Control Panel</h1>
            <p className="text-xs text-slate-400">Pannello Amministrativo</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/admin/prenotazioni')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded-lg transition"
          >
            <FileText className="h-3.5 w-3.5" /> Prenotazioni
          </button>
          <button 
            onClick={async () => { if(supabase) await supabase.auth.signOut(); router.push('/admin/login'); }}
            className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-xs px-3 py-2 rounded-lg border border-red-900/40 transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Esci
          </button>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">

        {dbError && (
          <div className="bg-amber-950/30 border border-amber-900/50 text-amber-400 p-3.5 rounded-xl text-xs">
            <p className="font-semibold flex items-center gap-2">⚠️ Avviso Sistema: {dbError}</p>
          </div>
        )}
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Postazioni Totali</p>
              <h3 className="text-xl font-bold text-white mt-0.5">{totalSpots}</h3>
            </div>
            <Umbrella className="h-7 w-7 text-slate-700" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Occupati (Oggi)</p>
              <h3 className="text-xl font-bold text-emerald-400 mt-0.5">{activeBookingsCount}</h3>
            </div>
            <CheckCircle className="h-7 w-7 text-emerald-700/40" />
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Inaccessibili / Bloccati</p>
              <h3 className="text-xl font-bold text-amber-500 mt-0.5">{closedSpots}</h3>
            </div>
            <ShieldAlert className="h-7 w-7 text-amber-700/40" />
          </div>
        </div>

        {/* GRIGLIA ED EXTRA */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          <div className="xl:col-span-3 space-y-6">
            
            {/* CORPO MAPPA PRINCIPALE */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Umbrella className="h-4 w-4 text-blue-500" /> Mappa Settore Standard (1 - 174)
                </h2>
                <button onClick={fetchData} className="text-slate-400 hover:text-white p-1 transition">
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="w-full overflow-x-auto pb-2">
                <div className="flex flex-col gap-2 w-[950px] mx-auto pl-1">
                  {rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex items-center justify-start gap-3">
                      
                      {/* Settore Sinistro */}
                      <div className="w-[410px] grid grid-cols-10 gap-1 justify-items-start">
                        {row.startL ? (
                          <>
                            {Array.from({ length: 10 - (row.endL! - row.startL! + 1) }).map((_, i) => (
                              <div key={`empty-l-${i}`} className="w-9 h-11 opacity-0 pointer-events-none" />
                            ))}
                            {Array.from({ length: row.endL! - row.startL! + 1 }, (_, i) => row.startL! + i).map(renderAdminSpotByNum)}
                          </>
                        ) : (
                          Array.from({ length: 10 }).map((_, i) => <div key={`blank-l-${i}`} className="w-9 h-11" />)
                        )}
                      </div>
                      
                      {/* Corridoio Centrale */}
                      <div className="w-12 shrink-0 h-11 flex justify-center items-center font-black text-amber-500 uppercase text-[9px] tracking-wider bg-slate-950 rounded-lg border border-slate-800 shadow-inner overflow-hidden">
                        {renderCenterSpot(row.center)}
                      </div>
                      
                      {/* Settore Destro */}
                      <div className="w-[410px] grid grid-cols-10 gap-1 justify-items-start">
                        {row.startR ? (
                          <>
                            {Array.from({ length: row.endR! - row.startR! + 1 }, (_, i) => row.startR! + i).map(renderAdminSpotByNum)}
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
            </div>

            {/* SEZIONE DINAMICA EXTRA (Serie 900, ecc.) */}
            {extraSpots.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-500" /> Altri Settori Rilevati (Serie 900+)
                </h3>
                <div className="flex flex-wrap gap-2 pt-1">
                  {extraSpots.map(spot => (
                    <div key={spot.id}>
                      {renderSpotButton(spot)}
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* PANNELLO LATERALE */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl h-fit">
            <h2 className="text-md font-bold text-white border-b border-slate-800 pb-3 mb-4">
              Ispezione Selezionata
            </h2>
            
            {selectedSpot ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">
                    Codice: {selectedSpot.internal_code}
                  </h3>
                  <span className="text-[10px] text-slate-500 block font-mono truncate mt-1">
                    ID: {selectedSpot.id}
                  </span>
                </div>

                <div className="space-y-2 bg-slate-950 p-3.5 border border-slate-800 rounded-xl">
                  <p className="text-xs font-medium text-slate-400 mb-2">Modifica Disponibilità</p>
                  <button
                    onClick={() => handleToggleSpot(selectedSpot)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Inverti Stato Vendita
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs text-center py-10">
                Clicca su un ombrellone della mappa per vederne i dettagli o variarne la disponibilità online.
              </p>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
