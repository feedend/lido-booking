'use client';
import React, { useState, useEffect } from 'react';

type CalendarProps = {
  categoria: string;
  onDateSelect: (date: string) => void;
};

export default function CalendarStep({ categoria, onDateSelect }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState('');

  // Calcolo della data odierna locale con formattazione ISO pulita (Safe per Safari)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const minDateStr = `${yyyy}-${mm}-${dd}`;

  // Calcolo del limite giorni in base alla categoria
  const getDaysAhead = (cat: string) => {
    switch (cat) {
      case 'Esercito': return 7;
      case 'Altra Forza Armata': return 1;
      case 'Esercito in quiescenza': return 5;
      case 'Esercito - Parenti': return 1;
      case 'Giornaliero': return 0;
      default: return 0;
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

  // Effetto di sicurezza: Se la categoria prevede "Solo Oggi" (0 giorni), preimpostiamo il valore
  useEffect(() => {
    if (daysAhead === 0) {
      setCurrentDate(minDateStr);
    }
  }, [daysAhead, minDateStr]);

  // Gestione della conferma esplicita della data con controllo logico finale (Doppio Blocco iOS)
  const handleConfirmDate = () => {
    if (!currentDate) return;

    // Controllo di sicurezza software per iOS: se la data supera i limiti, blocca l'azione
    if (currentDate < minDateStr || currentDate > maxDateStr) {
      alert(`Attenzione: Per la tariffa "${categoria}" puoi selezionare solo una data compresa tra il ${dd}/${mm}/${yyyy} e il ${maxDate.toLocaleDateString('it-IT')}.`);
      setCurrentDate(daysAhead === 0 ? minDateStr : '');
      return;
    }

    onDateSelect(currentDate);
  };

  return (
    <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl border border-orange-100/70 overflow-hidden text-slate-800">
      
      {/* Intestazione con Pattern Onde CSS */}
      <div className="relative h-20 bg-gradient-to-r from-orange-500 to-amber-500 flex flex-col justify-center items-center text-white overflow-hidden select-none">
        <h2 className="text-base font-black uppercase tracking-wider relative z-10 drop-shadow-sm">
          Scelta della Data
        </h2>
        
        <div className="absolute left-0 bottom-0 w-[200%] h-6 pointer-events-none origin-bottom opacity-40">
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes calendarWave {
              0% { transform: translateX(0) scaleY(1); }
              50% { transform: translateX(-25%) scaleY(0.85); }
              100% { transform: translateX(-50%) scaleY(1); }
            }
            .animate-calendar-wave { animation: calendarWave 6s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite; }
          `}} />
          <svg className="absolute left-0 bottom-0 w-full h-full text-white fill-current animate-calendar-wave" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,50 C200,80 400,20 600,50 C800,80 1000,20 1200,50 L1200,120 L0,120 Z"></path>
          </svg>
        </div>
      </div>

      <div className="p-6 sm:p-8 flex flex-col items-center">
        
        {/* Badge Dinamico della Finestra di Priorità */}
        <div className="mb-5">
          <span className={`text-xs font-black px-3 py-1.5 rounded-full uppercase tracking-wider transition-all shadow-sm ${
            daysAhead > 0 
              ? 'bg-amber-100 text-orange-800 ring-1 ring-orange-200' 
              : 'bg-slate-100 text-slate-500'
          }`}>
            {daysAhead === 0 ? 'Solo Oggi' : `Priorità: ${daysAhead} ${daysAhead === 1 ? 'Giorno' : 'Giorni'}`}
          </span>
        </div>
        
        {/* Testo di Contesto */}
        <label htmlFor="lido-date-picker" className="text-sm text-slate-500 mb-6 text-center leading-relaxed max-w-[280px] cursor-pointer block">
          In base alla tariffa <span className="font-bold text-orange-600 block sm:inline">"{categoria}"</span>, puoi riservare fino al <span className="font-semibold text-slate-900 border-b-2 border-amber-400 pb-0.5">{maxDate.toLocaleDateString('it-IT')}</span>
        </label>

        {/* Input Data con ID rigido e attributi puliti per iOS */}
        <div className="w-full relative px-1">
          <input 
            id="lido-date-picker"
            type="date"
            min={minDateStr}
            max={maxDateStr}
            value={currentDate}
            className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 outline-none text-center text-base font-bold text-slate-800 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-150 block"
            onChange={(e) => {
              setCurrentDate(e.target.value);
            }}
          />
        </div>

        {/* Pulsante di Conferma Condizionale */}
        <div className={`w-full transition-all duration-300 ease-in-out overflow-hidden ${currentDate ? 'mt-4 max-h-16 opacity-100' : 'max-h-0 opacity-0 pointer-events-none'}`}>
          <button
            type="button"
            onClick={handleConfirmDate}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-xl shadow-md transform active:scale-[0.98] transition-all text-sm uppercase tracking-wider"
          >
            Conferma Data e Cerca Posti
          </button>
        </div>

        <div className="w-full mt-6 p-4 bg-amber-50/20 border border-orange-100/40 rounded-2xl text-[11px] text-center text-slate-500">
          I posti disponibili variano in tempo reale a seconda delle richieste complessive ricevute dallo stabilimento.
        </div>

        <div className="mt-6 text-[9px] text-slate-400 font-bold uppercase tracking-widest border-t border-slate-100 pt-4 w-full text-center select-none">
          Stabilimento Balneare Santa Severa
        </div>
      </div>
    </div>
  );
}
