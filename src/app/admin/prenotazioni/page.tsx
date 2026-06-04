'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

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
  booking_category: string;
  profiles?: {
    full_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    phone: string | null;
  } | null;
  spots?: {
    internal_code: string;
  };
}

export default function AdminDashboardPrenotazioni() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      // Esegue una JOIN relazionale automatica caricando i dati del profilo bagnante (profiles)
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
      setBookings(data || []);
    } catch (err: any) {
      console.error("Errore nel recupero delle prenotazioni in dashboard:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filterDate]);

  // Calcolo matematico pulito dei totali basato sul tipo numerico reale
  const incassoTotale = bookings.reduce((acc, curr) => acc + (curr.total_price || 0), 0);
  const totalePresenze = bookings.reduce((acc, curr) => acc + (curr.num_guests || 1), 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Intestazione Dashboard */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-slate-800/40 p-6 rounded-2xl border border-slate-700/60 shadow-md">
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
              Pannello Di Controllo Lido
            </h1>
            <p className="text-xs text-slate-400 mt-1">Sincronizzazione in tempo reale con i profili utente</p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-xs font-bold text-slate-400 uppercase pl-2">Seleziona Giorno:</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-orange-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Indicatori Analitici Metrici */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-orange-600/15 via-orange-600/5 to-transparent border border-orange-500/20 p-5 rounded-2xl shadow-sm">
            <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Incasso Totale Giornaliero</span>
            <div className="text-2xl font-black text-white mt-1">€ {incassoTotale.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/50 p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ombrelloni Venduti</span>
            <div className="text-2xl font-black text-white mt-1">{bookings.length}</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/50 p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Bagnanti Attesi</span>
            <div className="text-2xl font-black text-white mt-1">{totalePresenze} <span className="text-xs text-slate-400 font-normal">persone</span></div>
          </div>
        </div>

        {/* Struttura Tabellare Dati */}
        <div className="bg-slate-800/20 border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3"></div>
              <p className="text-xs text-slate-400">Interrogazione database in corso...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-sm font-medium">
              Nessun ombrellone occupato per la data selezionata.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/70 border-b border-slate-700 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="px-6 py-4">Posto</th>
                    <th className="px-6 py-4">Anagrafica Bagnante</th>
                    <th className="px-6 py-4">Tariffa Applicata</th>
                    <th className="px-6 py-4">Ospiti</th>
                    <th className="px-6 py-4">Stato Logico</th>
                    <th className="px-6 py-4 text-right">Prezzo Pagato</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {bookings.map((booking) => {
                    const profilo = booking.profiles;
                    
                    // Risale al nome completo dal profilo in JOIN
                    let nomeOspite = profilo 
                      ? (profilo.full_name || `${profilo.first_name || ''} ${profilo.last_name || ''}`.trim())
                      : null;
                      
                    let categoriaPulita = booking.booking_category;
                    let prezzoVisualizzato = booking.total_price || 0;

                    // COMPATIBILITÀ STORICA RETROATTIVA: Gestisce i vecchi record formattati con '|'
                    if (!nomeOspite && booking.booking_category?.includes('|')) {
                      const parti = booking.booking_category.split('|');
                      categoriaPulita = parti[1]?.trim() || '';
                      nomeOspite = `Ospite Storico (${parti[2]?.trim() || 'Info'})`;
                      
                      if (booking.booking_category.includes('Prezzo:')) {
                        const match = booking.booking_category.match(/Prezzo:\s*([0-9.]+)/);
                        if (match) prezzoVisualizzato = parseFloat(match[1]);
                      }
                    }

                    return (
                      <tr key={booking.id} className="hover:bg-slate-800/30 transition-colors text-sm">
                        {/* Numero Identificativo Ombrellone */}
                        <td className="px-6 py-4 font-black text-orange-400 font-mono text-sm">
                          N° {booking.spots?.internal_code || booking.spot_id || 'N/D'}
                        </td>
                        
                        {/* Informazioni Profilo Autenticato */}
                        <td className="px-6 py-4 font-semibold text-white">
                          <div className="flex flex-col gap-0.5">
                            <span>{nomeOspite || 'Bagnante Diretto'}</span>
                            {profilo?.email && (
                              <span className="text-[11px] text-slate-500 font-normal font-mono">
                                {profilo.email} {profilo.phone ? `| ${profilo.phone}` : ''}
                              </span>
                            )}
                          </div>
                        </td>
                        
                        {/* Categoria di Tariffazione */}
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-0.5 text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded-md font-medium">
                            {categoriaPulita || 'Standard'}
                          </span>
                        </td>
                        
                        {/* Numero Persone */}
                        <td className="px-6 py-4 text-slate-300 font-medium">
                          {booking.num_guests} {booking.num_guests === 1 ? 'persona' : 'persone'}
                        </td>
                        
                        {/* Stato della Transazione */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Confermato
                          </span>
                        </td>
                        
                        {/* Quota Finanziaria */}
                        <td className="px-6 py-4 text-right font-mono font-black text-white text-md">
                          € {prezzoVisualizzato.toFixed(2)}
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
