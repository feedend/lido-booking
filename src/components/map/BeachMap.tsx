'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type BeachMapProps = {
  selectedDate: string;
  userData: {
    nome: string;
    cognome: string;
    email: string;
    numUtenti: number;
    categoria: string;
  };
};

type SpotData = {
  id: string;
  internal_code: string;
  zone_id: string;
};

export default function BeachMap({ selectedDate, userData }: BeachMapProps) {
  const [dbSpots, setDbSpots] = useState<SpotData[]>([]);
  const [reservedSpotIds, setReservedSpotIds] = useState<string[]>([]);
  const [selectedSpotNumber, setSelectedSpotNumber] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 1. Carica la mappatura degli spots e le prenotazioni esistenti
  useEffect(() => {
    const loadBeachData = async () => {
      setIsLoading(true);
      
      // Scarica tutti gli ombrelloni censiti nella tabella 'spots'
      const { data: spotsData } = await supabase
        .from('spots')
        .select('id, internal_code, zone_id')
        .eq('is_active', true);

      if (spotsData) {
        setDbSpots(spotsData);
      }

      // Scarica le prenotazioni per la data selezionata
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('spot_id')
        .eq('booking_date', selectedDate)
        .not('status', 'eq', 'cancelled'); // Esclude eventuali cancellati

      if (bookingsData) {
        setReservedSpotIds(bookingsData.map(b => b.spot_id));
      }
      
      setIsLoading(false);
    };

    loadBeachData();
  }, [selectedDate]);

  // 2. Funzione per gestire la conferma della prenotazione
  const handleConfirmBooking = async () => {
    if (selectedSpotNumber === null) return;
    
    // Trova l'UUID dello spot corrispondente al numero cliccato
    const targetSpot = dbSpots.find(s => s.internal_code === String(selectedSpotNumber));
    if (!targetSpot) {
      alert("Errore: Ombrellone non configurato nel database.");
      return;
    }

    setIsSubmitting(true);

    // Esegue l'inserimento rispettando i campi della tabella 'bookings'
    const { error } = await supabase
      .from('bookings')
      .insert([
        {
          spot_id: targetSpot.id,
          booking_date: selectedDate,
          num_guests: userData.numUtenti,
          booking_category: userData.categoria,
          status: 'confirmed', // o lo stato predefinito del tuo enum 'booking_status'
          // Nota: i campi nome/email andranno salvati nel profilo utente (tabella profiles) 
          // o tramite metadati a seconda delle tue preferenze di autenticazione.
        }
      ]);

    setIsSubmitting(false);

    if (error) {
      alert("Errore durante il salvataggio: " + error.message);
    } else {
      setBookingSuccess(true);
      setReservedSpotIds([...reservedSpotIds, targetSpot.id]);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedSpotNumber(null);
      }, 2500);
    }
  };

  // Righe strutturate in base alla planimetria del PDF dell'Isola del Pescatore
  const rows = [
    { startL: 1, endL: 10, startR: 11, endR: 20, center: "Bagnino" },
    { startL: 21, endL: 30, startR: 31, endR: 40, center: "" },
    { startL: 41, endL: 50, startR: 51, endR: 60, center: "" },
    { startL: 61, endL: 70, startR: 71, endR: 80, center: "P" },
    { startL: 81, endL: 90, startR: 91, endR: 100, center: "a" },
    { startL: 101, endL: 110, startR: 111, endR: 120, center: "s" },
    { startL: 121, endL: 129, startR: 130, endR: 139, center: "s" },
    { startL: 140, endL: 146, startR: 147, endR: 154, center: "e" }, // Zona Tavecchia
    { startL: 155, endL: 160, startR: 161, endR: 167, center: "r" },
    { startL: null, endL: null, startR: 168, endR: 171, center: "a" },
    { startL: null, endL: null, startR: 172, endR: 174, center: "" },
  ];

  const renderSpot = (num: number) => {
    // Cerca lo spot corrispondente nel database
    const currentSpot = dbSpots.find(s => s.internal_code === String(num));
    
    // Verifica lo stato di occupazione (da DB o blocco fisso CSM 11-15 dal PDF)
    const isDbReserved = currentSpot ? reservedSpotIds.includes(currentSpot.id) : false;
    const isCsmReserved = num >= 11 && num <= 15;
    const isReserved = isDbReserved || isCsmReserved;

    return (
      <div
        key={num}
        onClick={() => !isReserved && setSelectedSpotNumber(num)}
        className={`relative w-12 h-14 flex flex-col items-center justify-center transition-all duration-150 select-none
          ${isReserved ? 'text-gray-400 cursor-not-allowed' : 'text-blue-500 hover:scale-110 cursor-pointer'}`}
      >
        {/* Disegno vettoriale dell'ombrellone */}
        <svg 
          viewBox="0 0 24 24" 
          className={`w-10 h-10 drop-shadow-sm transition-colors ${isReserved ? 'fill-gray-400' : 'fill-blue-500 hover:fill-blue-600'}`}
        >
          <path d="M12 2C6.48 2 2 6.48 2 12h20c0-5.52-4.48-10-10-10z" />
          <path d="M12 2v10M7 4.5L12 12M17 4.5L12 12" stroke="white" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M11.5 12h1v9h-1z" fill="#94a3b8" />
        </svg>

        {/* Etichetta con il numero */}
        <span className={`text-[10px] font-black mt-0.5 px-1 rounded bg-white/80 shadow-sm border
          ${isReserved ? 'text-gray-500 border-gray-200' : 'text-blue-900 border-blue-100'}`}>
          {num}
        </span>

        {/* Sbarramento visivo X */}
        {isReserved && (
          <div className="absolute top-2 w-7 h-7 flex items-center justify-center bg-red-600/90 text-white font-extrabold text-[10px] rounded-full shadow-mdP">
            ✕
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-md max-w-sm mx-auto">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-sm font-semibold text-slate-600">Sincronizzazione spiaggia...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-orange-50/60 p-6 rounded-3xl shadow-xl border border-orange-100 max-w-4xl mx-auto overflow-x-auto relative">
      
      {/* Visualizzazione Mare */}
      <div className="w-full text-center py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-black text-white tracking-[1.5em] uppercase text-sm shadow-md mb-8">
        ~~~ MARE ~~~
      </div>

      {/* Griglia della Spiaggia */}
      <div className="flex flex-col gap-2 min-w-[720px]">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-center justify-center gap-6">
            <div className="flex gap-1.5 w-[320px] justify-end">
              {row.startL && Array.from({ length: row.endL! - row.startL! + 1 }, (_, i) => row.startL! + i).map(renderSpot)}
            </div>
            <div className="w-8 flex justify-center font-black text-amber-600 uppercase text-xs tracking-wider bg-yellow-100/80 py-1 rounded border border-yellow-200 shadow-sm">
              {row.center || " "}
            </div>
            <div className="flex gap-1.5 w-[320px]">
              {row.startR && Array.from({ length: row.endR! - row.startR! + 1 }, (_, i) => row.startR! + i).map(renderSpot)}
            </div>
          </div>
        ))}
      </div>

      {/* Modale Pop-up di Conferma */}
      {selectedSpotNumber !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            {bookingSuccess ? (
              <div className="py-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
                <h3 className="text-xl font-bold text-slate-800">Prenotato!</h3>
                <p className="text-sm text-slate-500 mt-1">Ombrellone n° {selectedSpotNumber} bloccato con successo.</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight mb-2">Conferma Selezione</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Vuoi riservare l'ombrellone <span className="font-extrabold text-blue-600 text-lg">N° {selectedSpotNumber}</span> per il giorno <span className="font-semibold text-slate-800">{new Date(selectedDate).toLocaleDateString('it-IT')}</span>?
                </p>
                
                <div className="bg-slate-50 p-3 rounded-xl text-left text-xs space-y-1.5 text-slate-600 border mb-6">
                  <p><strong>Bagnante:</strong> {userData.nome} {userData.cognome}</p>
                  <p><strong>Email:</strong> {userData.email}</p>
                  <p><strong>Componenti:</strong> {userData.numUtenti} persone</p>
                  <p><strong>Tariffa applicata:</strong> {userData.categoria}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    disabled={isSubmitting}
                    onClick={() => setSelectedSpotNumber(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all"
                  >
                    Annulla
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleConfirmBooking}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex items-center justify-center"
                  >
                    {isSubmitting ? "Salvataggio..." : "Conferma"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
