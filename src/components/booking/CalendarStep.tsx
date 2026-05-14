'use client';
import { useState } from 'react';
import BookingForm from '@/components/booking/BookingForm';
import CalendarStep from '@/components/booking/CalendarStep';
import BeachMap from '@/components/map/BeachMap';

export default function Home() {
  const [step, setStep] = useState(1); // 1: Form, 2: Calendario, 3: Mappa
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
    <main className="min-h-screen bg-slate-100 py-12 px-4">
      {/* Header riassuntivo visibile dopo il primo step */}
      {step > 1 && (
        <div className="bg-white p-4 rounded-2xl shadow-md max-w-lg mx-auto text-center border-l-4 border-blue-500 mb-8">
          <p className="text-slate-600">Bagnante: <span className="font-bold text-blue-900">{userData.nome} {userData.cognome}</span></p>
          <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">
            {userData.categoria} • {selectedDate ? `Data: ${selectedDate}` : 'Selezione data...'}
          </p>
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
