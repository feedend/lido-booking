'use client';
import React, { useState } from 'react';

export const dynamic = 'force-dynamic';

export type UserData = {
  nome: string;
  cognome: string;
  email: string;
  numUtenti: number;
  categoria: string;
  extraSdraio: number;    
  extraSpiaggine: number;  
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
    extraSpiaggine: 0,
    prezzoExtra: 0
  });

  const [accettaRegolamento, setAccettaRegolamento] = useState(false);

  const COSTO_PEZZO = 1.50;
  const MAX_PEZZI = 3;

  const pezziTotali = formData.extraSdraio + formData.extraSpiaggine;

  const handleSdraioChange = (valore: number) => {
    if (valore + formData.extraSpiaggine <= MAX_PEZZI) {
      const nuoviPezzi = valore + formData.extraSpiaggine;
      setFormData({
        ...formData,
        extraSdraio: valore,
        prezzoExtra: nuoviPezzi * COSTO_PEZZO
      });
    }
  };

  const handleSpiaggineChange = (valore: number) => {
    if (formData.extraSdraio + valore <= MAX_PEZZI) {
      const nuoviPezzi = formData.extraSdraio + valore;
      setFormData({
        ...formData,
        extraSpiaggine: valore,
        prezzoExtra: nuoviPezzi * COSTO_PEZZO
      });
    }
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
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-2xl border border-blue-50 text-slate-800">
      <h2 className="text-2xl font-bold text-blue-900 mb-5 text-center">Registrazione</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Nome</label>
            <input 
              required
              placeholder="Nome"
              value={formData.nome}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
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
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
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
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
            type="email" 
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Componenti Nucleo (Max 4)</label>
          <select 
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-slate-900 text-sm"
            value={formData.numUtenti}
            onChange={(e) => setFormData({...formData, numUtenti: parseInt(e.target.value)})}
          >
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Persona' : 'Persone'}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Categoria / Tariffa</label>
          <select 
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-slate-900 text-sm"
            value={formData.categoria}
            onChange={(e) => setFormData({...formData, categoria: e.target.value})}
          >
            <option value="Esercito">Esercito</option>
            <option value="Altra Forza Armata">Altra Forza Armata</option>
            <option value="Esercito in quiescenza">Esercito in quiescenza</option>
            <option value="Esercito - Parenti">Esercito - Parenti 2° Grado</option>
            <option value="Giornaliero">Giornaliero (Solo Oggi)</option>
          </select>
        </div>

        {/* --- SEZIONE ACCESSORI EXTRA --- */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Attrezzatura Extra (€1.50/pz)</span>
            <span className="text-[11px] font-mono font-bold text-slate-500">
              Scelti: {pezziTotali} / {MAX_PEZZI} Max
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 ml-1">Sdraio Aggiuntive</label>
              <select
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 outline-none text-slate-900 text-xs font-bold"
                value={formData.extraSdraio}
                onChange={(e) => handleSdraioChange(parseInt(e.target.value))}
              >
                {[0, 1, 2, 3].map(n => (
                  <option key={n} value={n} disabled={n + formData.extraSpiaggine > MAX_PEZZI}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 ml-1">Lettini Aggiuntivi</label>
              <select
                className="w-full p-2.5 rounded-xl bg-white border border-slate-200 outline-none text-slate-900 text-xs font-bold"
                value={formData.extraSpiaggine}
                onChange={(e) => handleSpiaggineChange(parseInt(e.target.value))}
              >
                {[0, 1, 2, 3].map(n => (
                  <option key={n} value={n} disabled={formData.extraSdraio + n > MAX_PEZZI}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {formData.prezzoExtra > 0 && (
            <div className="text-right text-[11px] font-mono font-black text-emerald-600 pt-1">
              Supplemento attrezzatura: + € {formData.prezzoExtra.toFixed(2)}
            </div>
          )}
        </div>

        {/* Box Informativo sulle dotazioni di Base */}
        <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl text-xs text-blue-950 space-y-1">
          <p className="font-bold uppercase tracking-wide text-[10px] text-blue-800">Incluso nella prenotazione di base:</p>
          <p>• 1 Postazione Ombrellone (€2.00)</p>
          <p>• 1 Lettino (€1.50)</p>
          <p className="text-slate-500 mt-1 pt-1 border-t border-blue-200/40">
            Il prezzo finale includerà la quota base sopra indicata + il supplemento per ogni componente in base alla categoria selezionata.
          </p>
          <p className="font-bold uppercase tracking-wide text-[10px] text-blue-800">La prenotazione NON è rimborsabile</p>
        </div>

        {/* --- CHECKBOX CONFERMA REGOLAMENTO 2026 --- */}
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-3">
          <input
            id="checkbox-regolamento"
            type="checkbox"
            required
            checked={accettaRegolamento}
            onChange={(e) => setAccettaRegolamento(e.target.checked)}
            className="mt-1 w-4 h-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 focus:ring-2 cursor-pointer"
          />
          <label htmlFor="checkbox-regolamento" className="text-xs text-slate-600 leading-tight select-none cursor-pointer font-medium">
            Dichiaro di aver letto e di accettare integralmente il <strong className="text-slate-900 font-semibold">Regolamento dello Stabilimento ed. 2026</strong> in tutte le sue parti.
          </label>
        </div>
        
        <button 
          type="submit" 
          disabled={!accettaRegolamento}
          className={`w-full font-bold py-4 rounded-xl shadow-lg mt-2 transition text-sm ${
            accettaRegolamento 
              ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          Continua
        </button>
      </form>
    </div>
  );
}
