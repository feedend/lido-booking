'use client';
import React, { useState, useEffect } from 'react';

export const dynamic = 'force-dynamic';

export type UserData = {
  nome: string;
  cognome: string;
  email: string;
  numUtenti: number;
  categoria: string;
  extraSdraio: number;    
  extraLettini: number;  
  prezzoExtra: number;     
};

export default function BookingForm({ onComplete }: { onComplete: (data: UserData) => void }) {
  const [formData, setFormData] = useState<UserData>({
    nome: '',
    cognome: '',
    email: '',
    numUtenti: 1,
    categoria: 'Esercito',
    extraSdraio: 0,
    extraLettini: 0,
    prezzoExtra: 0
  });

  const [accettaRegolamento, setAccettaRegolamento] = useState(false);
  const [isBlurred, setIsBlurred] = useState(true);

  // Timer per rimuovere l'offuscamento dopo 5 secondi (5000 ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsBlurred(false);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const COSTO_PEZZO = 1.50;
  const MAX_PEZZI_EXTRA = 3;

  // Calcola il totale dei pezzi extra correnti (Sdraio + Lettini Aggiuntivi)
  const pezziTotaliExtra = formData.extraSdraio + formData.extraLettini;

  // Determina dinamicamente il numero massimo di sdraio selezionabili in base al lettino extra
  const maxSdraioSelezionabili = MAX_PEZZI_EXTRA - formData.extraLettini;

  const handleSdraioChange = (valore: number) => {
    if (valore + formData.extraLettini <= MAX_PEZZI_EXTRA) {
      const nuoviPezzi = valore + formData.extraLettini;
      setFormData({
        ...formData,
        extraSdraio: valore,
        prezzoExtra: nuoviPezzi * COSTO_PEZZO
      });
    }
  };

  const handleLettiniChange = (valore: number) => {
    let nuovaSdraio = formData.extraSdraio;
    if (valore === 1 && nuovaSdraio === 3) {
      nuovaSdraio = 2;
    }

    const nuoviPezzi = nuovaSdraio + valore;
    setFormData({
      ...formData,
      extraLettini: valore,
      extraSdraio: nuovaSdraio,
      prezzoExtra: nuoviPezzi * COSTO_PEZZO
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accettaRegolamento) {
      alert("È necessario accettare il regolamento dello stabilimento per procedere.");
      return;
    }
    onComplete(formData);
  };

  return (
    <div className="relative max-w-md mx-auto bg-white p-8 rounded-3xl shadow-2xl border border-orange-100 text-slate-800 overflow-hidden">
      
      {/* Overlay di offuscamento temporaneo con messaggio ben visibile */}
      {isBlurred && (
        <div className="absolute inset-0 z-50 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center transition-all duration-500">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mb-4"></div>
          <p className="font-extrabold text-slate-900 text-base uppercase tracking-wider">
            Inizializzazione Form...
          </p>
          <p className="text-xs font-semibold text-slate-600 mt-2 max-w-xs leading-relaxed">
            Attendi qualche secondo prima di procedere con la registrazione.
          </p>
        </div>
      )}

      <h2 className="text-2xl font-black text-orange-600 mb-5 text-center uppercase tracking-tight">Registrazione</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Nome</label>
            <input 
              required
              placeholder="Nome"
              value={formData.nome}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm transition-all"
              type="text" 
              onChange={(e) => setFormData({...formData, nome: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Cognome</label>
            <input 
              required
              placeholder="Cognome"
              value={formData.cognome}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm transition-all"
              type="text" 
              onChange={(e) => setFormData({...formData, cognome: e.target.value})}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Indirizzo Email</label>
          <input 
            required
            placeholder="esempio@email.com"
            value={formData.email}
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm transition-all"
            type="email" 
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Componenti Nucleo (Max 4)</label>
          <select 
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm transition-all"
            value={formData.numUtenti}
            onChange={(e) => setFormData({...formData, numUtenti: parseInt(e.target.value)})}
          >
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Persona' : 'Persone'}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Categoria / Tariffa</label>
          <select 
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm transition-all"
            value={formData.categoria}
            onChange={(e) => setFormData({...formData, categoria: e.target.value})}
          >
            <option value="Esercito">Esercito</option>
            <option value="Esercito in quiescenza">Esercito in quiescenza</option>
            <option value="Altra Forza Armata">Altra Forza Armata</option>            
            <option value="Esercito - Parenti">Esercito - Parenti 2° Grado</option>
            <option value="Giornaliero">Pubblica Amministrazione </option>
          </select>
        </div>

        {/* --- SEZIONE ACCESSORI EXTRA --- */}
        <div className="bg-amber-50/40 p-4 rounded-2xl border border-orange-100/70 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-orange-950 uppercase tracking-wide">Attrezzatura Extra (€1.50/pz)</span>
            <span className="text-[11px] font-mono font-bold text-orange-700 bg-orange-100/60 px-2 py-0.5 rounded-md">
              Scelti: {pezziTotaliExtra} / {MAX_PEZZI_EXTRA} Max
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 ml-1">Lettini Aggiuntivi</label>
              <select
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 outline-none text-slate-900 text-xs font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                value={formData.extraLettini}
                onChange={(e) => handleLettiniChange(parseInt(e.target.value))}
              >
                {[0, 1].map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 ml-1">Sdraio Aggiuntive</label>
              <select
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 outline-none text-slate-900 text-xs font-bold focus:ring-2 focus:ring-orange-500 transition-all"
                value={formData.extraSdraio}
                onChange={(e) => handleSdraioChange(parseInt(e.target.value))}
              >
                {Array.from({ length: maxSdraioSelezionabili + 1 }, (_, i) => i).map(n => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.prezzoExtra > 0 && (
            <div className="text-right text-[11px] font-mono font-black text-emerald-600 pt-1 animate-pulse">
              Supplemento attrezzatura: + € {formData.prezzoExtra.toFixed(2)}
            </div>
          )}
        </div>

        {/* Box Informativo sulle dotazioni di Base */}
        <div className="p-4 bg-amber-50/60 border border-orange-100/80 rounded-2xl text-xs text-amber-950 space-y-1">
          <p className="font-bold uppercase tracking-wide text-[10px] text-orange-700">Incluso nella prenotazione di base:</p>
          <p>• 1 Postazione Ombrellone (€2.00)</p>
          <p>• 1 Lettino (€1.50)</p>
          <p className="text-slate-500 mt-1 pt-1 border-t border-orange-200/30 text-[11px]">
            Il prezzo finale includerà la quota base sopra indicata + il supplemento per ogni componente in base alla categoria selezionata.
          </p>
          <p className="font-bold uppercase tracking-wide text-[10px] text-black-600 mt-1">La prenotazione NON è rimborsabile</p>
          <p className="font-bold uppercase tracking-wide text-[10px] text-black-600 mt-1">NOTA:</p>
          <p className="font-bold uppercase tracking-wide text-[10px] text-red-700 mt-1">"Se le postazioni per la data selezionata risultano esaurite, le SLL possono contattare il Direttore dello Stabilimento al 335 1888895 per essere inseriti in lista d'attesa."</p>
        </div>

        <div className="mb-4 text-sm text-slate-600">
          Prima di procedere, ti invitiamo a leggere il nostro{' '}
          <a 
            href="/Regolamento_ed_2026.pdf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 font-bold underline hover:text-blue-800 transition-colors"
          >
            Regolamento Ufficiale
          </a>.
        </div>
        
        {/* --- CHECKBOX CONFERMA REGOLAMENTO 2026 --- */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
          <input
            id="checkbox-regolamento"
            type="checkbox"
            required
            checked={accettaRegolamento}
            onChange={(e) => setAccettaRegolamento(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-orange-600 border-slate-300 focus:ring-orange-500 focus:ring-2 cursor-pointer accent-orange-500"
          />
          <label htmlFor="checkbox-regolamento" className="text-xs text-slate-600 leading-tight select-none cursor-pointer font-medium">
            Dichiaro di aver letto e di accettare integralmente il <strong className="text-slate-900 font-semibold">Regolamento dello Stabilimento ed. 2026</strong> in tutte le sue parti.
          </label>
        </div>
        
        <button 
          type="submit" 
          disabled={!accettaRegolamento || isBlurred}
          className={`w-full font-bold py-4 rounded-xl shadow-lg mt-2 transition text-sm uppercase tracking-wider ${
            accettaRegolamento && !isBlurred
              ? 'bg-orange-500 hover:bg-orange-600 text-white cursor-pointer shadow-orange-500/20' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          Continua
        </button>
      </form>
    </div>
  );
}
