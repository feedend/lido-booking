'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function BeachMap({ selectedDate }: { selectedDate: string }) {
  const [reservations, setReservations] = useState<number[]>([]);

  useEffect(() => {
    const fetchReservations = async () => {
      const { data } = await supabase
        .from('reservations')
        .select('spot_number')
        .eq('reservation_date', selectedDate);
      if (data) setReservations(data.map(r => r.spot_number));
    };
    fetchReservations();
  }, [selectedDate]);

  // Righe fedeli al PDF dell'Isola del Pescatore
  const rows = [
    { startL: 1, endL: 10, startR: 11, endR: 20, center: "Bagnino" },
    { startL: 21, endL: 30, startR: 31, endR: 40, center: "P" },
    { startL: 41, endL: 50, startR: 51, endR: 60, center: "A" },
    { startL: 61, endL: 70, startR: 71, endR: 80, center: "S" },
    { startL: 81, endL: 90, startR: 91, endR: 100, center: "S" },
    { startL: 101, endL: 110, startR: 111, endR: 120, center: "E" },
    { startL: 121, endL: 129, startR: 130, endR: 139, center: "R" },
    { startL: 140, endL: 146, startR: 147, endR: 154, center: "E" }, // Zona Tavecchia
    { startL: 155, endL: 160, startR: 161, endR: 167, center: "L" },
    { startL: null, endL: null, startR: 168, endR: 171, center: "L" },
    { startL: null, endL: null, startR: 172, endR: 174, center: "A" },
  ];

  const renderSpot = (num: number) => {
    const occupied = reservations.includes(num);
    const isSpecialOccupied = num >= 11 && num <= 15; // CSM dal PDF
    const isReserved = occupied || isSpecialOccupied;

    return (
      <div
        key={num}
        onClick={() => !isReserved && console.log(`Selezionato ombrellone: ${num}`)}
        className={`relative w-12 h-14 flex flex-col items-center justify-center transition-all duration-150 select-none
          ${isReserved ? 'text-gray-400 cursor-not-allowed' : 'text-blue-500 hover:scale-110 cursor-pointer'}`}
      >
        {/* ICONA SVG OMBRELLONE (Cambia colore dinamicamente in base allo stato) */}
        <svg 
          viewBox="0 0 24 24" 
          className={`w-10 h-10 drop-shadow-sm transition-colors ${isReserved ? 'fill-gray-400' : 'fill-blue-500 hover:fill-blue-600'}`}
        >
          {/* Calotta dell'ombrellone */}
          <path d="M12 2C6.48 2 2 6.48 2 12h20c0-5.52-4.48-10-10-10z" />
          {/* Spicchi/Linee dell'ombrellone */}
          <path d="M12 2v10M7 4.5L12 12M17 4.5L12 12" stroke="white" strokeWidth="0.5" strokeLinecap="round" />
          {/* Bastone dell'ombrellone */}
          <path d="M11.5 12h1v9h-1z" fill="#94a3b8" />
        </svg>

        {/* Numero dell'ombrellone posizionato sotto o sopra in modo leggibile */}
        <span className={`text-[10px] font-black mt-0.5 px-1 rounded bg-white/80 shadow-sm border
          ${isReserved ? 'text-gray-500 border-gray-200' : 'text-blue-900 border-blue-100'}`}>
          {num}
        </span>

        {/* Badge di sbarramento se occupato */}
        {isReserved && (
          <div className="absolute top-2 w-7 h-7 flex items-center justify-center bg-red-600/90 text-white font-extrabold text-[10px] rounded-full shadow-md">
            ✕
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center bg-orange-50/60 p-6 rounded-3xl shadow-xl border border-orange-100 max-w-4xl mx-auto overflow-x-auto">
      {/* Battigia / Mare visivo */}
      <div className="w-full text-center py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl font-black text-white tracking-[1.5em] uppercase text-sm shadow-md mb-8">
        ~~~ MARE ~~~
      </div>

      {/* Griglia Spiaggia */}
      <div className="flex flex-col gap-2 min-w-[720px]">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-center justify-center gap-6">
            {/* Settore Sinistro */}
            <div className="flex gap-1.5 w-[320px] justify-end">
              {row.startL && Array.from({ length: row.endL! - row.startL! + 1 }, (_, i) => row.startL! + i).map(renderSpot)}
            </div>

            {/* Passerella Centrale */}
            <div className="w-8 flex justify-center font-black text-amber-600 uppercase text-xs tracking-wider bg-yellow-100/80 py-1 rounded border border-yellow-200 shadow-sm">
              {row.center || " "}
            </div>

            {/* Settore Destro */}
            <div className="flex gap-1.5 w-[320px]">
              {row.startR && Array.from({ length: row.endR! - row.startR! + 1 }, (_, i) => row.startR! + i).map(renderSpot)}
            </div>
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="mt-8 flex gap-6 text-xs bg-white px-6 py-3 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <span className="w-3 h-3 bg-blue-500 rounded-full"></span> Libero
        </div>
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <span className="w-3 h-3 bg-gray-400 rounded-full"></span> Occupato / CSM
        </div>
        <div className="flex items-center gap-2 font-semibold text-slate-700">
          <span className="w-3 h-3 bg-red-600 rounded-full flex items-center justify-center text-[8px] text-white font-bold">✕</span> Non Disponibile
        </div>
      </div>
    </div>
  );
}
