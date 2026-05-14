'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function BeachMap({ selectedDate }: { selectedDate: string }) {
  const [reservations, setReservations] = useState<number[]>([]);

  // Carichiamo le prenotazioni (inclusi gli ombrelloni 11-15 bloccati nel DB)
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

  // Definizione delle righe basata sul PDF 
  const rows = [
    { startL: 1, endL: 10, startR: 11, endR: 20, center: "Bagnino" },
    { startL: 21, endL: 30, startR: 31, endR: 40, center: "" },
    { startL: 41, endL: 50, startR: 51, endR: 60, center: "" },
    { startL: 61, endL: 70, startR: 71, endR: 80, center: "P" },
    { startL: 81, endL: 90, startR: 91, endR: 100, center: "a" },
    { startL: 101, endL: 110, startR: 111, endR: 120, center: "s" },
    { startL: 121, endL: 129, startR: 130, endR: 139, center: "s" }, // riga r/e
    { startL: 140, endL: 146, startR: 147, endR: 154, center: "e" }, // zona civitavecchia
    { startL: 155, endL: 160, startR: 161, endR: 167, center: "r" },
    { startL: null, endL: null, startR: 168, endR: 171, center: "a" },
    { startL: null, endL: null, startR: 172, endR: 174, center: "" },
  ];

  const renderSpot = (num: number) => {
    const occupied = reservations.includes(num);
    // Gli ombrelloni 11-15 CSM sono segnati come OCCUP nel PDF 
    const isSpecialOccupied = num >= 11 && num <= 15;

    return (
      <div
        key={num}
        className={`w-10 h-10 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm transition-all
          ${(occupied || isSpecialOccupied) ? 'bg-gray-400 text-white' : 'bg-blue-500 text-white hover:scale-110 hover:shadow-md cursor-pointer'}
          border-2 border-white select-none`}
      >
        {num}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center bg-slate-50 p-4 rounded-3xl shadow-lg">
      <div className="mb-8 px-12 py-2 bg-blue-100 rounded-full font-bold text-blue-800 tracking-[1em] uppercase">
        Mare
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4">
            {/* Blocco Sinistro (10 ombrelloni) */}
            <div className="flex gap-1 w-[280px] justify-end">
              {row.startL && Array.from({ length: row.endL! - row.startL! + 1 }, (_, i) => row.startL! + i).map(renderSpot)}
            </div>

            {/* Passerella Centrale  */}
            <div className="w-12 flex justify-center font-black text-orange-400 uppercase text-xs">
              {row.center}
            </div>

            {/* Blocco Destro (10 ombrelloni) */}
            <div className="flex gap-1 w-[280px]">
              {row.startR && Array.from({ length: row.endR! - row.startR! + 1 }, (_, i) => row.startR! + i).map(renderSpot)}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-[10px] text-slate-400 italic uppercase tracking-widest">
        Zona civitavecchia (140-174)
      </div>
    </div>
  );
}
