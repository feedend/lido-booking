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
  is_available: boolean | string;
  is_active: boolean | string;
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

  // Tracciamento degli ombrelloni della griglia standard usati, per isolare quelli speciali (es. serie 900)
  const [mappedSpotIds, setMappedSpotIds] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    setLoading(true);
    setDbError(null);
    try {
      const { data: spotsData, error: spotsError } = await supabase
        .from('spots')
        .select('*');

      if (spotsError) throw spotsError;

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'confirmed');

      if (bookingsError) throw bookingsError;

      const todayStr = new Date().toISOString().split('T')[0];
      const todaysBookings = (bookingsData || []).filter(b => {
        if (!b.booking_date) return false;
        const bDate = b.booking_date.split('T')[0];
        return bDate === todayStr;
      });

      if (!spotsData || spotsData.length === 0) {
        setDbError("La tabella 'spots' è vuota su Supabase. Caricamento mappa locale.");
        generateFallback();
      } else {
        setSpots(spotsData);
      }

      setBookings(todaysBookings);
    } catch (err: any) {
      console.error('Errore caricamento dati:', err);
      setDbError(err.message || "Errore di comunicazione con Supabase.");
      generateFallback();
    } finally {
      setLoading(false);
    }
  };

  const generateFallback = () => {
    const fallbackSpots: Spot[] = Array.from({ length: 174 }, (_, i) => ({
      id: `fallback-${i + 1}`,
      internal_code: (i + 1).toString(),
      is_available: true,
      is_active: true,
      notes: null,
      zone_id: 'default-zone'
    }));
    setSpots(fallbackSpots);
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

  // Aggiorna l'elenco degli ID mappati nella griglia principale per calcolare i fuori serie
  useEffect(() => {
    const mapped = new Set<string>();
    
    // Scansiona tutta la matrice geometrica per vedere quali spot reali ha catturato
    spots.forEach(spot => {
      const codeStr = spot.internal_code?.trim();
      const codeNum = parseInt(codeStr);
      
      // Se è un numero tra 1 e 174, viene catturato dalla mappa principale
      if (!isNaN(codeNum) && codeNum >= 1 && codeNum <= 174) {
        mapped.add(spot.id);
      }
    });
    
    setMappedSpotIds(mapped);
  }, [spots]);

  const handleToggleSpot = async (spot: Spot) => {
    if (spot.id.startsWith('fallback-')) {
      alert("Azione non consentita in modalità provvisoria locale.");
      return;
    }

    const currentStatus = spot.is_available === true || spot.is_available === 'TRUE' || spot.is_available === 'true';
    const updatedAvailability = !currentStatus;

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

  // STRUTTURA DELLE RIGHE STANDARD
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

  // RENDERIZZATORE COMPONENTE OMBRELLONE (SICURO CONTRO STRINGHE/TEXT)
  const renderSpotButton = (spot: Spot) => {
    const isBooked = bookings.some(b => 
      b.spot_id === spot.id || 
      b.internal_code === spot.internal_code
    );

    const isAvailable = spot.is_available === true || spot.is_available === 'TRUE' || spot.is_available === 'true';

    let bgClass = "";
    if (isBooked) {
      bgClass = "bg-red-500/20 border-red-500/60 text-red-400 hover:bg-red-500/40";
    } else if (!isAvailable) {
      bgClass = "bg-amber-500/20 border-amber-500/60 text-amber-500 hover:bg-amber-500/40";
    } else {
      bgClass = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30";
    }

    const isSelected = selectedSpot?.id === spot.id;

    // Se il testo è lungo (es. "Bagnino"), riduciamo la dimensione del font per non romper l'HTML
    const isLongText = spot.internal_code.length > 3;

    return (
      <button
        key={spot.id}
        onClick={() => setSelectedSpot(spot)}
        className={`w-9 h-11 border rounded-lg flex flex-col items-center justify-center font-bold transition shadow-sm shrink-0 relative
          ${bgClass} ${isSelected ? 'ring-2 ring-blue-500 border-transparent scale-105 z-10' : ''}`}
      >
        <span className={isLongText ? 'text-[7px] leading-tight text-center px-0.5' : 'text-[10px]'}>
          {spot.internal_code}
        </span>
        <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
          isBooked ? 'bg-red-500' : !isAvailable ? 'bg-amber-500' : 'bg-emerald-500'
        }`} />
      </button>
    );
  };

  // Trova lo spot numerico per la griglia standard
  const renderAdminSpotByNum = (num: number) => {
    const spot = spots.find(s => {
      const codeStr = s.internal_code?.trim();
      return codeStr === num.toString();
    });

    if (!spot) {
      return <div key={`missing-${num}`} className="w-9 h-11 bg-slate-900/40 border border-dashed border-slate-800 rounded opacity-20 shrink-0 flex items-center justify-center text-[9px] text-slate-600">{num}</div>;
    }

    return renderSpotButton(spot);
  };

  // Trova lo spot testuale speciale per il corridoio centrale (es. "Bagnino")
  const renderCenterSpot = (centerLabel: string) => {
    if (!centerLabel) return <span className="opacity-30">•</span>;

    // Cerca se esiste uno spot nel DB che si chiama esattamente come la label (es. "Bagnino")
    const specialSpot = spots.find(s => s.internal_code?.trim().toLowerCase() === centerLabel.toLowerCase());

    if (specialSpot) {
      return renderSpotButton(specialSpot);
    }

    // Altrimenti mostra la classica lettera del corridoio
    return <span>{centerLabel}</span>;
  };

  // Filtra tutti gli spot esclusi dal computo grafico 1-174 o dalla postazione Bagnino
  const extraSpots = spots.filter(s => {
    const codeStr = s.internal_code?.trim();
    if (codeStr?.toLowerCase() === 'bagnino') return false;
    return !mappedSpotIds.has(s.id);
  });

  const totalSpots = spots.length;
  const closedSpots = spots.filter(s => {
    const isAvailable = s.is_available === true || s.is_available === 'TRUE' || s.is_available === 'true';
    return !isAvailable;
  }).length;
  const activeBookingsCount = bookings.length;

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
            onClick={() => { supabase.auth.signOut(); router.push('/admin/login'); }}
            className="flex items-center gap-2 bg-red-950/40 hover:bg-red-900/60 text-red-400 text-sm px-4 py-2 rounded-lg border border-red-900/50 transition"
          >
            <LogOut className="h-4 w-4" /> Esci
          </button>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">

        {dbError && (
          <div className="bg-amber-950/40 border border-amber-900/60 text-amber-400 p-4 rounded-xl text-xs">
            <p className="font-bold">⚠️ Avviso Database: {dbError}</p>
          </div>
        )}
        
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400">Ombrelloni nel Database</p>
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

        {/* CONTENUTO GENERALE MAPPA */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          <div className="xl:col-span-3 space-y-6">
            
            {/* SPIAGGIA PRINCIPALE */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 overflow-hidden">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Umbrella className="h-4 w-4 text-blue-500" /> Settori Standard (1 - 174)
                </h2>
                <button onClick={fetchData} className="text-slate-400 hover:text-white p-1 transition">
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <div className="w-full overflow-x-auto pb-2">
                <div className="flex flex-col gap-2 w-[940px] mx-auto pl-1">
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
                      
                      {/* Corridoio Centrale (Dinamicizzato se trova lo Spot "Bagnino") */}
                      <div className="w-11 shrink-0 h-11 flex justify-center items-center font-black text-amber-500 uppercase text-[9px] tracking-wider bg-slate-950 rounded-lg border border-slate-800 shadow-inner overflow-hidden">
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

            {/* SEZIONE DINAMICA PER ALTRI CODICI (Es. Serie 900 dello screenshot) */}
            {extraSpots.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <Layers className="h-4 w-4 text-amber-500" /> Postazioni Speciali / Altri Settori (Serie 900+)
                </h3>
                <p className="text-xs text-slate-500">Queste postazioni sono presenti nel database ma posizionate fuori dalla griglia standard:</p>
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

          {/* PANNELLO DI DETTAGLIO */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl h-fit">
            <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-4 mb-4">
              Dettaglio Selezionato
            </h2>
            
            {selectedSpot ? (
              <div className="space-y-6">
                <div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xl font-black text-white">Codice: {selectedSpot.internal_code}</span>
                    <span className="text-xs text-slate-500 truncate block">ID: {selectedSpot.id}</span>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-950 p-4 border border-slate-800 rounded-xl">
                  <h4 className="text-sm font-semibold text-slate-300">Azioni Rapide</h4>
                  <button
                    onClick={() => handleToggleSpot(selectedSpot)}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition"
                  >
                    <XCircle className="h-4 w-4" /> Inverti Disponibilità
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-12">
                Seleziona una postazione per modificarne lo stato.
              </p>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
