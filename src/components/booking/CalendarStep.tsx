'use client';
import React, { useState } from 'react';

type CalendarProps = {
  categoria: string;
  onDateSelect: (date: string) => void;
};

export default function CalendarStep({ categoria, onDateSelect }: CalendarProps) {
  const today = new Date();
  
  // Calcolo del limite giorni in base alla categoria
  const getDaysAhead = (cat: string) => {
    switch (cat) {
      case 'Esercito': return 7;
      case 'Esercito in quiescenza': return 5;
      case 'Altra Forza Armata - DIFESA': return 1;
      case 'Esercito - Parenti 2° Grado': return 1;
      default: return 0;
    }
  };

  const daysAhead = getDaysAhead(categoria);
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + daysAhead);

  // Formattazione per l'input date (YYYY-MM-DD)
  const formatDate = (d: Date) => d.toISOString().split('T')[0];

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-2xl border border-blue-50 text-center">
      <div className="mb-6">
        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1 rounded-full uppercase">
          Priorità: {daysAhead} {daysAhead === 1 ? 'Giorno' : 'Giorni'}
        </span>
      </div>
      
      <h2 className="text-xl font-bold text-slate-800 mb-2">Seleziona la Data</h2>
      <p className="text-sm text-slate-500 mb-6">
        In base alla tua categoria, puoi prenotare fino al {maxDate.toLocaleDateString('it-IT')}
      </p>

      <input 
        type="date"
        min={formatDate(today)}
        max={formatDate(maxDate)}
        className="w-full p-4 rounded-xl bg-slate-50 border-2 border-blue-100 focus:border-blue-500 outline-none text-lg font-medium mb-6"
        onChange={(e) => onDateSelect(e.target.value)}
      />

      <div className="text-[10px] text-slate-400 uppercase tracking-tighter">
        Sistema di prenotazione anticipata - Stabilimento Balneare Santa Severa
      </div>
    </div>
  );
}
