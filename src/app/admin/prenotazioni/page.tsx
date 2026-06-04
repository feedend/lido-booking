'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  RefreshCw, 
  ArrowLeft, 
  Search, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Umbrella
} from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

interface BookingWithDetails {
  id: string;
  booking_date: string;
  slot: string;
  status: string;
  total_price: number | string | null;
  num_guests: number;
  booking_category: string | null;
  created_at: string;
  user_id: string | null;
  spots: {
    internal_code: string;
  } | null;
  profiles: {
    full_name?: string;
    email?: string;
  } | null;
}

export default function AdminBookings() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchBookings = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          slot,
          status,
          total_price,
          num_guests,
          booking_category,
          created_at,
          user_id,
          spots ( internal_code ),
          profiles ( full_name, email )
        `)
        .order('booking_date', { ascending: true });

      if (fetchError) throw fetchError;
      setBookings((data as any) || []);
    } catch (err: any) {
      console.error('Errore caricamento prenotazioni:', err);
      setError(err.message || 'Impossibile caricare le prenotazioni.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session && isMounted) {
        router.push('/admin/login');
      } else if (isMounted) {
        fetchBookings();
      }
    };
    checkAuth();
    return () => { isMounted = false; };
  }, [router, fetchBookings]);

  // Logica di Filtraggio e Ricerca Testuale con Parsing incorporato
  useEffect(() => {
    let result = [...bookings];
    
    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    if (dateFilter === 'today') {
      result = result.filter(b => b.booking_date === todayStr);
    } else if (dateFilter === 'tomorrow') {
      result = result.filter(b => b.booking_date === tomorrowStr);
    }

    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }

    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase().trim();
      result = result.filter(b => {
        const spotCode = b.spots?.internal_code?.toLowerCase() || '';
        const profileName = b.profiles?.full_name?.toLowerCase() || '';
        const profileEmail = b.profiles?.email?.toLowerCase() || '';
        const rawCategory = b.booking_category?.toLowerCase() || '';
        
        let parsedName = '';
        let parsedEmail = '';
        if (b.booking_category && b.booking_category.includes('|')) {
          const parts = b.booking_category.split('|').map(p => p.trim().toLowerCase());
          parsedName = parts[0] || ''; // Nome e Cognome
          parsedEmail = parts[2] || ''; // Email
        }

        return spotCode.includes(term) || 
               profileName.includes(term) || 
               profileEmail.includes(term) ||
               rawCategory.includes(term) ||
               parsedName.includes(term) ||
               parsedEmail.includes(term);
      });
    }

    setFilteredBookings(result);
  }, [bookings, searchTerm, dateFilter, statusFilter]);

  const handleUpdateStatus = async (id: string, newStatus: 'confirmed' | 'cancelled' | 'pending') => {
    if (!supabase) return;
    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', id);

      if (updateError) throw updateError;
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
    } catch (err: any) {
      alert("Errore durante la modifica dello stato: " + err.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3"/> Confermata</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-500/10 text-red-400 border border-red-500/20 flex items-center gap-1 w-fit"><XCircle className="h-3 w-3"/> Annullata</span>;
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 w-fit"><Clock className="h-3 w-3"/> In Attesa</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
      <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin')} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition">
            <ArrowLeft className="h-4 w-4"/>
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Registro Prenotazioni</h1>
            <p className="text-xs text-slate-400">Pannello di controllo flussi e informazioni clienti</p>
          </div>
        </div>
        <button onClick={fetchBookings} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-2 text-xs font-medium">
          <RefreshCw className="{`h-3.5" w-3.5 ${loading ? 'animate-spin' : ''}`}/> Aggiorna
        </button>
      </nav>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4 justify-between items-center shadow-md">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500"/>
            <input 
              type="text" 
              placeholder="Cerca per ombrellone, nome, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
            <div className="flex bg-slate-950 p-1 border border-slate-800 rounded-lg text-xs font-medium">
              <button onClick={() => setDateFilter('today')} className={`px-3 py-1.5 rounded-md transition ${dateFilter === 'today' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Oggi</button>
              <button onClick={() => setDateFilter('tomorrow')} className={`px-3 py-1.5 rounded-md transition ${dateFilter === 'tomorrow' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Domani</button>
              <button onClick={() => setDateFilter('all')} className={`px-3 py-1.5 rounded-md transition ${dateFilter === 'all' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Tutte</button>
            </div>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer">
              <option value="all">Tutti gli stati</option>
              <option value="confirmed">Confermate</option>
              <option value="pending">In attesa</option>
              <option value="cancelled">Annullate</option>
            </select>
          </div>
        </div>

        {error && <div className="bg-red-950/20 border border-red-900/50 text-red-400 p-4 rounded-xl text-sm">⚠️ {error}</div>}

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/40 border-b border-slate-800 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <th className="px-6 py-4">Ombrellone</th>
                  <th className="px-6 py-4">Cliente / Profilo</th>
                  <th className="px-6 py-4">Data Servizio</th>
                  <th className="px-6 py-4">Slot</th>
                  <th className="px-6 py-4">Ospiti</th>
                  <th className="px-6 py-4">Prezzo</th>
                  <th className="px-6 py-4">Stato</th>
                  <th className="px-6 py-4 text-right">Azioni Rapide</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      <RefreshCw className="animate-spin inline-block mr-2 h-4 w-4 text-blue-500"/> Caricamento in corso...
                    </td>
                  </tr>
                ) : filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-500 text-xs">Nessuna prenotazione trovata.</td>
                  </tr>
                ) : (
                  filteredBookings.map((booking) => {
                    const parsedPrice = booking.total_price ? Number(booking.total_price) : 0;

                    // Inizializzazione fallback anagrafica
                    let clientDisplay = "Ospite Diretto";
                    let clientEmail = "Nessuna Mail";
                    let badgeCategory = "";

                    // PARSING STRINGA STRUTTURATA: "Nome Cognome | Categoria | email"
                    if (booking.booking_category && booking.booking_category.includes('|')) {
                      const parts = booking.booking_category.split('|').map(p => p.trim());
                      
                      if (parts[0]) clientDisplay = parts[0];  // Nome e Cognome completi
                      if (parts[1]) badgeCategory = parts[1];  // Categoria tariffaria (es. Esercito)
                      if (parts[2]) clientEmail = parts[2];    // Indirizzo Email
                    } else {
                      // Struttura vecchio formato o fallback relazionale
                      if (booking.profiles?.full_name) {
                        clientDisplay = booking.profiles.full_name;
                      } else if (booking.booking_category) {
                        clientDisplay = booking.booking_category;
                      }
                      if (booking.profiles?.email) {
                        clientEmail = booking.profiles.email;
                      }
                    }

                    return (
                      <tr key={booking.id} className="hover:bg-slate-850/30 transition-colors">
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-500/10 p-1.5 rounded text-blue-400 border border-blue-500/20">
                              <Umbrella className="h-3.5 w-3.5"/>
                            </div>
                            <span className="font-bold text-white text-md">
                              {booking.spots?.internal_code || 'N/D'}
                            </span>
                          </div>
                        </td>

                        
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-100 text-[14px]">
                                {clientDisplay}
                              </span>
                              {badgeCategory && (
                                <span className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-400 border border-slate-700 rounded-md">
                                  {badgeCategory}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">{clientEmail}</span>
                          </div>
                        </td>

                        
                        <td className="px-6 py-4 whitespace-nowrap text-slate-300 font-medium">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Calendar className="h-3.5 w-3.5 text-slate-500"/>
                            {new Date(booking.booking_date).toLocaleDateString('it-IT', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                          </div>
                        </td>

                        
                        <td className="px-6 py-4 text-xs text-slate-300">
                          {booking.slot === 'morning' ? 'Mattina (AM)' : booking.slot === 'afternoon' ? 'Pomeriggio (PM)' : 'Giornata Intera'}
                        </td>

                        
                        <td className="px-6 py-4 text-xs font-mono text-slate-300">
                          {booking.num_guests || 1} {booking.num_guests > 1 ? 'persone' : 'persona'}
                        </td>

                        
                        <td className="px-6 py-4 font-semibold text-slate-200 font-mono text-xs">
                          {booking.total_price ? `€${parsedPrice.toFixed(2)}` : <span className="text-slate-500">€0.00</span>}
                        </td>

                        
                        <td className="px-6 py-4">
                          {getStatusBadge(booking.status)}
                        </td>

                        
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {booking.status !== 'confirmed' && (
                              <button onClick={() => handleUpdateStatus(booking.id, 'confirmed')} className="px-2 py-1 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 text-xs font-semibold rounded transition">
                                Approva
                              </button>
                            )}
                            {booking.status !== 'cancelled' && (
                              <button onClick={() => handleUpdateStatus(booking.id, 'cancelled')} className="px-2 py-1 bg-red-600/10 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/20 text-xs font-semibold rounded transition">
                                Rifiuta
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {!loading && filteredBookings.length > 0 && (
            <div className="bg-slate-950/20 border-t border-slate-800 px-6 py-3 text-xs text-slate-400 flex justify-between items-center">
              <span>Mostrate {filteredBookings.length} prenotazioni</span>
              <span className="font-mono text-slate-300 font-bold text-sm text-emerald-400">
                Totale Filtrato: €{filteredBookings
                  .reduce((acc, curr) => acc + (curr.total_price ? Number(curr.total_price) : 0), 0)
                  .toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
