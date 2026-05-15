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
  const [reservedSpots, setReservedSpots] = useState<number[]>([]);
  const [selectedSpotNumber, setSelectedSpotNumber] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      setIsLoading(true);
      try {
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('booking_category, status') 
          .eq('booking_date', selectedDate)
          .not('status', 'eq', 'cancelled');

        if (bookingsData) {
          const occupati = bookingsData
            .map(b => parseInt(b.booking_category.split('|')[0]))
            .filter(num => !isNaN(num));
          setReservedSpots(occupati);
        }
      } catch (err) {
        console.error("Errore nel caricamento delle prenotazioni:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBookings();
  }, [selectedDate]);

  const handleConfirmBooking = async () => {
    if (selectedSpotNumber === null) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('bookings')
        .insert([
          {
            booking_date: selectedDate,
            num_guests: userData.numUtenti,
            booking_category: `${selectedSpotNumber} | ${userData.categoria}`,
            status: 'confirmed'
          }
        ]);

      if (error) {
        alert("Errore durante il salvataggio: " + error.message);
      } else {
        setBookingSuccess(true);
        setReservedSpots([...reservedSpots, selectedSpotNumber]);
        setTimeout(() => {
          setBookingSuccess(false);
          setSelectedSpotNumber(null);
        }, 2500);
      }
    } catch (err) {
      alert("Errore di rete o configurazione.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const rows = [
    { startL: 1, endL: 10, startR: 11, endR: 20, center: "Bagnino" },
    { startL: 21, endL: 30, startR: 31, endR: 40, center: "" },
    { startL: 41, endL: 50, startR: 51, endR: 60, center: "" },
    { startL: 61, endL: 70, startR: 71, endR: 80, center: "P" },
    { startL: 81, endL: 90, startR: 91, endR: 100, center: "a" },
    { startL: 101, endL: 110, startR: 111, endR: 120, center: "s" },
    { startL: 121, endL: 129, startR: 130, endR: 139, center: "s" },
    { startL: 140, endL: 146, startR: 147, endR: 154, center: "e" },
    { startL: 155, endL: 160, startR: 161, endR: 167, center: "r" },
    { startL: null, endL: null, startR: 168, endR: 171, center: "a" },
    { startL: null, endL: null, startR: 172, endR: 174, center: "" },
  ];

  const renderSpot = (num: number) => {
    const isDbReserved = reservedSpots.includes(num);
    const isCsmReserved = num >= 11 && num <= 15;
    const isReserved = isDbReserved || isCsmReserved;

    return (
      <div
        key={num}
        onClick={() => !isReserved && setSelectedSpotNumber(num)}
        className={`relative w-11 h-14 flex flex-col items-center justify-center transition-all duration-150 select-none mx-auto
          ${isReserved ? 'text-gray-400 cursor-not-allowed' : 'text-blue-500 hover:scale-110 cursor-pointer'}`}
      >
        <svg 
          viewBox="0 0 24 24" 
          className={`w-9 h-9 drop-shadow-sm transition-colors ${isReserved ? 'fill-gray-300' : 'fill-blue-500 hover:fill-blue-600'}`}
        >
          <path d="M12 2C6.48 2 2 6.48 2 12h20c0-5.52-4.48-10-10-10z" />
          <path d="M12 2v10M7 4.5L12 12M17 4.5L12 12" stroke="white" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M11.5 12h1v9h-1z" fill="#94a3b8" />
        </svg>

        <span className={`text-[9px] font-black mt-0.5 px-1 rounded bg-white/90 shadow-sm border
          ${isReserved ? 'text-gray-400 border-gray-200' : 'text-blue-900 border-blue-100'}`}>
          {num}
        </span>

        {isReserved && (
          <div className="absolute top-1.5 w-6 h-6 flex items-center justify-center bg-red-500/90 text-white font-extrabold text-[9px] rounded-full shadow-md">
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
    <div className="w-full max-w-5xl mx-auto bg-orange-50/60 p-4 sm:p-6 rounded-3xl shadow-xl border border-orange-100 relative">
      
      <div className="block md:hidden text-center text-[10px] text-orange-700/60 font-bold uppercase tracking-wider mb-2 animate-pulse">
        ↔ Scorri lateralmente per vedere tutta la spiaggia ↔
      </div>

      <div className="w-full text-center py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-black text-white tracking-[0.8em] sm:tracking-[1.5em] uppercase text-xs sm:text-sm shadow-md mb-6 sticky left-0">
        ~~~ MARE ~~~
      </div>

      {/* CONTENITORE PRINCIPALE CON SCORRIMENTO */}
      <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-orange-200 scrollbar-track-transparent rounded-xl">
        
        {/* LA SPIAGGIA: Aumentata la larghezza minima totale a 1000px per dare ampio respiro visivo */}
        <div className="flex flex-col gap-3 min-w-[1000px] mx-auto px-4">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center justify-center gap-6">
              
              {/* SETTORE SINISTRO BILANCIATO: Griglia fissa a 10 colonne da 44px ciascuna (Totale 440px fisse) */}
              <div className="w-[440px] grid grid-cols-10 gap-0.5 justify-items-end">
                {row.startL ? (
                  <>
                    {/* Genera gli spazi vuoti iniziali se la riga non ha il numero massimo di elementi per tenerli allineati a destra sulla passerella */}
                    {Array.from({ length: 10 - (row.endL! - row.startL! + 1) }).map((_, i) => (
                      <div key={`empty-l-${i}`} className="w-11 h-14 opacity-0 pointer-events-none" />
                    ))}
                    {Array.from({ length: row.endL! - row.startL! + 1 }, (_, i) => row.startL! + i).map(renderSpot)}
                  </>
                ) : (
                  // Se la riga non ha un blocco sinistro (ultime file), riempiamo con 10 spazi vuoti trasparenti
                  Array.from({ length: 10 }).map((_, i) => <div key={`blank-l-${i}`} className="w-11 h-14" />)
                )}
              </div>
              
              {/* PASSERELLA CENTRALE */}
              <div className="w-12 shrink-0 flex justify-center items-center font-black text-amber-700 uppercase text-[10px] tracking-wider bg-yellow-100/90 py-2 rounded-xl border border-yellow-200/60 shadow-inner">
                {row.center || "•"}
              </div>
              
              {/* SET
