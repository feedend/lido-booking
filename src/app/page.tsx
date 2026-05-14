'use client';
import { useState } from 'react';
import BookingForm from '@/components/booking/BookingForm';
import BeachMap from '@/components/map/BeachMap';

export default function Home() {
  const [step, setStep] = useState(1); // 1: Form, 2: Mappa
  const [userData, setUserData] = useState<any>(null);
  const today = new Date().toISOString().split('T')[0];

  const handleFormComplete = (data: any) => {
    setUserData(data);
    setStep(2);
  };

  return (
    <main className="min-h-screen bg-slate-100 py-12 px-4">
      {step === 1 ? (
        <BookingForm onComplete={handleFormComplete} />
      ) : (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl shadow-md max-w-lg mx-auto text-center border-l-4 border-blue-500">
            <p className="text-slate-600">Benvenuto, <span className="font-bold text-blue-900">{userData.nome} {userData.cognome}</span></p>
            <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">{userData.categoria} • {userData.numUtenti} Persone</p>
          </div>
          <BeachMap selectedDate={today} />
        </div>
      )}
    </main>
  );
}
