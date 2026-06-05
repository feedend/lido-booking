'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { ArrowLeft, RefreshCw, User, Mail, Phone, Umbrella } from 'lucide-react';

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
  // Nuovi campi salvati direttamente sulla tabella bookings
  guest_first_name: string | null;
  guest_last_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
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
      // Estraiamo sia i nuovi campi diretti guest_* che la vecchia relazione profiles
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
          guest_first_name,
          guest_last_name,
          guest_email,
          guest_phone,
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

      const formattedBookings: Booking[] = (data || []).map((item: any) => {
        return {
          id: item.id,
          booking_date: item.booking_date,
          num_guests: item.num_guests,
          spot_id: item.spot_id,
          status: item.status,
          total_price: item.total_price,
          booking_category: item.booking_category,
          guest_first_name: item.guest_first_name,
          guest_last_name: item.guest_last_name,
          guest_email: item.guest_email,
          guest_phone: item.guest_phone,
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Panel */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/admin')}
              className="p-2.5 bg-slate-950 hover:bg-slate-800 rounded-xl border border-slate-800 text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-lg font-black uppercase tracking-wider text-white">
                Registro Prenotazioni
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">Gestione e anagrafiche dei bagnanti attivi</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-2xl border border-slate-800 w-full sm:w-auto justify-between sm:justify-start">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">Data Monitorata:</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Informative Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg relative overflow-hidden group">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest block">Incasso del Giorno</span>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">€ {incassoTotale.toFixed(2)}</div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest block">Ombrelloni Occupati</span>
            <div className="text-2xl font-black text-white mt-1 font-mono">{bookings.length} <span className="text-xs text-slate-500 font-normal">/ 174</span></div>
          </div>
          
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl shadow-lg">
            <span className="text-[10px] uppercase font-black text-slate-500 tracking-widest block">Presenze Totali Stimate</span>
            <div className="text-2xl font-black text-orange-400 mt-1 font-mono">{totalePresenze} <span className="text-xs text-slate-500 font-normal">Persone</span></div>
          </div>
        </div>

        {/* Tabella Dati */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-900">
              <RefreshCw className="h-6 w-6 text-orange-500 animate-spin mb-3" />
              <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Sincronizzazione Registro...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-20 text-slate-500 text-xs font-mono uppercase tracking-widest bg-slate-900/50">
              Nessun bagnante registrato per questa data.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-850 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                    <th className="px-6 py-4.5">Postazione</th>
                    <th className="px-6 py-4.5">Anagrafica Cliente</th>
                    <th className="px-6 py-4.5">Contatti</th>
                    <th className="px-6 py-4.5">Categoria</th>
                    <th className="px-6 py-4.5 text-center">Pax</th>
                    <th className="px-6 py-4.5">Stato Pagamento</th>
                    <th className="px-6 py-4.5 text-right">Prezzo Netto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 bg-slate-900/40">
                  {bookings.map((booking) => {
                    
                    // Priorità 1: Nuova anagrafica diretta (guest_*) salvata senza account
                    // Priorità 2: Vecchia anagrafica relazionata (profiles) se presente
                    const haDatiDiretti = booking.guest_first_name || booking.guest_last_name;
                    
                    const nomeCompleto = haDatiDiretti
                      ? `${booking.guest_first_name || ''} ${booking.guest_last_name || ''}`.trim()
                      : (booking.profiles?.full_name || `${booking.profiles?.first_name || ''} ${booking.profiles?.last_name || ''}`.trim() || 'Bagnante Anonimo');

                    const emailCliente = haDatiDiretti ? booking.guest_email : booking.profiles?.email;
                    const telefonoCliente = haDatiDiretti ? booking.guest_phone : booking.profiles?.phone;

                    return (
                      <tr key={booking.id} className="hover:bg-slate-800/20 transition-colors text-xs">
                        {/* Numero Ombrellone */}
                        <td className="px-6 py-4 font-black font-mono text-orange-400 text-sm">
                          <span className="flex items-center gap-1.5">
                            <Umbrella className="w-3.5 h-3.5 opacity-60" />
                            {booking.spots?.internal_code || 'N/D'}
                          </span>
                        </td>
                        
                        {/* Nome Cognome */}
                        <td className="px-6 py-4 font-bold text-white tracking-wide">
                          <span className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500/40 shrink-0" />
                            {nomeCompleto}
                          </span>
                        </td>
                        
                        {/* Email e Telefono */}
                        <td className="px-6 py-4 font-mono text-slate-400 space-y-0.5">
                          {emailCliente && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Mail className="w-3 h-3 text-slate-600" /> {emailCliente}
                            </div>
                          )}
                          {telefonoCliente && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400 font-bold">
                              <Phone className="w-3 h-3 text-slate-600" /> {telefonoCliente}
                            </div>
                          )}
                          {!emailCliente && !telefonoCliente && (
                            <span className="text-slate-600 italic text-[11px]">Nessun contatto</span>
                          )}
                        </td>
                        
                        {/* Categoria Tariffa */}
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 text-[10px] bg-slate-950 text-slate-400 border border-slate-800 rounded-lg font-black uppercase tracking-wider">
                            {booking.booking_category || 'Standard'}
                          </span>
                        </td>
                        
                        {/* Numero Persone */}
                        <td className="px-6 py-4 text-center text-slate-300 font-bold font-mono">
                          {booking.num_guests || 1}
                        </td>
                        
                        {/* Stato della prenotazione */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                            booking.status === 'confirmed' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {booking.status === 'confirmed' ? 'Confermato' : 'In Attesa'}
                          </span>
                        </td>
                        
                        {/* Prezzo Finale */}
                        <td className="px-6 py-4 text-right font-mono font-black text-white text-sm">
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
