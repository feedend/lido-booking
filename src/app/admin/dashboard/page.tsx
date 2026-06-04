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
  const [dbError, setDbError] = useState<string | null>(null);
  const router = useRouter();

  const [mappedSpotIds, setMappedSpotIds] = useState<Set<string>>(new Set());

  // Genera sempre la mappa 1-174 come base solida di fallback
  const generateFallback = useCallback((existingSpots: Spot[] = []) => {
    const fallbackSpots: Spot[] = Array.from({ length: 174 }, (_, i) => {
      const codeStr = (i + 1).toString();
      // Se nel DB esiste già lo spot, usa quello, altrimenti crealo in locale
      const found = existingSpots.find(s => s.internal_code?.toString().trim() === codeStr);
      return found || {
        id: `fallback-${codeStr}`,
        internal_code: codeStr,
        is_available: true,
        is_active: true,
        notes: null,
        zone_id: 'default-zone'
      };
    });

    // Aggiunge eventuali spot testuali o speciali già caricati (es. Bagnino, serie 900)
    const specialSpots = existingSpots.filter(s => {
      const num = parseInt(s.internal_code);
      return isNaN(num) || num < 1 || num > 174;
    });

    setSpots([...fallbackSpots, ...specialSpots]);
  }, []);

  const fetchData = useCallback(async () => {
    if (!supabase) {
      generateFallback();
      setLoading(false);
      return;
    }

    setLoading(true);
    setDbError(null);
    
    try {
      // 1. Recupero Prenotazioni (Sappiamo che funziona!)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .eq('status', 'confirmed');

      if (!bookingsError && bookingsData) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todaysBookings = bookingsData.filter(b => {
          if (!b.booking_date) return false;
          return b.booking_date.split('T')[0] === todayStr;
        });
        setBookings(todaysBookings);
      }

      // 2. Recupero Spots
      const { data: spotsData, error: spotsError } = await supabase
        .from('spots')
        .select('*');

      if (spotsError) throw spotsError;

      if (!spotsData || spotsData.length === 0) {
        // RLS attiva o tabella vuota: Forza la generazione visiva
        setDbError("Nessun dato letto da 'spots' (Verifica le policy RLS su Supabase). Mappa forzata attiva.");
        generateFallback([]);
      } else {
        generateFallback(spotsData);
      }

    } catch (err: any) {
      console.error('Errore fetch:', err);
      setDbError(err.message || "Errore di caricamento.");
      generateFallback([]);
    } finally {
      setLoading(false);
    }
  }, [generateFallback]);

  useEffect(() => {
    let isMounted = true;
    const checkUser = async () => {
      if (!supabase) {
        if (isMounted) fetchData();
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && isMounted) {
        router.push('/admin/login');
      } else if (isMounted) {
        fetchData();
      }
    };
    checkUser();
    return () => { isMounted = false; };
  }, [router, fetchData]);

  useEffect(() => {
    const mapped = new Set<string>();
    spots.forEach(spot => {
      const codeNum = parseInt(spot.internal_code);
      if (!isNaN(codeNum) && codeNum >= 1 && codeNum <= 174 && !spot.id.startsWith('fallback-')) {
        mapped.add(spot.id);
      }
    });
    setMappedSpotIds(mapped);
  }, [spots]);

  const handleToggleSpot = async (spot: Spot) => {
    if (!supabase || spot.id.startsWith('fallback-')) {
      alert("Attenzione: sblocca le policy RLS su Supabase per salvare le modifiche nel database.");
      return;
    }

    const isAvailableNow = spot.is_available === true || spot.is_available === 'TRUE' || spot.is_available === 'true';
    const updatedAvailability = !isAvailableNow;

    const { error } = await supabase
      .from('spots')
      .update({ is_available: updatedAvailability })
      .eq('id', spot.id);

    if (error) {
      alert("Errore aggiornamento: " + error.message);
    } else {
      await fetchData(); 
      setSelectedSpot(null);
    }
  };

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

  const renderSpotButton = (spot: Spot) => {
    const spotCodeClean = spot.internal_code?.toString().trim().toLowerCase();
    
    // Controllo incrociato: abbinamento prenotazione tramite ID dello spot oppure tramite codice (es. "99")
    const isBooked = bookings.some(b => {
      return b.spot_id === spot.id || (b.internal_code?.toString().trim().toLowerCase() === spotCodeClean);
    });

    const isAvailable = spot.is_available === true || spot.is_available === 'TRUE' || spot.is_available === 'true';

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

  const renderAdminSpotByNum = (num: number) => {
    const targetStr = num.toString();
    // Cerca prima lo spot reale dal DB, altrimenti prende il segnaposto locale
    const spot = spots.find(s => s.internal_code?.toString().trim() === targetStr && !s.id.startsWith('fallback-'))
                 || spots.find(s => s.internal_code?.toString().trim() === targetStr);

    return spot ? renderSpotButton(spot) : null;
  };

  const renderCenterSpot = (centerLabel: string) => {
    if (!centerLabel || centerLabel.trim() === "") return <span className="opacity-20">•</span>;
    const specialSpot = spots.find(s => s.internal_code?.toString().trim().toLowerCase() === centerLabel.trim().toLowerCase());
    return specialSpot ? renderSpotButton(specialSpot) : <span className="text-slate-500 select-none">{centerLabel}</span>;
  };

  const extraSpots = spots.filter(s => {
    if (s.id.startsWith('fallback-')) return false;
    const codeStr = s.internal_code?.toString().trim() || '';
    if (codeStr.toLowerCase() === 'bagnino') return false;
    return !mappedSpotIds.has(s.id);
  });

  const totalSpots = spots.filter(s => !s.id.startsWith('fallback-')).length;
  const closedSpots = spots.filter(s => !s.id.startsWith('fallback-') && !(s.is_available === true || s.is_available === 'TRUE' || s.is_available === 'true')).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm">
        <RefreshCw className="animate-spin mr-2 h-5 w-5 text-blue-500" /> Caricamento Lido...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white"><Layers className="h-5 w-5" /></div>
          <div>
            <h1 className="text-lg font-bold text-white">Lido Control Panel</h1>
            <p className="text-xs text-slate-400">Gestione Mappa</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/admin/prenotazioni')} className="bg-slate-800 hover:bg-slate-700 text-xs px-3 py-2 rounded-lg transition">Prenotazioni</button>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        {dbError && (
          <div className="bg-amber-950/30 border border-amber-900/50 text-amber-400 p-3 rounded-xl text-xs font-medium">
            ⚠️ {dbError}
          </div>
        )}
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <p className="text-xs text-slate-400">Ombrelloni Database</p>
            <h3 className="text-xl font-bold mt-0.5">{totalSpots}</h3>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <p className="text-xs text-slate-400">Prenotati Oggi</p>
            <h3 className="text-xl font-bold text-emerald-400 mt-0.5">{bookings.length}</h3>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
            <p className="text-xs text-slate-400">Bloccati Manualmente</p>
            <h3 className="text-xl font-bold text-amber-500 mt-0.5">{closedSpots}</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 overflow-hidden">
              <div className="w-full overflow-x-auto pb-2">
                <div className="flex flex-col gap-2 w-[950px] mx-auto pl-1">
                  {rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex items-center justify-start gap-3">
                      <div className="w-[410px] grid grid-cols-10 gap-1 justify-items-start">
                        {row.startL ? (
                          <>
                            {Array.from({ length: 10 - (row.endL! - row.startL! + 1) }).map((_, i) => <div key={`e-l-${i}`} className="w-9 h-11 opacity-0 pointer-events-none" />)}
                            {Array.from({ length: row.endL! - row.startL! + 1 }, (_, i) => row.startL! + i).map(renderAdminSpotByNum)}
                          </>
                        ) : Array.from({ length: 10 }).map((_, i) => <div key={`b-l-${i}`} className="w-9 h-11" />)}
                      </div>
                      <div className="w-12 shrink-0 h-11 flex justify-center items-center font-black text-amber-500 uppercase text-[9px] bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
                        {renderCenterSpot(row.center)}
                      </div>
                      <div className="w-[410px] grid grid-cols-10 gap-1 justify-items-start">
                        {row.startR ? (
                          <>
                            {Array.from({ length: row.endR! - row.startR! + 1 }, (_, i) => row.startR! + i).map(renderAdminSpotByNum)}
                            {Array.from({ length: 10 - (row.endR! - row.startR! + 1) }).map((_, i) => <div key={`e-r-${i}`} className="w-9 h-11 opacity-0 pointer-events-none" />)}
                          </>
                        ) : Array.from({ length: 10 }).map((_, i) => <div key={`b-r-${i}`} className="w-9 h-11" />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {extraSpots.length > 0 && (
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-3">
                <h3 className="text-xs font-bold text-amber-500">Postazioni Speciali Rilevate (Serie 900+)</h3>
                <div className="flex flex-wrap gap-2">{extraSpots.map(spot => <div key={spot.id}>{renderSpotButton(spot)}</div>)}</div>
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl h-fit">
            <h2 className="text-md font-bold text-white border-b border-slate-800 pb-3 mb-4">Dettaglio Ombrellone</h2>
            {selectedSpot ? (
              <div className="space-y-4">
                <h3 className="text-lg font-black text-white">Codice: {selectedSpot.internal_code}</h3>
                <button onClick={() => handleToggleSpot(selectedSpot)} className="w-full bg-amber-600 text-white text-xs font-semibold py-2 rounded-lg">
                  Inverti Stato Vendita
                </button>
              </div>
            ) : <p className="text-slate-500 text-xs text-center py-10">Seleziona un ombrellone.</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
