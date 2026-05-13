'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Il client che abbiamo creato prima

// Definiamo cosa è un "Ombrellone" per TypeScript
interface Spot {
  internal_code: string;
  status: 'available' | 'booked' | 'selected';
}

export default function BeachMap({ selectedDate }: { selectedDate: string }) {
  const [bookedSpots, setBookedSpots] = useState<string[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<string | null>(null);

  // 1. Recupera le prenotazioni dal DB ogni volta che cambia la data
  useEffect(() => {
    const fetchBookings = async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('spot_id, spots(internal_code)')
        .eq('booking_date', selectedDate)
        .eq('status', 'confirmed');

      if (data) {
        // Estraiamo solo i codici (es. ['A1', 'B5'])
        const codes = data.map((b: any) => b.spots.internal_code);
        setBookedSpots(codes);
      }
    };

    fetchBookings();
  }, [selectedDate]);

  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
  const cols = Array.from({ length: 10 }, (_, i) => i + 1);

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <div className="relative bg-yellow-100 rounded-xl shadow-2xl overflow-hidden border-8 border-yellow-200">
        
        {/* Rappresentazione del Mare */}
        <div className="w-full h-16 bg-blue-500 flex items-center justify-center shadow-inner">
          <span className="text-white font-bold tracking-widest">MARE ADRIATICO</span>
        </div>

        {/* Mappa SVG */}
        <svg viewBox="0 0 600 500" className="w-full h-auto p-4">
          {rows.map((row, rIdx) => 
            cols.map((col, cIdx) => {
              const code = `${row}${col}`;
              const isBooked = bookedSpots.includes(code);
              const isSelected = selectedSpot === code;

              // Calcolo posizione
              const x = 40 + cIdx * 58;
              const y = 60 + rIdx * 48;

              return (
                <g 
                  key={code} 
                  className={`cursor-pointer transition-transform duration-200 ${!isBooked && 'hover:scale-110'}`}
                  onClick={() => !isBooked && setSelectedSpot(code)}
                >
                  {/* Ombrellone */}
                  <circle 
                    cx={x} cy={y} r="18" 
                    className={`${
                      isBooked ? 'fill-red-400' : 
                      isSelected ? 'fill-blue-500' : 'fill-green-400'
                    } stroke-white stroke-2 shadow-md`}
                  />
                  {/* Numero */}
                  <text x={x} y={y + 4} textAnchor="middle" fontSize="10" className="fill-white font-bold select-none">
                    {code}
                  </text>
                </g>
              );
            })
          )}
        </svg>

        {/* Legenda rapida */}
        <div className="flex justify-center gap-4 p-4 bg-white/50 text-sm">
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-green-400 rounded-full"></span> Libero</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded-full"></span> Occupato</div>
          <div className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded-full"></span> Scelto</div>
        </div>
      </div>

      {/* Pannello di conferma */}
      {selectedSpot && (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 flex justify-between items-center">
            <div>
              <p className="text-gray-500">Postazione selezionata</p>
              <h3 className="text-2xl font-black text-blue-900">Ombrellone {selectedSpot}</h3>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-bold transition-colors">
              Prenota per il {selectedDate}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
