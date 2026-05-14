'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function BeachMap({ selectedDate }: { selectedDate: string }) {
  const [reservations, setReservations] = useState<number[]>([]);

  // Configurazione originale: 174 ombrelloni
  const totalSpots = 174;
  // La passerella divide la spiaggia (es. dopo l'ombrellone 10 di ogni fila)
  const isPasserella = (n: number) => n % 20 === 11 || n % 20 === 12; 

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

  return (
    <div className="w-full overflow-x-auto pb-8">
      {/* Griglia che mantiene gli spazi per la passerella */}
      <div className="grid grid-cols-12 gap-2 min-w-[800px] p-4 bg-yellow-50 rounded-xl shadow-inner">
        {Array.from({ length: totalSpots }, (_, i) => i + 1).map((num) => {
          const occupied = reservations.includes(num);
          
          return (
            <div
              key={num}
              className={`
                relative flex items-center justify-center
                w-10 h-10 rounded-full cursor-pointer
                text-[10px] font-bold transition-transform duration-150
                /* SOLUZIONE VIBRAZIONE: usiamo scale leggero e trasformazioni che non spostano il layout */
                hover:scale-110 hover:z-10 shadow-sm
                ${occupied ? 'bg-gray-400 text-white' : 'bg-blue-500 text-white'}
                border-2 border-white select-none
              `}
              onClick={() => !occupied && console.log(`Prenoto: ${num}`)}
            >
              {num}
              {/* Indicatore visivo se occupato */}
              {occupied && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                  ✕
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-6 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded-full"></div> Libero
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-400 rounded-full"></div> Occupato / Riservato
        </div>
      </div>
    </div>
  );
}
