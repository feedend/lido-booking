'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  ArrowLeft, 
  Calendar, 
  Search, 
  BarChart3, 
  Euro, 
  Banknote, 
  CreditCard, 
  Wallet, 
  Umbrella, 
  FileText,
  PlusCircle,
  TrendingUp
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface BookingWithSpot {
  id: string;
  booking_date: string;
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  booking_category: string | null;
  total_price: number | null;
  notes: string | null;
  status: string | null;
  extra_sdraio: number | null;
  extra_lettini: number | null;
  spots: {
    internal_code: string;
  } | null;
}

export default function RegistrePrenotazioni() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<BookingWithSpot[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Stati per il filtro intervallo report e tabella
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const fetchBookingsInterval = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          guest_first_name,
          guest_last_name,
          guest_email,
          guest_phone,
          booking_category,
          total_price,
          notes,
          status,
          extra_sdraio,
          extra_lettini,
          spots ( internal_code )
        `)
        .gte('booking_date', startDate)
        .lte('booking_date', endDate)
        .not('status', 'eq', 'cancelled')
        .order('booking_date', { ascending: false });

      if (error) throw error;
      setBookings((data as any) || []);
    } catch (err) {
      console.error('Errore caricamento registro:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verifica sicurezza ed esegui caricamento
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin/login');
        return;
      }
      const ruolo = user.user_metadata?.ruolo || user.app_metadata?.ruolo;
      if (ruolo !== 'admin') {
        router.push('/admin/dashboard'); // Gli operatori non vedono i registri finanziari
        return;
      }
      fetchBookingsInterval();
    };
    checkAdmin();
  }, [startDate, endDate]);

  // Scorciatoie temporali per l'intervallo
  const setPresetToday = () => {
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const setPresetCurrentMonth = () => {
    const ora = new Date();
    const primoGiorno = new Date(ora.getFullYear(), ora.getMonth(), 1).toISOString().split('T')[0];
    const ultimoGiorno = new Date(ora.getFullYear(), ora.getMonth() + 1, 0).toISOString().split('T')[0];
    setStartDate(primoGiorno);
    setEndDate(ultimoGiorno);
  };

  // --- CALCOLO METRICHE REPORT SULL'INTERVALLO SELEZIONATO ---
  const totaleGenerale = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
  
  const totaleOnline = bookings
    .filter(b => b.booking_category !== 'Giornaliero in loco')
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const giornalieriLoco = bookings.filter(b => b.booking_category === 'Giornaliero in loco');
  
  const totaleContanti = giornalieriLoco
    .filter(b => b.notes?.includes('[Metodo: Contanti]'))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const totalePOS = giornalieriLoco
    .filter(b => b.notes?.includes('[Metodo: POS]'))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const totaleAltro = giornalieriLoco
    .filter(b => b.notes?.includes('[Metodo: Altro]'))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  // Conteggio attrezzature extra complessive nell'intervallo
  const totaleExtraSdraio = bookings.reduce((sum, b) => sum + (b.extra_sdraio || 0), 0);
  const totaleExtraLettini = bookings.reduce((sum, b) => sum + (b.extra_lettini || 0), 0);

  // Filtro di ricerca testuale (Nome, Cognome, Email, Ombrellone)
  const filteredBookings = bookings.filter(b => {
    const search = searchTerm.toLowerCase();
    const nome = (b.guest_first_name || '').toLowerCase();
    const cognome = (b.guest_last_name || '').toLowerCase();
    const email = (b.guest_email || '').toLowerCase();
    const codice = (b.spots?.internal_code || '').toLowerCase();
    return nome.includes(search) || cognome.includes(search) || email.includes(search) || codice.includes(search);
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      
      {/* HEADER BAR */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin/dashboard')}
              className="p-2 hover:bg-slate-100 rounded-xl transition border border-slate-200 text-slate-600"
              title="Torna alla Mappa"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-600" /> Registro & Report Amministrativo
              </h1>
              <p className="text-[11px] text-slate-500">Gestione flussi di cassa ed extra attrezzature</p>
            </div>
          </div>

          {/* SELETTORE INTERVALLO DATE DINAMICO */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold">
            <div className="flex items-center gap-1.5 px-2">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Dal:</span>
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-slate-900 text-xs focus:outline-none"
              />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Al:</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-0.5 text-slate-900 text-xs focus:outline-none"
              />
            </div>
            <div className="flex gap-1 border-l border-slate-300 pl-1.5">
              <button 
                onClick={setPresetToday} 
                className={`px-2.5 py-1 rounded-lg text-[10px] uppercase transition ${startDate === todayStr && endDate === todayStr ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Oggi
              </button>
              <button 
                onClick={setPresetCurrentMonth} 
                className={`px-2.5 py-1 rounded-lg text-[10px] uppercase transition ${startDate !== todayStr || endDate !== todayStr ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                Mese Corrente
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">

        {/* ================= SEZIONE REPORT ANALITICO ED ECONOMICO ================= */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <BarChart3 className="w-4 h-4 text-sky-600" />
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">
              Bilancio ed Economia del Periodo Selezionato
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* CARD 1: FATTURATO ASSOLUTO */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4 rounded-2xl flex flex-col justify-between shadow-sm relative overflow-hidden">
              <div className="absolute right-[-10px] bottom-[-10px] opacity-10 text-white">
                <Euro className="w-24 h-24" />
              </div>
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Fatturato Totale Lordo</p>
                <p className="text-2xl font-mono font-black mt-1 text-emerald-400">{totaleGenerale.toFixed(2)} €</p>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Transazioni attive: {bookings.length}
              </p>
            </div>

            {/* CARD 2: CANALE ONLINE */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between shadow-inner">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Prenotazioni Online (Stripe)</p>
                <p className="text-xl font-mono font-black text-slate-900 mt-1">{totaleOnline.toFixed(2)} €</p>
                <p className="text-[9px] text-slate-400 mt-1">Incassate sul portale web</p>
              </div>
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl text-blue-600">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>

            {/* CARD 3: CASSA IN LOCO TOTALI E METODI */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-inner lg:col-span-1">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Totale Cassa in Loco</p>
                <p className="text-xl font-mono font-black text-orange-600 mt-0.5">{(totaleContanti + totalePOS + totaleAltro).toFixed(2)} €</p>
              </div>
              <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                <div className="bg-white border border-slate-100 p-1.5 rounded-lg">
                  <span className="text-[8px] font-black text-slate-400 block uppercase">Contanti</span>
                  <span className="text-[11px] font-mono font-bold text-slate-700">{totaleContanti.toFixed(0)}€</span>
                </div>
                <div className="bg-white border border-slate-100 p-1.5 rounded-lg">
                  <span className="text-[8px] font-black text-slate-400 block uppercase">POS</span>
                  <span className="text-[11px] font-mono font-bold text-slate-700">{totalePOS.toFixed(0)}€</span>
                </div>
                <div className="bg-white border border-slate-100 p-1.5 rounded-lg">
                  <span className="text-[8px] font-black text-slate-400 block uppercase">Altro</span>
                  <span className="text-[11px] font-mono font-bold text-slate-700">{totaleAltro.toFixed(0)}€</span>
                </div>
              </div>
            </div>

            {/* CARD 4: REPORT MATRICI EXTRA ERROGATE */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between shadow-inner">
              <div>
                <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Volume Attrezzature Extra</p>
                <p className="text-xs font-medium text-slate-500 mt-1">Erogate nell'intervallo scelto</p>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] font-black text-sky-800 uppercase">Sdraio</span>
                  <span className="text-base font-mono font-black text-sky-700">+{totaleExtraSdraio}</span>
                </div>
                <div className="bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-xl flex items-center justify-between">
                  <span className="text-[10px] font-black text-sky-800 uppercase">Lettini</span>
                  <span className="text-base font-mono font-black text-sky-700">+{totaleExtraLettini}</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* ================= TABELLA E REGISTRO ANALITICO ================= */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          
          {/* BARRA DI RICERCA INTERNA */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Elenco Analitico delle Prenotazioni
              </h3>
              <p className="text-[11px] text-slate-400">Usa i filtri o la barra di ricerca per isolare record specifici</p>
            </div>
            
            <div className="relative w-full md:w-80">
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input 
                type="text"
                placeholder="Cerca per nome, email o postazione..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-orange-500 font-medium"
              />
            </div>
          </div>

          {/* RENDERING DATI O TABELLA */}
          {loading ? (
            <div className="text-center py-20 text-xs font-mono text-slate-400 uppercase tracking-widest animate-pulse">
              Interrogazione database in corso...
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs italic bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
              Nessuna prenotazione attiva trovata nell'intervallo temporale inserito.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[9px] font-black tracking-wider">
                    <th className="p-3">Data</th>
                    <th className="p-3">Postazione</th>
                    <th className="p-3">Ospite</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Attrezzatura Extra</th>
                    <th className="p-3">Corrispettivo</th>
                    <th className="p-3">Note / Tracciamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredBookings.map((b) => {
                    const isLoco = b.booking_category === 'Giornaliero in loco';
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/80 transition text-slate-700">
                        {/* Data */}
                        <td className="p-3 font-mono text-[11px] whitespace-nowrap">
                          {new Date(b.booking_date).toLocaleDateString('it-IT')}
                        </td>
                        
                        {/* Postazione */}
                        <td className="p-3">
                          <span className="bg-slate-800 text-white font-mono font-black px-2 py-0.5 rounded-md text-[10px]">
                            {b.spots?.internal_code || 'N/D'}
                          </span>
                        </td>
                        
                        {/* Ospite */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-900">
                            {b.guest_first_name} {b.guest_last_name}
                          </div>
                          {b.guest_phone && <div className="text-[10px] text-slate-400 font-mono">{b.guest_phone}</div>}
                        </td>
                        
                        {/* Categoria */}
                        <td className="p-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-lg border ${
                            isLoco ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                          }`}>
                            {isLoco ? 'In Loco' : 'Online'}
                          </span>
                        </td>
                        
                        {/* Attrezzatura Extra */}
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {b.extra_sdraio && b.extra_sdraio > 0 ? (
                              <span className="bg-sky-50 border border-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                +{b.extra_sdraio} Sdraio
                              </span>
                            ) : null}
                            {b.extra_lettini && b.extra_lettini > 0 ? (
                              <span className="bg-sky-50 border border-sky-100 text-sky-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                +{b.extra_lettini} Lettini
                              </span>
                            ) : null}
                            {(!b.extra_sdraio && !b.extra_lettini) || (b.extra_sdraio === 0 && b.extra_lettini === 0) ? (
                              <span className="text-slate-400 text-[11px] font-normal">—</span>
                            ) : null}
                          </div>
                        </td>
                        
                        {/* Prezzo */}
                        <td className="p-3 font-mono font-bold text-slate-900">
                          {b.total_price !== null ? `${Number(b.total_price).toFixed(2)} €` : '0.00 €'}
                        </td>
                        
                        {/* Note */}
                        <td className="p-3 text-[11px] text-slate-500 max-w-xs truncate font-sans" title={b.notes || ''}>
                          {b.notes || <span className="text-slate-300 italic">Nessuna nota</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

      </main>
    </div>
  );
}
