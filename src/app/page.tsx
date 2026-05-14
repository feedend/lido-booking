'use client';
import { useState } from 'react';
import BookingForm from '@/components/booking/BookingForm';
import CalendarStep from '@/components/booking/CalendarStep';
import BeachMap from '@/components/map/BeachMap';

export default function Home() {
  const [step, setStep] = useState(1);
  const [userData, setUserData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState('');

  const handleFormComplete = (data: any) => {
    setUserData(data);
    setStep(2);
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setStep(3);
  };

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4">
      {/* Riepilogo Dati visibile durante la selezione data e posto */}
      {step > 1 && (
        <div className="max-w-2xl mx-auto mb-8">
          <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-blue-600">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="text-center md:text-left">
                <h2 className="text-xl font-black text-blue-900 uppercase">
                  {userData.nome} {userData.cognome}
                </h2>
                <p className="text-sm text-slate-500 font-medium">{userData.email}</p>
              </div>
              
              <div className="flex gap-4">
                <div className="text-center px-4 border-x border-slate-100">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Persone</p>
                  <p className="text-lg font-bold text-blue-600">{userData.numUtenti}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Data</p>
                  <p className="text-lg font-bold text-blue-600">
                    {selectedDate ? new Date(selectedDate).toLocaleDateString('it-IT') : '--/--'}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 flex justify-center">
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-tighter">
                Categoria: {userData.categoria}
              </span>
            </div>
          </div>
        </div>
      )}

      {step === 1 && <BookingForm onComplete={handleFormComplete} />}
      
      {step === 2 && (
        <CalendarStep 
          categoria={userData.categoria} 
          onDateSelect={handleDateSelect} 
        />
      )}
      
      {step === 3 && <BeachMap selectedDate={selectedDate} />}
    </main>
  );
}
