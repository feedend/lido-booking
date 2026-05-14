'use client';
import React, { useState } from 'react';

type UserData = {
  nome: string;
  cognome: string;
  email: string; // Nuovo campo
  numUtenti: number;
  categoria: string;
};

export default function BookingForm({ onComplete }: { onComplete: (data: UserData) => void }) {
  const [formData, setFormData] = useState<UserData>({
    nome: '',
    cognome: '',
    email: '',
    numUtenti: 1,
    categoria: 'Esercito'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete(formData);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-3xl shadow-2xl border border-blue-50">
      <h2 className="text-2xl font-bold text-blue-900 mb-6 text-center">Registrazione</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <input 
            required
            placeholder="Nome"
            className="p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            type="text" 
            onChange={(e) => setFormData({...formData, nome: e.target.value})}
          />
          <input 
            required
            placeholder="Cognome"
            className="p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
            type="text" 
            onChange={(e) => setFormData({...formData, cognome: e.target.value})}
          />
        </div>

        <input 
          required
          placeholder="Indirizzo Email"
          className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500"
          type="email" 
          onChange={(e) => setFormData({...formData, email: e.target.value})}
        />

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Componenti Nucleo (Max 4)</label>
          <select 
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none"
            value={formData.numUtenti}
            onChange={(e) => setFormData({...formData, numUtenti: parseInt(e.target.value)})}
          >
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Persona' : 'Persone'}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Categoria</label>
          <select 
            className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none"
            value={formData.categoria}
            onChange={(e) => setFormData({...formData, categoria: e.target.value})}
          >
            <option value="Esercito">Esercito</option>
            <option value="Altra Forza Armata">Altra Forza Armata</option>
            <option value="Esercito in quiescenza">Esercito in quiescenza</option>
            <option value="Esercito - Parenti">Esercito - Parenti</option>
          </select>
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg mt-2">
          Continua
        </button>
      </form>
    </div>
  );
}
