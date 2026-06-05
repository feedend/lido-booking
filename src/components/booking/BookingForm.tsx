'use client';
import React, { useState } from 'react';

export const dynamic = 'force-dynamic';

export type UserData = {
  nome: string;
  cognome: string;
  email: string;
  numUtenti: number;
  categoria: string;
  telefono?: string;
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
    telefono: '',
    extraSdraio: 0,
    extraSpiaggine: 0,
    prezzoExtra: 0
  });

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
    onComplete(formData);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-2xl border border-blue-50 text-slate-800">
      <h2 className="text-2xl font-bold text-blue-900 mb-6 text-center">Registrazione</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Nome</label>
            <input 
              required
              placeholder="Nome"
              value={formData.nome}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
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
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
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
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            type="email" 
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Telefono (Opzionale)</label>
          <input 
            placeholder="3331234567"
            value={formData.telefono}
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
            type="tel" 
            onChange={(e) => setFormData({...formData, telefono: e.target.value})}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Componenti Nucleo (Max 4)</label>
          <select 
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none bg-slate-50 text-slate-900"
            value={formData.numUtenti}
            onChange={(e) => setFormData({...formData, numUtenti: parseInt(e.target.value)})}
          >
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Persona' : 'Persone'}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Categoria</label>
          <select 
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none bg-slate-50 text-slate-900"
            value={formData.categoria}
            onChange={(e) => setFormData({...formData, categoria: e.target.value})}
          >
            <option value="Esercito">Esercito</option>
            <option value="Altra Forza Armata">Altra Forza Armata</option>
            <option value="Esercito in quiescenza">Esercito in quiescenza</option>
            <option value="Esercito - Parenti">Esercito - Parenti</option>
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
              <label className="block text-[11px] font-semibold text-slate-500 mb-1 ml-1">Spiaggine Aggiuntive</label>
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

          {/* Cifra parziale degli accessori */}
          {formData.prezzoExtra > 0 && (
            <div className="text-right text-[11px] font-mono font-black text-emerald-600 pt-1">
              Supplemento attrezzatura: + € {formData.prezzoExtra.toFixed(2)}
            </div>
          )}
        </div>

        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg mt-2 transition">
          Continua
        </button>
      </form>
    </div>
  );
}
