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

export default function BeachMap({ selectedDate, userData }: BeachMapProps) {
  const [reservations, setReservations] = useState<number[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Funzione per caricare le prenotazioni esistenti
  const fetchReservations = async () => {
    const { data } = await supabase
      .from('reservations')
      .select('spot_number')
      .eq('reservation_date', selectedDate);
    if (data) setReservations(data.map(r => r.spot_number));
  };

  useEffect(() => {
    fetchReservations();
  }, [selectedDate]);

  // Funzione per salvare la prenotazione su Supabase
  const handleConfirmBooking = async () => {
    if (selectedSpot === null) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from('reservations')
      .insert([
        {
          spot_number: selectedSpot,
          reservation_date: selectedDate,
          client_name: `${userData.nome} ${userData.cognome}`,
          client_email: userData.email,
          num_guests: userData.numUtenti,
          category: userData.categoria
        }
      ]);

    setIsSubmitting(false);

    if (error) {
      alert("Errore durante la prenotazione: " + error.message);
    } else {
      setBookingSuccess(true);
      setReservations([...reservations, selectedSpot]);
      setTimeout(() => {
        setBookingSuccess(false);
        setSelectedSpot(null);
      }, 3000);
    }
  };

  // Righe fedeli al PDF dell'Isola del Pescatore
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
    const occupied = reservations.includes(num);
    const isSpecialOccupied = num >= 11 && num <= 15; // CSM dal PDF
    const isReserved = occupied || isSpecialOccupied;

    return (
      <div
        key={num}
        onClick={() => !isReserved && setSelectedSpot(num)}
        className={`relative w-12 h-14 flex flex-col items-center justify-center transition-all duration-150 select-none
          ${isReserved ? 'text-gray-400 cursor-not-allowed' : 'text-blue-500 hover:scale-110 cursor-pointer'}`}
      >
        <svg 
          viewBox="0 0 24 24" 
          className={`w-10 h-10 drop-shadow-sm transition-colors ${isReserved ? 'fill-gray-400' : 'fill-blue-500 hover:fill-blue-600'}`}
        >
          <path d="M12 2C6.48 2 2 6.48 2 12h20c0-5.52-4.48-10-10-10z" />
          <path d="M12 2v10M7 4.5L12 12M17 4.5L12 12" stroke="white" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M11.5 12h1v9h-1z" fill="#94a3b8" />
        </svg>

        <span className={`text-[10px] font-black mt-0.5 px-1 rounded bg-white/80 shadow-sm border
          ${isReserved ? 'text-gray-500 border-gray-200' : 'text-blue-900 border-blue-100'}`}>
          {num}
        </span>

        {isReserved && (
          <div className="absolute top-2 w-7 h-7 flex items-center justify-center bg-red-600/90 text-white font-extrabold text-[10px] rounded-full shadow-md">
            ✕
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center bg-orange-50/60 p-6 rounded-3xl shadow-xl border border-orange-100 max-w-4xl mx-auto overflow-x-auto relative">
      
      {/* MARE */}
      <div className="w-full text-center py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-black text-white tracking-[1.5em] uppercase text-sm shadow-md mb-8">
        ~~~ MARE ~~~
      </div>

      {/* SPIAGGIA */}
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

      {/* MODALE DI CONFERMA PRENOTAZIONE */}
      {selectedSpot !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center animate-in fade-in zoom-in-95 duration-150">
            {bookingSuccess ? (
              <div className="py-6">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
                <h3 className="text-xl font-bold text-slate-800">Prenotazione Confermata!</h3>
                <p className="text-sm text-slate-500 mt-1">Ombrellone n° {selectedSpot} riservato con successo.</p>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black text-blue-900 uppercase tracking-tight mb-2">Conferma la scelta</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Stai per prenotare l'ombrellone <span className="font-extrabold text-blue-600 text-lg">N° {selectedSpot}</span> per il giorno <span className="font-semibold text-slate-800">{new Date(selectedDate).toLocaleDateString('it-IT')}</span>.
                </p>
                
                <div className="bg-slate-50 p-3 rounded-xl text-left text-xs space-y-1.5 text-slate-600 border mb-6">
                  <p><strong>Intestatario:</strong> {userData.nome} {userData.cognome}</p>
                  <p><strong>Email:</strong> {userData.email}</p>
                  <p><strong>Ospiti:</strong> {userData.numUtenti} componenti</p>
                  <p><strong>Tariffa/Priorità:</strong> {userData.categoria}</p>
                </div>

                <div className="flex gap-3">
                  <button
                    disabled={isSubmitting}
                    onClick={() => setSelectedSpot(null)}
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
