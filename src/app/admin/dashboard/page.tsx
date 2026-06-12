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
  Wallet
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

      const { data: bookingsData, error: bookErr } = await supabase
        .from('bookings')
        .select('id, spot_id, guest_first_name, guest_last_name, guest_email, guest_phone, booking_category, total_price, notes')
        .eq('booking_date', filterDate)
        .not('status', 'eq', 'cancelled');

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

  // --- LOGICA DI CONTEGGIO FINANZIARIO DIVISO ---
  const totaleGenerale = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  
  const giornalieriInLoco = bookings.filter(b => b.booking_category === 'Giornaliero in loco');
  
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

    let btnClass = "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white";
    if (isManuallyBlocked) {
      btnClass = "bg-amber-500/20 border-amber-500/60 text-amber-400 hover:bg-amber-500/30 font-bold";
    } else if (isDailyLocalBlock) {
      btnClass = "bg-orange-500/20 border-orange-500/60 text-orange-400 hover:bg-orange-500/30 font-bold";
    } else if (isBooked) {
      btnClass = "bg-red-500/20 border-red-500/60 text-red-400 hover:bg-red-500/30";
    } else if (correspondingSpot) {
      btnClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20";
    }

    const spotDataData = correspondingSpot || {
      id: '',
      internal_code: codeString,
      is_available: true,
      notes: null
    };

    return (
      <button
        key={codeString}
        type="button"
        onClick={() => setSelectedSpot({ ...spotDataData, _booking: booking })}
        className={`w-9 h-11 border text-[11px] rounded-lg flex items-center justify-center font-black transition relative ${btnClass} ${selectedSpot?.internal_code === codeString ? 'ring-2 ring-blue-500 border-transparent shadow-lg shadow-blue-500/20 scale-105' : ''}`}
      >
        {displayLabel}
        {isBooked && (
          <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full animate-pulse ${isDailyLocalBlock ? 'bg-orange-400' : 'bg-red-500'}`} />
        )}
      </button>
    );
  };

  const renderAdminSpot = (num: number) => {
    return renderGenericSpotButton(num.toString(), num.toString());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Navbar */}
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2 rounded-lg text-white shadow-md shadow-orange-600/20">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-black tracking-wider text-white uppercase">Lido Control Panel</h1>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-md uppercase font-bold border ${
                ruolo === 'admin' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
              }`}>
                {ruolo === 'admin' ? 'Admin' : 'Operatore'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Planimetria Simmetrica Real-Time</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Data Mappa:</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-0.5 text-white font-bold text-xs focus:outline-none focus:border-orange-500"
            />
          </div>

          {ruolo === 'admin' ? (
            <button 
              onClick={() => router.push('/admin/prenotazioni')}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-transparent rounded-xl transition"
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
            className="flex items-center gap-2 bg-red-950/30 hover:bg-red-900/40 text-red-400 text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-xl border border-red-900/30 transition"
          >
            <LogOut className="h-4 w-4" /> Esci
          </button>
        </div>
      </nav>

      {/* Box Finanziari Dettagliati - Visibili SOLO all'Admin */}
      {ruolo === 'admin' && (
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
          
          {/* Box 1: Incasso Generale */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Incasso Totale Giorno (Online+Loco)</p>
              <p className="text-2xl font-mono font-black text-emerald-400 mt-1">{totaleGenerale.toFixed(2)} €</p>
            </div>
            <div className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400">
              <Euro className="w-5 h-5" />
            </div>
          </div>

          {/* Box 2: Totale In Loco */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between shadow-lg">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Totale Giornalieri in Loco</p>
              <p className="text-2xl font-mono font-black text-orange-400 mt-1">{totaleGiornalieriInLoco.toFixed(2)} €</p>
            </div>
            <div className="bg-orange-500/10 p-3 rounded-xl text-orange-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>

          {/* Box 3: Breakdown Metodi di Pagamento in Loco */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-center shadow-lg space-y-2">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-1">Dettaglio Cassa in Loco</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                <span className="text-[9px] font-black uppercase text-slate-500 flex items-center justify-center gap-1">
                  <Banknote className="w-3 h-3 text-emerald-500" /> Contanti
                </span>
                <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">{totaleContanti.toFixed(2)} €</p>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                <span className="text-[9px] font-black uppercase text-slate-500 flex items-center justify-center gap-1">
                  <CreditCard className="w-3 h-3 text-blue-500" /> POS
                </span>
                <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">{totalePOS.toFixed(2)} €</p>
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-850">
                <span className="text-[9px] font-black uppercase text-slate-500 flex items-center justify-center gap-1">
                  <Euro className="w-3 h-3 text-amber-500" /> Altro
                </span>
                <p className="text-sm font-mono font-bold text-slate-200 mt-0.5">{totaleAltro.toFixed(2)} €</p>
              </div>
            </div>
          </div>

        </div>
      )}

      <main className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
          
          {/* COLONNA SINISTRA: MAPPE */}
          <div className="xl:col-span-3 space-y-6">
            
            {/* MAPPA SPIAGGIA */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl overflow-x-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-3 min-w-[920px]">
                <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Umbrella className="h-4 w-4 text-orange-500" /> Disposizione Speculare Spiaggia
                </h2>
                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-emerald-400"><span className="w-2.5 h-2.5 rounded-md bg-emerald-500/10 border border-emerald-500/30"></span> Attivo</span>
                  <span className="flex items-center gap-1.5 text-red-400"><span className="w-2.5 h-2.5 rounded-md bg-red-500/20 border border-red-500/50"></span> Occupato</span>
                  <span className="flex items-center gap-1.5 text-orange-400"><span className="w-2.5 h-2.5 rounded-md bg-orange-500/20 border border-orange-500/60"></span> Giornaliero Loco</span>
                  <span className="flex items-center gap-1.5 text-amber-400"><span className="w-2.5 h-2.5 rounded-md bg-amber-500/20 border border-amber-500/60"></span> Bloccato Permanente</span>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 min-w-[920px] pt-2 pb-2">
                {loading ? (
                  <div className="text-center py-24 text-xs font-mono text-slate-500 animate-pulse uppercase tracking-widest">
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
                      
                      <div className="w-14 shrink-0 flex justify-center items-center font-black text-slate-500 uppercase text-[9px] tracking-widest bg-slate-950 py-2 rounded-xl border border-slate-800 shadow-inner text-center">
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
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl space-y-4 shadow-xl">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-400" /> Area Solarium Terrazza
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Gestione 11 Lettini Esclusivi in Loco</p>
              </div>

              {loading ? (
                <div className="text-center py-6 text-xs font-mono text-slate-500 animate-pulse uppercase tracking-widest">
                  Caricamento Solarium...
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 pt-1 pb-1 justify-start">
                  {solariumBeds.map((bedCode) => renderGenericSpotButton(bedCode, bedCode))}
                </div>
              )}
            </div>

          </div>

          {/* PANNELLO DI DETTAGLIO ED ISPEZIONE */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-xs font-black text-white uppercase tracking-wider border-b border-slate-800 pb-3">
              Ispezione Postazione
            </h3>
            
            {selectedSpot ? (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <span className="text-sm font-black text-white font-mono">Codice: {selectedSpot.internal_code}</span>
                  <span className={`px-2 py-0.5 text-[9px] rounded-lg font-black uppercase border ${
                    selectedSpot._booking?.booking_category === 'Giornaliero in loco'
                      ? 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                      : selectedSpot.is_available ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}>
                    {selectedSpot._booking?.booking_category === 'Giornaliero in loco' 
                      ? 'In Loco' 
                      : selectedSpot.is_available ? 'Attivo' : 'Bloccato'}
                  </span>
                </div>

                {selectedSpot._booking ? (
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2 text-xs">
                    <p className="text-red-400 font-black uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Informazioni Occupante:
                    </p>
                    <div className="space-y-1.5 text-slate-300 font-mono mt-2">
                      <p><strong className="text-slate-500">Tipo:</strong> {selectedSpot._booking.guest_first_name} {selectedSpot._booking.guest_last_name}</p>
                      {selectedSpot._booking.guest_email && <p><strong className="text-slate-500">Email:</strong> {selectedSpot._booking.guest_email}</p>}
                      {selectedSpot._booking.guest_phone && <p><strong className="text-slate-500">Tel:</strong> {selectedSpot._booking.guest_phone}</p>}
                      <p><strong className="text-slate-500">Tariffa:</strong> <span className="text-orange-400 font-bold">{selectedSpot._booking.booking_category}</span></p>
                      {selectedSpot._booking.total_price !== undefined && (
                        <p><strong className="text-slate-500">Pagato:</strong> <span className="text-emerald-400 font-bold">{selectedSpot._booking.total_price} €</span></p>
                      )}
                      {selectedSpot._booking.notes && (
                        <p className="mt-2 pt-2 border-t border-slate-850 text-amber-400 font-sans">
                          <strong className="text-slate-500 uppercase text-[9px] block mb-0.5">Note Interni / Metodo:</strong>
                          {selectedSpot._booking.notes}
                        </p>
                      )}
                    </div>
                    {selectedSpot._booking.booking_category === 'Giornaliero in loco' && (
                      <button
                        onClick={() => handleRemoveDailyBooking(selectedSpot._booking.id)}
                        className="w-full mt-3 bg-red-900/40 hover:bg-red-900/60 border border-red-700/30 text-red-400 text-[10px] font-bold uppercase tracking-wider py-1.5 rounded-lg transition"
                      >
                        Libera Giornaliero
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 font-medium italic text-center py-4 bg-slate-950/40 rounded-xl border border-slate-850">
                    Nessun occupante per il {new Date(filterDate).toLocaleDateString('it-IT')}.
                  </p>
                )}

                {selectedSpot.notes && !selectedSpot._booking && (
                  <div className="text-xs bg-slate-950 p-3 border border-slate-800 rounded-xl text-amber-400 font-mono">
                    <strong className="text-slate-500 uppercase text-[9px] block mb-0.5">Motivazione Blocco Permanente:</strong> 
                    {selectedSpot.notes}
                  </div>
                )}

                {/* BLOCCO DELLE AZIONI AMMINISTRATIVE */}
                <div className="space-y-3 bg-slate-950 p-4 border border-slate-800 rounded-2xl">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Azioni Amministrative</h4>
                  
                  {selectedSpot.is_available && !selectedSpot._booking ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setBlockType('daily')}
                          className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition ${blockType === 'daily' ? 'bg-orange-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                          Giornaliero
                        </button>
                        <button
                          type="button"
                          onClick={() => setBlockType('permanent')}
                          className={`py-1.5 text-[10px] font-black uppercase rounded-lg transition ${blockType === 'permanent' ? 'bg-amber-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                          Permanente
                        </button>
                      </div>

                      {blockType === 'permanent' ? (
                        <input 
                          type="text" 
                          placeholder="Nota o motivo del blocco permanente..."
                          value={noteBlock}
                          onChange={(e) => setNoteBlock(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-medium"
                        />
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-bold">€</span>
                            <input 
                              type="number" 
                              placeholder="Prezzo pagato in loco..."
                              value={dailyPrice}
                              onChange={(e) => setDailyPrice(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 pl-7 text-xs text-white focus:outline-none focus:border-orange-500 font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9px] uppercase font-black text-slate-500 flex items-center gap-1">
                              <CreditCard className="w-3 h-3" /> Metodo Pagamento
                            </label>
                            <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
                              {(['Contanti', 'POS', 'Altro'] as const).map((method) => (
                                <button
                                  key={method}
                                  type="button"
                                  onClick={() => setPaymentMethod(method)}
                                  className={`py-1 text-[10px] font-bold rounded-lg transition ${paymentMethod === method ? 'bg-slate-800 border border-slate-700 text-emerald-400 font-black' : 'text-slate-500 hover:text-slate-300'}`}
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
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-medium"
                          />
                        </div>
                      )}

                      <button
                        onClick={() => handleToggleSpot(selectedSpot.id, selectedSpot.is_available, selectedSpot.internal_code)}
                        className={`w-full text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg ${
                          blockType === 'permanent' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/10' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/10'
                        }`}
                      >
                        <XCircle className="h-4 w-4" /> 
                        {blockType === 'permanent' ? 'Blocca ad Oltranza' : 'Conferma Giornaliero'}
                      </button>
                    </div>
                  ) : (
                    selectedSpot.is_available === false && (
                      <button
                        onClick={() => handleToggleSpot(selectedSpot.id, selectedSpot.is_available, selectedSpot.internal_code)}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-600/10"
                      >
                        <CheckCircle className="h-4 w-4" /> Riattiva e Rendi Disponibile
                      </button>
                    )
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs text-center py-16 font-medium italic">
                Seleziona una postazione numerata o un lettino per verificarne i bagnanti o effettuarne la chiusura.
              </p>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
