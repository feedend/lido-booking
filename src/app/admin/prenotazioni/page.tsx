'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { 
  ArrowLeft, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Search,
  User
} from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Booking {
  id: string;
  customer_name: string;
  customer_email: string;
  booking_date: string;
  status: string;
  spot_id: string;
  spots?: {
    spot_number: string;
  };
}

export default function AdminPrenotazioni() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          customer_name,
          customer_email,
          booking_date,
          status,
          spot_id,
          spots ( spot_number )
        `)
        .order('booking_date', { ascending: false });

      if (error) throw error;
      if (data) setBookings(data as any[]);
    } catch (err) {
      console.error('Errore nel caricamento prenotazioni:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/admin/login');
      } else {
        fetchBookings();
      }
    };
    checkUser();
  }, [router]);

  // Cambia lo stato della prenotazione (Annullata o Completata)
  const handleUpdateStatus = async (bookingId: string, newStatus: 'cancelled' | 'completed' | 'confirmed') => {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId);

    if (error) {
      alert("Impossibile aggiornare la prenotazione");
    } else {
      fetchBookings(); // Ricarica i dati aggiornati
    }
  };

  // Filtra le prenotazioni in base alla ricerca (nome o numero ombrellone)
  const filteredBookings = bookings.filter(b => 
    b.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.spots?.spot_number?.toString().includes(searchTerm)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <RefreshCw className="animate-spin mr-3 h-6 w-6 text-blue-500" />
        Caricamento elenco prenotazioni...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* INTESTAZIONE */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/admin/dashboard')}
              className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-white">Registro Prenotazioni</h1>
              <p className="text-sm text-slate-400">Modifica, annulla o chiudi i posti dello stabilimento</p>
            </div>
          </div>
          
          <button 
            onClick={fetchBookings}
            className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white transition"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* BARRA DI RICERCA */}
        <div className="relative rounded-xl shadow-sm max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search className="h-5 w-5" />
          </div>
          <input
            type="text"
            placeholder="Cerca per nome cliente o N° ombrellone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* TABELLA PRENOTAZIONI */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
                  <th className="py-4 px-6">Cliente</th>
                  <th className="py-4 px-6">Data</th>
                  <th className="py-4 px-6 text-center">Ombrellone</th>
                  <th className="py-4 px-6">Stato</th>
                  <th className="py-4 px-6 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-slate-850/50 transition-colors">
                      {/* CLIENTE */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-800 p-2 rounded-full text-slate-400">
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-white">{booking.customer_name || 'N/D'}</div>
                            <div className="text-xs text-slate-500">{booking.customer_email}</div>
                          </div>
                        </div>
                      </td>
                      
                      {/* DATA */}
                      <td className="py-4 px-6 text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-500" />
                          {new Date(booking.booking_date).toLocaleDateString('it-IT')}
                        </div>
                      </td>
                      
                      {/* NUMERO OMBRELLONE */}
                      <td className="py-4 px-6 text-center font-bold text-blue-400">
                        {booking.spots?.spot_number ? `N° ${booking.spots.spot_number}` : '—'}
                      </td>
                      
                      {/* STATO */}
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          booking.status === 'confirmed' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                          booking.status === 'completed' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                          'bg-red-500/10 border-red-500/30 text-red-400'
                        }`}>
                          {booking.status === 'confirmed' && 'Attiva'}
                          {booking.status === 'completed' && 'Chiusa'}
                          {booking.status === 'cancelled' && 'Annullata'}
                        </span>
                      </td>
                      
                      {/* AZIONI */}
                      <td className="py-4 px-6 text-right space-x-2">
                        {booking.status === 'confirmed' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(booking.id, 'completed')}
                              className="text-xs bg-blue-950 hover:bg-blue-900 text-blue-400 border border-blue-900/50 px-2.5 py-1.5 rounded-lg font-medium transition"
                              title="Segna come completata / Terminata"
                            >
                              Chiudi
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(booking.id, 'cancelled')}
                              className="text-xs bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-900/40 px-2.5 py-1.5 rounded-lg font-medium transition"
                              title="Annulla prenotazione"
                            >
                              Annulla
                            </button>
                          </>
                        )}
                        {booking.status !== 'confirmed' && (
                          <button
                            onClick={() => handleUpdateStatus(booking.id, 'confirmed')}
                            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-lg font-medium transition"
                          >
                            Ripristina
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-500">
                      Nessuna prenotazione trovata.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
