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
  total_price: number | null;   // Nuova colonna numerica
  client_name: string | null;   // Nuova colonna di testo
  booking_category: string;     // Categoria pulita
  spots?: {
    internal_code: string;
  };
}

export default function AdminPrenotazioni() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>(
    new Date().toISOString().split('T')[0] // Default: oggi
  );

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
          client_name,
          booking_category,
          spots (
            internal_code
          )
        `)
        .eq('booking_date', filterDate)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setBookings(data || []);
    } catch (err: any) {
      console.error("Errore nel caricamento delle prenotazioni:", err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [filterDate]);

  // Calcolo dell'incasso totale del giorno in modo matematico e sicuro
  const incassoTotale = bookings.reduce((acc, curr) => acc + (curr.total_price || 0), 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header e Filtro Data */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">
              Dashboard Lido Admin
            </h1>
            <p className="text-xs text-slate-400 mt-1">Gestione e controllo prenotazioni spiagge</p>
          </div>
          
          <div className="flex items-center gap-3 bg-slate-900 p-2 rounded-xl border border-slate-700">
            <span className="text-xs font-bold text-slate-400 uppercase pl-2">Giorno:</span>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Card Statistiche */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20 p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Incasso Stimato</span>
            <div className="text-2xl font-black text-white mt-1">€ {incassoTotale.toFixed(2)}</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Ombrelloni Occupati</span>
            <div className="text-2xl font-black text-white mt-1">{bookings.length}</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Presenze Totali</span>
            <div className="text-2xl font-black text-white mt-1">
              {bookings.reduce((acc, curr) => acc + (curr.num_guests || 1), 0)} persone
            </div>
          </div>
        </div>

        {/* Tabella Prenotazioni */}
        <div className="bg-slate-800/30 border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-3"></div>
              <p className="text-xs text-slate-400">Caricamento in corso...</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              Nessuna prenotazione attiva per la data selezionata.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800/80 border-b border-slate-700 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="px-6 py-4">Posto</th>
                    <th className="px-6 py-4">Nome Cliente</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Persone</th>
                    <th className="px-6 py-4">Stato</th>
                    <th className="px-6 py-4 text-right">Quota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {bookings.map((booking) => {
                    // Gestione Fallback per i vecchi record se presenti sul DB (con i pipe '|')
                    let nomeOspite = booking.client_name;
                    let categoriaPulita = booking.booking_category;
                    let prezzoVisualizzato = booking.total_price || 0;

                    // Se client_name è nullo ma c'è la vecchia stringa concatenata, facciamo il parsing di recupero
                    if (!nomeOspite && booking.booking_category?.includes('|')) {
                      const parti = booking.booking_category.split('|');
                      // Nella vecchia logica: `${selectedSpotNumber} | ${userData.categoria} | ${userData.email.trim()}`
                      categoriaPulita = parti[1]?.trim() || '';
                      nomeOspite = `Ospite (${parti[2]?.trim() || 'Info'})`;
                      
                      // Cerchiamo di estrarre il prezzo dalla vecchia stringa se possibile
                      if (booking.booking_category.includes('Prezzo:')) {
                        const match = booking.booking_category.match(/Prezzo:\s*([0-9.]+)/);
                        if (match) prezzoVisualizzato = parseFloat(match[1]);
                      }
                    }

                    return (
                      <tr key={booking.id} className="hover:bg-slate-800/40 transition-colors text-sm">
                        {/* Ombrellone */}
                        <td className="px-6 py-4 font-bold text-orange-400">
                          N° {booking.spots?.internal_code || booking.spot_id || 'N/D'}
                        </td>
                        
                        {/* Nome Cliente */}
                        <td className="px-6 py-4 font-semibold text-white">
                          {nomeOspite || 'Ospite Diretto'}
                        </td>
                        
                        {/* Categoria */}
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs bg-slate-800 text-slate-300 border border-slate-700 rounded-lg">
                            {categoriaPulita || 'Standard'}
                          </span>
                        </td>
                        
                        {/* Persone */}
                        <td className="px-6 py-4 text-slate-300">
                          {booking.num_guests} {booking.num_guests === 1 ? 'Persona' : 'Persone'}
                        </td>
                        
                        {/* Stato */}
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            Confermata
                          </span>
                        </td>
                        
                        {/* Prezzo */}
                        <td className="px-6 py-4 text-right font-mono font-bold text-white">
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
