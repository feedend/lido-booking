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
  Umbrella,
  User,
  QrCode,
  Euro,
  Sun,
  CreditCard,
  Banknote,
  Wallet,
  PlusCircle,
  CheckSquare,
  Square
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
  total_price?: number; 
  notes?: string | null; 
  extra_sdraio?: number;  
  extra_lettini?: number; 
}

export default function AdminDashboard() {
  const [spots, setSpots] = useState<Spot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<any>(null);
  const [noteBlock, setNoteBlock] = useState('');
  const [ruolo, setRuolo] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  
  const [blockType, setBlockType] = useState<'permanent' | 'daily'>('daily');
  const [dailyPrice, setDailyPrice] = useState<string>('');
  const [dailyNotes, setDailyNotes] = useState<string>('Blocco Giornaliero');
  const [paymentMethod, setPaymentMethod] = useState<'Contanti' | 'POS' | 'Altro'>('Contanti');

  // --- STATI PER LA SELEZIONE MULTIPLA ---
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedBulkSpots, setSelectedBulkSpots] = useState<any[]>([]);
  const [isBulkOperating, setIsBulkOperating] = useState(false);

  const router = useRouter();

  const rows = [
    { startL: 1, endL: 10, startR: 11, endR: 20, center: "Bagnino" },
    { startL: 21, endL: 30, startR: 31, endR: 40, center: "P" },
    { startL: 41, endL: 50, startR: 51, endR: 60, center: "A" },
    { startL: 61, endL: 70, startR: 71, endR: 80, center: "S" },
    { startL: 81, endL: 90, startR: 91, endR: 100, center: "S" },
    { startL: 101, endL: 110, startR: 111, endR: 120, center: "E" },
    { startL: 121, endL: 129, startR: 130, endR: 139, center: "R" },
    { startL: 140, endL: 146, startR: 147, endR: 154, center: "E" },
    { startL: 155, endL: 160, startR: 161, endR: 167, center: "L" },
    { startL: null, endL: null, startR: 168, endR: 171, center: "L" },
    { startL: null, endL: null, startR: 172, endR: 174, center: "A" },
  ];

  const solariumBeds = Array.from({ length: 11 }, (_, i) => `S${i + 1}`);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: spotsData, error: spotsErr } = await supabase
        .from('spots')
        .select('id, internal_code, is_available, notes');

      if (spotsErr) throw spotsErr;

      const quindiciMinutiFa = new Date(Date.now() - 15 * 60 * 1000).toISOString();

      const { data: bookingsData, error: bookErr } = await supabase
        .from('bookings')
        .select('id, spot_id, guest_first_name, guest_last_name, guest_email, guest_phone, booking_category, total_price, notes, status, extra_sdraio, extra_lettini')
        .eq('booking_date', filterDate)
        .not('status', 'eq', 'cancelled')
        .or(`status.eq.confirmed,status.eq.checked_in,and(status.eq.pending,created_at.gt.${quindiciMinutiFa})`);

      if (bookErr) throw bookErr;

      setSpots((spotsData as Spot[]) || []);
      setBookings((bookingsData as Booking[]) || []);
    } catch (err) {
      console.error('Errore caricamento dati admin:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/admin/login');
        return;
      }

      const ruoloUtente = user.user_metadata?.ruolo || user.app_metadata?.ruolo;

      if (ruoloUtente !== 'admin' && ruoloUtente !== 'operators') {
        await supabase.auth.signOut();
        router.push('/admin/login');
        return;
      }

      setRuolo(ruoloUtente);
      fetchData();
    };
    checkUser();
  }, [router, filterDate]);

  // --- LOGICA SALVATAGGIO DI MASSA ---
  const handleBulkSubmit = async () => {
    if (selectedBulkSpots.length === 0) return;
    setIsBulkOperating(true);

    try {
      const noteFinali = `[Metodo: ${paymentMethod}] ${dailyNotes || 'Assegnato da operazione multipla'}`;
      
      for (const spotToBlock of selectedBulkSpots) {
        let spotId = spotToBlock.id;

        if (!spotId) {
          const { data: newSpot, error: createErr } = await supabase
            .from('spots')
            .insert([{ internal_code: spotToBlock.internal_code.toString(), is_available: true, is_active: true }])
            .select()
            .single();

          if (createErr) throw createErr;
          spotId = newSpot.id;
        }

        if (blockType === 'permanent') {
          const { error: updateErr } = await supabase
            .from('spots')
            .update({ is_available: false, notes: noteBlock || 'Blocco permanente multiplo' })
            .eq('id', spotId);
          if (updateErr) throw updateErr;
        } else {
          const { error: upsertErr } = await supabase
            .from('bookings')
            .upsert({
              spot_id: spotId,
              booking_date: filterDate,
              guest_first_name: 'Giornaliero',
              guest_last_name: 'In Loco',
              booking_category: 'Giornaliero in loco',
              status: 'confirmed',
              total_price: parseFloat(dailyPrice) || 0,
              notes: noteFinali
            }, { 
              onConflict: 'spot_id, booking_date' 
            });
          if (upsertErr) throw upsertErr;
        }
      }

      alert(`Operazione completata con successo su ${selectedBulkSpots.length} postazioni.`);
      setSelectedBulkSpots([]);
      setIsBulkMode(false);
      setDailyPrice('');
      setNoteBlock('');
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert("Errore durante l'operazione di massa: " + err.message);
    } finally {
      setIsBulkOperating(false);
    }
  };

  const handleToggleSpot = async (spotId: string | null, isAvailable: boolean, internalCode: string) => {
    if (!isAvailable) {
      const { error: unblockErr } = await supabase
        .from('spots')
        .update({ is_available: true, notes: null })
        .eq('id', spotId);

      if (unblockErr) {
        alert("Errore riattivazione postazione: " + unblockErr.message);
      } else {
        setNoteBlock('');
        fetchData();
        setSelectedSpot(null);
      }
      return;
    }

    if (blockType === 'permanent') {
      if (!spotId) {
        const { error: createErr } = await supabase
          .from('spots')
          .insert([{ internal_code: internalCode.toString(), is_available: false, notes: noteBlock || 'Blocco permanente' }]);
        if (createErr) alert("Errore blocco: " + createErr.message);
      } else {
        const { error: updateErr } = await supabase
          .from('spots')
          .update({ is_available: false, notes: noteBlock || 'Blocco permanente' })
          .eq('id', spotId);
        if (updateErr) alert("Errore blocco: " + updateErr.message);
      }
      setNoteBlock('');
      fetchData();
      setSelectedSpot(null);
      return;
    }
    
    let finalSpotId = spotId;

    if (!finalSpotId) {
      const { data: newSpot, error: createErr } = await supabase
        .from('spots')
        .insert([{ internal_code: internalCode.toString(), is_available: true, is_active: true }])
        .select()
        .single();

      if (createErr) {
        alert("Errore inizializzazione postazione: " + createErr.message);
        return;
      }
      finalSpotId = newSpot.id;
    }

    const targetCleanCode = internalCode.toString().trim().replace(/^0+/, '');
    const isOnlineBookingActive = bookings.some(b => {
      const spotCollegato = spots.find(s => s.id === b.spot_id);
      if (!spotCollegato) return false;
      const cleanDbCode = spotCollegato.internal_code.toString().trim().replace(/^0+/, '');
      return cleanDbCode === targetCleanCode && b.booking_category !== 'Giornaliero in loco';
    });

    if (isOnlineBookingActive) {
      alert("Impossibile sovrascrivere: su questa postazione è presente una prenotazione ONLINE attiva. Per liberarla, annullala dal Registro.");
      setSelectedSpot(null);
      return;
    }

    const noteFinali = `[Metodo: ${paymentMethod}] ${dailyNotes || 'Assegnato direttamente sul posto'}`;

    const { error: upsertErr } = await supabase
      .from('bookings')
      .upsert({
        spot_id: finalSpotId,
        booking_date: filterDate,
        guest_first_name: 'Giornaliero',
        guest_last_name: 'In Loco',
        booking_category: 'Giornaliero in loco',
        status: 'confirmed',
        total_price: parseFloat(dailyPrice) || 0,
        notes: noteFinali
      }, { 
        onConflict: 'spot_id, booking_date' 
      });

    if (upsertErr) {
      alert("Errore salvataggio blocco giornaliero: " + upsertErr.message);
    } else {
      setDailyPrice('');
      setDailyNotes('Blocco Giornaliero');
      setPaymentMethod('Contanti');
      fetchData();
      setSelectedSpot(null);
    }
  };

  const handleRemoveDailyBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (error) {
      alert("Errore rimozione blocco giornaliero: " + error.message);
    } else {
      fetchData();
      setSelectedSpot(null);
    }
  };

  const prenotazioniConfermate = bookings.filter(b => (b as any).status === 'confirmed' || (b as any).status === 'checked_in');
  const totaleGenerale = prenotazioniConfermate.reduce((sum, b) => sum + (b.total_price || 0), 0);
  const giornalieriInLoco = prenotazioniConfermate.filter(b => b.booking_category === 'Giornaliero in loco');
  const totaleGiornalieriInLoco = giornalieriInLoco.reduce((sum, b) => sum + (b.total_price || 0), 0);
  
  const totaleContanti = giornalieriInLoco
    .filter(b => b.notes?.includes('[Metodo: Contanti]'))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const totalePOS = giornalieriInLoco
    .filter(b => b.notes?.includes('[Metodo: POS]'))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const totaleAltro = giornalieriInLoco
    .filter(b => b.notes?.includes('[Metodo: Altro]'))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const renderGenericSpotButton = (codeString: string, displayLabel: string) => {
    const correspondingSpot = spots.find(s => {
      if (!s.internal_code) return false;
      const cleanDbCode = s.internal_code.toString().trim().replace(/^0+/, '');
      const cleanTargetCode = codeString.trim().replace(/^0+/, '');
      return cleanDbCode === cleanTargetCode;
    });

    const booking = correspondingSpot ? bookings.find(b => b.spot_id === correspondingSpot.id) : null;
    const isBooked = !!booking;
    const isManuallyBlocked = correspondingSpot ? !correspondingSpot.is_available : false;
    const isDailyLocalBlock = booking?.booking_category === 'Giornaliero in loco';

    const isSelectedInBulk = selectedBulkSpots.some(s => s.internal_code === codeString);

    let btnClass = "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900";
    if (isSelectedInBulk) {
      btnClass = "bg-orange-600 border-orange-700 text-white font-black scale-105 ring-2 ring-orange-400";
    } else if (isManuallyBlocked) {
      btnClass = "bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200 font-bold";
    } else if (isDailyLocalBlock) {
      btnClass = "bg-orange-100 border-orange-400 text-orange-800 hover:bg-orange-200 font-bold";
    } else if (isBooked) {
      btnClass = "bg-red-100 border-red-400 text-red-800 hover:bg-red-200";
    } else if (correspondingSpot) {
      btnClass = "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100";
    }

    const spotDataData = correspondingSpot || {
      id: '',
      internal_code: codeString,
      is_available: true,
      notes: null
    };

    const handleSpotClick = () => {
      if (isBulkMode) {
        if (isBooked && !isDailyLocalBlock) {
          alert(`La postazione ${codeString} ha una prenotazione ONLINE. Non puoi includerla nelle operazioni di massa.`);
          return;
        }

        if (isSelectedInBulk) {
          setSelectedBulkSpots(prev => prev.filter(s => s.internal_code !== codeString));
        } else {
          setSelectedBulkSpots(prev => [...prev, spotDataData]);
        }
      } else {
        // --- LOGICA DI SBLOCCO IMMEDIATO AD UN CLICK ---
        if (isDailyLocalBlock && booking) {
          const conferma = confirm(`Vuoi sbloccare immediatamente la postazione ${codeString} eliminando il blocco giornaliero?`);
          if (conferma) {
            handleRemoveDailyBooking(booking.id);
          }
        } else if (isManuallyBlocked) {
          const conferma = confirm(`Vuoi riattivare la postazione ${codeString} rimuovendo il blocco permanente?`);
          if (conferma) {
            handleToggleSpot(spotDataData.id, false, spotDataData.internal_code);
          }
        } else {
          // Se libera o prenotata online, mostra il pannello laterale classico
          setSelectedSpot({ ...spotDataData, _booking: booking });
        }
      }
    };

    return (
      <button
        key={codeString}
        type="button"
        onClick={handleSpotClick}
        className={`w-9 h-11 border text-[11px] rounded-lg flex items-center justify-center font-black transition relative ${btnClass} ${!isBulkMode && selectedSpot?.internal_code === codeString ? 'ring-2 ring-blue-500 border-transparent shadow-lg shadow-blue-500/20 scale-105' : ''}`}
      >
        {displayLabel}
        {isBooked && !isSelectedInBulk && (
          <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse ${isDailyLocalBlock ? 'bg-orange-500' : 'bg-red-600'}`} />
        )}
      </button>
    );
  };

  const renderAdminSpot = (num: number) => {
    return renderGenericSpotButton(num.toString(), num.toString());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg text-white shadow-md shadow-orange-600/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wider text-slate-900 uppercase">Lido Control Panel</h1>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-bold border ${
                ruolo === 'admin' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}>
                {ruolo === 'admin' ? 'Admin' : 'Operatore'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Planimetria Simmetrica Real-Time</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              setSelectedBulkSpots([]);
              setSelectedSpot(null);
            }}
            className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider px-4 py-2 border rounded-xl transition shadow-sm ${
              isBulkMode 
                ? 'bg-orange-600 text-white border-transparent animate-pulse' 
                : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'
            }`}
          >
            {isBulkMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {isBulkMode ? 'Selezione attiva' : 'Selezione Multipla'}
          </button>

          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-600 font-bold uppercase text-[10px]">Data Mappa:</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-slate-900 font-bold text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          {ruolo === 'admin' ? (
            <button 
              onClick={() => router.push('/admin/prenotazioni')}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white border border-transparent rounded-xl transition shadow-sm"
            >
              <FileText className="h-4 w-4" /> Registro
            </button>
          ) : (
            <button 
              onClick={() => router.push('/admin/dashboard/opdashboard')}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white border border-transparent rounded-xl transition shadow-lg shadow-sky-600/20"
            >
              <QrCode className="h-4 w-4" /> Scanner QR
            </button>
          )}

          <button 
            onClick={async () => { await supabase.auth.signOut(); router.push('/admin/login'); }}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl border border-red-200 transition"
          >
            <LogOut className="h-4 w-4" /> Esci
          </button>
        </div>
      </nav>

      {/* Box Finanziari */}
      {ruolo === 'admin' && (
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Incasso Totale Giorno (Online+Loco)</p>
              <p className="text-2xl font-mono font-black text-emerald-600 mt-1">{totaleGenerale.toFixed(2)} €</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600 border border-emerald-100">
              <Euro className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Totale Giornalieri in Loco</p>
              <p className="text-2xl font-mono font-black text-orange-600 mt-1">{totaleGiornalieriInLoco.toFixed(2)} €</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-xl text-orange-600 border border-orange-100">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col justify-center shadow-sm space-y-2">
            <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider mb-1">Dettaglio Cassa in Loco</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[9px] font-black uppercase text-slate-500 flex items-center justify-center gap-1">
                  <Banknote className="w-3 h-3 text-emerald-600" /> Contanti
                </span>
                <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">{totaleContanti.toFixed(2)} €</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[9px] font-black uppercase text-slate-500 flex items-center justify-center gap-1">
                  <CreditCard className="w-3 h-3 text-blue-600" /> POS
                </span>
                <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">{totalePOS.toFixed(2)} €</p>
              </div>
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                <span className="text-[9px] font-black uppercase text-slate-500 flex items-center justify-center gap-1">
                  <Euro className="w-3 h-3 text-amber-600" /> Altro
                </span>
                <p className="text-sm font-mono font-bold text-slate-800 mt-0.5">{totaleAltro.toFixed(2)} €</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* MAPPE */}
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-4 shadow-sm overflow-x-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-4 gap-3 min-w-[920px]">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Umbrella className="h-4 w-4 text-orange-500" /> Disposizione Speculare Spiaggia {isBulkMode && <span className="text-orange-600 text-[11px] font-bold">(MODALITÀ MULTIPLA ATTIVA)</span>}
                </h2>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-emerald-700"><span className="w-2.5 h-2.5 rounded-md bg-emerald-50 border border-emerald-300"></span> Attivo</span>
                  <span className="flex items-center gap-1.5 text-red-700"><span className="w-2.5 h-2.5 rounded-md bg-red-100 border border-red-400"></span> Occupato</span>
                  <span className="flex items-center gap-1.5 text-orange-700"><span className="w-2.5 h-2.5 rounded-md bg-orange-100 border border-orange-400"></span> Giornaliero Loco</span>
                  <span className="flex items-center gap-1.5 text-amber-700"><span className="w-2.5 h-2.5 rounded-md bg-amber-100 border border-amber-400"></span> Bloccato Permanente</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 min-w-[920px] pt-2 pb-2">
                {loading ? (
                  <div className="text-center py-24 text-xs font-mono text-slate-400 animate-pulse uppercase tracking-widest">
                    Sincronizzazione Layout...
                  </div>
                ) : (
                  rows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex items-center justify-start gap-4">
                      <div className="w-[420px] grid grid-cols-10 gap-1 justify-items-start">
                        {row.startL ? (
                          <>
                            {Array.from({ length: 10 - (row.endL! - row.startL! + 1) }).map((_, i) => (
                              <div key={`empty-l-${i}`} className="w-9 h-11 opacity-0 pointer-events-none" />
                            ))}
                            {Array.from({ length: row.endL! - row.startL! + 1 }, (_, i) => row.startL! + i).map(renderAdminSpot)}
                          </>
                        ) : (
                          Array.from({ length: 10 }).map((_, i) => <div key={`blank-l-${i}`} className="w-9 h-11 opacity-0 pointer-events-none" />)
                        )}
                      </div>
                      
                      <div className="w-14 shrink-0 flex justify-center items-center font-black text-slate-400 uppercase text-[9px] tracking-widest bg-slate-100 py-2 rounded-xl border border-slate-200 shadow-inner text-center">
                        {row.center || "•"}
                      </div>
                      
                      <div className="w-[420px] grid grid-cols-10 gap-1 justify-items-start">
                        {row.startR ? (
                          <>
                            {Array.from({ length: row.endR! - row.startR! + 1 }, (_, i) => row.startR! + i).map(renderAdminSpot)}
                            {Array.from({ length: 10 - (row.endR! - row.startR! + 1) }).map((_, i) => (
                              <div key={`empty-r-${i}`} className="w-9 h-11 opacity-0 pointer-events-none" />
                            ))}
                          </>
                        ) : (
                          Array.from({ length: 10 }).map((_, i) => <div key={`blank-r-${i}`} className="w-9 h-11 opacity-0 pointer-events-none" />)
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* BOX SOLARIUM */}
            <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-4 shadow-sm">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" /> Area Solarium Terrazza
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Gestione 11 Lettini Esclusivi in Loco</p>
              </div>

              {loading ? (
                <div className="text-center py-6 text-xs font-mono text-slate-400 animate-pulse uppercase tracking-widest">
                  Caricamento Solarium...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1 pb-1 justify-start">
                  {solariumBeds.map((bedCode) => renderGenericSpotButton(bedCode, bedCode))}
                </div>
              )}
            </div>
          </div>

          {/* COLONNA DESTRA: PANNELLO COMPORTAMENTALE */}
          <div className="space-y-4">
            {isBulkMode ? (
              <div className="bg-white border-2 border-orange-500 p-5 rounded-3xl shadow-md space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <h3 className="text-xs font-black text-orange-600 uppercase tracking-wider border-b border-slate-100 pb-3 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4" /> Operazione di Massa
                </h3>
                
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                  <span className="text-[9px] uppercase font-black text-orange-700 block mb-1">Postazioni Scelte ({selectedBulkSpots.length}):</span>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {selectedBulkSpots.length === 0 ? (
                      <span className="text-xs text-orange-600 italic">Clicca sulle mappe per selezionare...</span>
                    ) : (
                      selectedBulkSpots.map(s => (
                        <span key={s.internal_code} className="bg-orange-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-md">
                          {s.internal_code}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {selectedBulkSpots.length > 0 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setBlockType('daily')}
                        className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition ${blockType === 'daily' ? 'bg-orange-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Dimostrazione
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlockType('permanent')}
                        className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition ${blockType === 'permanent' ? 'bg-amber-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Permanente
                      </button>
                    </div>

                    {blockType === 'permanent' ? (
                      <input 
                        type="text" 
                        placeholder="Nota blocco permanente per tutti..."
                        value={noteBlock}
                        onChange={(e) => setNoteBlock(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500 font-medium"
                      />
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">€</span>
                          <input 
                            type="number" 
                            placeholder="Prezzo (ciascuno)..."
                            value={dailyPrice}
                            onChange={(e) => setDailyPrice(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 pl-7 text-xs focus:outline-none focus:border-orange-500 font-mono font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-black text-slate-500 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> Metodo Unico Pagamento
                          </label>
                          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-50 border border-slate-200 rounded-xl">
                            {(['Contanti', 'POS', 'Altro'] as const).map((method) => (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setPaymentMethod(method)}
                                className={`py-1 text-[10px] font-bold rounded-lg transition ${paymentMethod === method ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                {method}
                              </button>
                            ))}
                          </div>
                        </div>

                        <input 
                          type="text" 
                          placeholder="Note tracciamento uniche..."
                          value={dailyNotes}
                          onChange={(e) => setDailyNotes(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={isBulkOperating}
                      onClick={handleBulkSubmit}
                      className="w-full py-3 bg-orange-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-orange-700 transition shadow-lg shadow-orange-600/20 disabled:opacity-50"
                    >
                      {isBulkOperating ? 'Esecuzione in corso...' : 'Conferma Blocco Di Massa'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* PANNELLO DI DETTAGLIO CLASSICO (SINGOLO) */
              selectedSpot && (
                <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4 animate-in fade-in slide-in-from-right-5 duration-200">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Umbrella className="w-4 h-4 text-blue-500" /> Postazione {selectedSpot.internal_code}
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">Configurazione Singola</p>
                    </div>
                    <button 
                      onClick={() => setSelectedSpot(null)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase tracking-tighter"
                    >
                      Chiudi
                    </button>
                  </div>

                  {/* FORM INSERIMENTO PRENOTAZIONE IN LOCO */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setBlockType('daily')}
                        className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition ${blockType === 'daily' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Giornaliero
                      </button>
                      <button
                        type="button"
                        onClick={() => setBlockType('permanent')}
                        className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition ${blockType === 'permanent' ? 'bg-amber-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                      >
                        Permanente
                      </button>
                    </div>

                    {blockType === 'permanent' ? (
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder="Nota blocco permanente..."
                          value={noteBlock}
                          onChange={(e) => setNoteBlock(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-amber-500 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => handleToggleSpot(selectedSpot.id, selectedSpot.is_available, selectedSpot.internal_code)}
                          className="w-full py-3 bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-amber-700 transition"
                        >
                          Salva Blocco Permanente
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">€</span>
                          <input 
                            type="number" 
                            placeholder="Prezzo Giornaliero..."
                            value={dailyPrice}
                            onChange={(e) => setDailyPrice(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-xl p-2.5 pl-7 text-xs focus:outline-none focus:border-blue-500 font-mono font-bold"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] uppercase font-black text-slate-500 flex items-center gap-1">
                            <CreditCard className="w-3 h-3" /> Metodo Pagamento
                          </label>
                          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-50 border border-slate-200 rounded-xl">
                            {(['Contanti', 'POS', 'Altro'] as const).map((method) => (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setPaymentMethod(method)}
                                className={`py-1 text-[10px] font-bold rounded-lg transition ${paymentMethod === method ? 'bg-slate-800 text-white font-black' : 'text-slate-400 hover:text-slate-600'}`}
                              >
                                {method}
                              </button>
                            ))}
                          </div>
                        </div>

                        <input 
                          type="text" 
                          placeholder="Note aggiuntive..."
                          value={dailyNotes}
                          onChange={(e) => setDailyNotes(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs focus:outline-none focus:border-blue-500"
                        />

                        <button
                          type="button"
                          onClick={() => handleToggleSpot(selectedSpot.id, selectedSpot.is_available, selectedSpot.internal_code)}
                          className="w-full py-3 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition shadow-lg shadow-blue-600/20"
                        >
                          Assegna in Loco
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
