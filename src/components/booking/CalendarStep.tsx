'use client';
import React from 'react';

type CalendarStepProps = {
  categoria: string;
  onDateSelect: (date: string) => void;
};

export default function CalendarStep({ categoria, onDateSelect }: CalendarStepProps) {
  const oggiIso = new Date().toISOString().split('T')[0];
  const isGiornaliero = categoria.toLowerCase() === 'giornaliero';

  const handleSelezionaOggi = () => {
    onDateSelect(oggiIso);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-2xl border border-blue-50 text-slate-800 text-center">
      <h3 className="text-xl font-bold text-blue-900 mb-2 uppercase tracking-tight">Seleziona la Data</h3>
      
      {isGiornaliero ? (
        <div className="py-6 space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900">
            Hai selezionato la tariffa <strong>Giornaliero</strong>. Questa tipologia permette la prenotazione esclusivamente per la giornata di oggi.
          </div>
          
          <button
            onClick={handleSelezionaOggi}
            className="w-full bg-gradient-to-r from-blue-600 to-sky-600 text-white font-black py-4 px-6 rounded-xl shadow-md text-sm uppercase tracking-wider hover:from-blue-700 hover:to-sky-700 transition"
          >
            Prenota per Oggi ({new Date().toLocaleDateString('it-IT')})
          </button>
        </div>
      ) : (
        <div className="py-6 space-y-4">
          <p className="text-xs text-slate-500">Scegli il giorno della tua prenotazione:</p>
          <input 
            type="date"
            min={oggiIso}
            onChange={(e) => e.target.value && onDateSelect(e.target.value)}
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold outline-none text-sm text-center focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
    </div>
  );
}
