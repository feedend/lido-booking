'use client';
import React from 'react';

type CalendarProps = {
  categoria: string;
  onDateSelect: (date: string) => void;
};

export default function CalendarStep({ categoria, onDateSelect }: CalendarProps) {
  // Calcolo della data odierna locale (senza sballare con ISOString e fusi orari)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const minDateStr = `${yyyy}-${mm}-${dd}`;

  // Calcolo del limite giorni in base alla categoria
  const getDaysAhead = (cat: string) => {
    switch (cat) {
      case 'Esercito': return 7;
      case 'Esercito in quiescenza': return 5;
      case 'Altra Forza Armata': return 1;
      case 'Esercito - Parenti': return 1;
      default: return 0; // Dipendenti civili o prenotazione solo giorno stesso se non mappati
    }
  };

  const daysAhead = getDaysAhead(categoria);
  
  // Calcolo della data massima consentita localmente
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + daysAhead);
  
  const maxYear = maxDate.getFullYear();
  const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
  const maxDay = String(maxDate.getDate()).padStart(2, '0');
  const maxDateStr = `${maxYear}-${maxMonth}-${maxDay}`;

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-2xl border border-blue-50 text-center">
      <div className="mb-6">
        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
          Priorità: {daysAhead} {daysAhead === 1 ? 'Giorno' : 'Giorni'}
        </span>
      </div>
      
      <h2 className="text-xl font-bold text-slate-800 mb-2">Seleziona la Data</h2>
      <p className="text-sm text-slate-500 mb-6">
        In base alla categoria <span className="font-semibold text-blue-600">"{categoria}"</span>, puoi prenotare fino al {maxDate.toLocaleDateString('it-IT')}
      </p>

      <input 
        type="date"
        min={minDateStr}
        max={maxDateStr}
        className="w-full p-4 rounded-xl bg-slate-50 border-2 border-blue-100 focus:border-blue-500 outline-none text-lg font-medium mb-6 text-slate-800 cursor-pointer"
        onChange={(e) => onDateSelect(e.target.value)}
      />

      <div className="text-[10px] text-slate-400 uppercase tracking-tighter">
        Sistema di prenotazione anticipata - Stabilimento Balneare Santa Severa
      </div>
    </div>
  );
}
