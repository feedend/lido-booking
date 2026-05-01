'use client';
import React, { useState } from 'react';

const BeachMap = () => {
  // Stato per gestire l'ombrellone selezionato dall'utente
  const [selectedSpot, setSelectedSpot] = useState(null);
  
  const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I']; // 9 file
  const cols = Array.from({ length: 10 }, (_, i) => i + 1);    // 10 colonne

  const handleSpotClick = (id) => {
    setSelectedSpot(id);
    console.log("Hai selezionato l'ombrellone:", id);
  };

  return (
    <div className="flex flex-col items-center p-4 bg-slate-100 rounded-xl">
      <h2 className="mb-4 text-xl font-bold text-blue-800">Mappa del Lido</h2>
      
      {/* Container della mappa SVG */}
      <svg 
        viewBox="0 0 550 500" 
        className="w-full max-w-2xl bg-yellow-50 shadow-inner rounded-lg border-b-8 border-blue-400"
      >
        {/* Rappresentazione del Mare */}
        <rect width="550" height="40" fill="#0ea5e9" />
        <text x="250" y="25" fill="white" className="text-xs font-bold">MARE</text>

        {rows.map((row, rowIndex) => (
          cols.map((col, colIndex) => {
            const id = `${row}${col}`;
            const x = 50 + colIndex * 50;
            const y = 80 + rowIndex * 45;

            return (
              <g 
                key={id} 
                onClick={() => handleSpotClick(id)}
                className="cursor-pointer transition-all duration-300 hover:scale-110"
              >
                {/* L'ombrellone (cerchio) */}
                <circle 
                  cx={x} cy={y} r="15" 
                  fill={selectedSpot === id ? "#ef4444" : "#10b981"} 
                  stroke="#fff" strokeWidth="2"
                />
                {/* Etichetta (A1, A2...) */}
                <text 
                  x={x} y={y + 2} 
                  textAnchor="middle" 
                  fill="white" 
                  fontSize="8" 
                  className="select-none pointer-events-none"
                >
                  {id}
                </text>
              </g>
            );
          })
        ))}
      </svg>

      {selectedSpot && (
        <div className="mt-6 p-4 bg-white border-l-4 border-blue-500 shadow-md">
          <p>Hai scelto l'ombrellone: <strong>{selectedSpot}</strong></p>
          <button className="mt-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Prenota Ora
          </button>
        </div>
      )}
    </div>
  );
};

export default BeachMap;
