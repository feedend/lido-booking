'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface Booking {
  id: string;
  booking_date: string;
  num_guests: number;
  spot_id: string;
  status: string;
  total_price: number | null;
  booking_category: string | null;
  profiles?: {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  spots?: {
    internal_code: string;
  } | null;
}

export default function AdminDashboardPrenotazioni() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const router = useRouter();

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          num_guests,
          spot_id,
          status,
          total_price,
          booking_category,
          spots (
            internal_code
          ),
          profiles (
            full_name,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('booking_date', filterDate)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Mappatura sicura contro i Type Error di Supabase
      const formattedBookings: Booking[] = (data || []).map((item: any) => {
        return {
          id: item.id,
          booking_date: item.booking_date,
          num_guests: item.num_guests,
          spot_id: item.spot_id,
          status: item.status,
          total_price: item.total_price,
          booking_category: item.booking_category,
          profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
          spots: Array.isArray(item.spots) ? item.spots[0] : item.spots,
        };
      });

      setBookings(formattedBookings);
    } catch (err: any) {
      console.error("Errore nel recupero delle prenotazioni:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filterDate]);

  const incassoTotale = bookings.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
  const totalePresenze = bookings.reduce((acc, curr) => acc + (curr.num_guests || 1), 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-slate-800/40 p-6 rounded-2xl border border-slate-700/60 shadow-md">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/admin')}
              className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 text-slate-300 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                Registro Prenotazioni
              </h1>
              <p className="text-xs text-slate-400 mt-1">Elenco dettagliato bagnanti del giorno</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase pl-2">Giorno:</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-orange-600/15 via-orange-600/5 to-transparent border border-orange-500/20 p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Incasso Totale</span>
            <div className="text-2xl font-black text-white mt-1">€ {incassoTotale.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/50 p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ombrelloni Occupati</span>
            <div className="text-2xl font-black text-white mt-1">{bookings.length}</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/50 p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Presenze Attese</span>
            <div className="text-2xl font-black text-white mt-1">{totalePresenze}</div>
          </div>
        </div>

        <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3"></div>
              <p className="text-xs text-slate-400">Lettura dati in corso...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm font-medium">
              Nessuna prenotazione attiva per questa data.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/70 border-b border-slate-700 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="px-6 py-4">Ombrellone</th>
                    <th className="px-6 py-4">Anagrafica Cliente</th>
                    <th className="px-6 py-4">Tariffa</th>
                    <th className="px-6 py-4">Ospiti</th>
                    <th className="px-6 py-4">Stato</th>
                    <th className="px-6 py-4 text-right">Prezzo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {bookings.map((booking) => {
                    const profilo = booking.profiles;
                    const nomeOspite = profilo 
                      ? (profilo.full_name || `${profilo.first_name || ''} ${profilo.last_name || ''}`.trim())
                      : 'Bagnante Diretto';

                    return (
                      <tr key={booking.id} className="hover:bg-slate-800/30 transition-colors text-sm">
                        <td className="px-6 py-4 font-black text-orange-400 font-mono">
                          N° {booking.spots?.internal_code || 'N/D'}
                        </td>
                        <td className="px-6 py-4 font-semibold text-white">
                          <div className="flex flex-col gap-0.5">
                            <span>{nomeOspite}</span>
                            {profilo?.email && (
                              <span className="text-[11px] text-slate-500 font-normal font-mono">
                                {profilo.email} {profilo.phone ? `| ${profilo.phone}` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded-md font-medium">
                            {booking.booking_category || 'Standard'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300 font-medium">
                          {booking.num_guests}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {booking.status === 'confirmed' ? 'Confermato' : 'In Attesa'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-black text-white">
                          € {(booking.total_price || 0).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
