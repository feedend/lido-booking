'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import BookingForm, { type UserData } from '@/components/booking/BookingForm';
import CalendarStep from '@/components/booking/CalendarStep';
import BeachMap from '@/components/map/BeachMap';

// Componente interno per gestire la sincronizzazione dei parametri di Stripe
function StripeInitializer({ 
  setStep, 
  setUserData, 
  setSelectedDate 
}: { 
  setStep: (s: number) => void;
  setUserData: (d: UserData) => void;
  setSelectedDate: (d: string) => void;
}) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get('success');
    const spot = searchParams.get('spot');
    const dateParam = searchParams.get('date');

    // Se torniamo con successo da Stripe
    if (success === 'true' && spot && dateParam) {
      // 1. Recuperiamo l'anagrafica utente salvata temporaneamente nel localStorage
      const savedUser = localStorage.getItem('temp_lido_booking_user');
      
      if (savedUser) {
        setUserData(JSON.parse(savedUser));
        setSelectedDate(dateParam);
        // Saltiamo direttamente allo step 3 per mostrare la mappa e la modale di successo
        setStep(3);
        
        // Puliamo il localStorage per sicurezza
        localStorage.removeItem('temp_lido_booking_user');
      }
    }
  }, [searchParams, setStep, setUserData, setSelectedDate]);

  return null;
}

export default function Home() {
  const [step, setStep] = useState<number>(1); // 1: Registrazione, 2: Calendario, 3: Mappa degli Ombrelloni
  const [userData, setUserData] = useState<UserData | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Fase 1: Completamento del modulo anagrafico
  const handleFormComplete = (data: UserData) => {
    setUserData(data);
    setStep(2);
  };

  // Fase 2: Selezione della data dal calendario
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setStep(3);
  };

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4 font-sans antialiased text-slate-800">
      
      {/* Sincronizzatore dei parametri URL di Stripe avvolto in Suspense */}
      <Suspense fallback={null}>
        <StripeInitializer 
          setStep={setStep} 
          setUserData={setUserData} 
          setSelectedDate={setSelectedDate} 
        />
      </Suspense>
      
      {/* Intestazione dell'applicazione */}
      <div className="max-w-4xl mx-auto text-center mb-8">
        <h1 className="text-3xl font-black text-blue-900 tracking-tight uppercase">
          Stabilimento Balneare Santa Severa
        </h1>
        <p className="text-sm text-slate-500 font-medium mt-1">
          • System di Prenotazione •
        </p>
      </div>

      {/* Badge di Riepilogo: visibile solo negli Step 2 e 3 */}
      {step > 1 && userData && (
        <div className="max-w-2xl mx-auto mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-white p-6 rounded-3xl shadow-xl border-t-8 border-blue-600 relative overflow-hidden">
            
            {/* Effetto decorativo sullo sfondo */}
            <div className="absolute -right-8 -top-8 w-24 h-24 bg-blue-50 rounded-full pointer-events-none" />

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 relative z-10">
              <div className="text-center sm:text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">
                  Titolare Prenotazione
                </span>
                <h2 className="text-xl font-black text-blue-900 uppercase leading-tight">
                  {userData.nome} {userData.cognome}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{userData.email}</p>
              </div>
              
              <div className="flex gap-6 bg-slate-50/80 px-5 py-3 rounded-2xl border border-slate-100 w-full sm:w-auto justify-around sm:justify-end">
                <div className="text-center sm:min-w-[70px]">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Ospiti</p>
                  <p className="text-base font-black text-blue-600 mt-0.5">{userData.numUtenti}</p>
                </div>
                <div className="text-center sm:min-w-[90px] border-l border-slate-200 pl-6">
                  <p className="text-[9px] text-slate-400 uppercase font-black tracking-tighter">Giorno</p>
                  <p className="text-base font-black text-blue-600 mt-0.5">
                    {selectedDate ? new Date(selectedDate).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '--/--/----'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap justify-between items-center gap-2">
              <div className="flex flex-wrap gap-2">
                <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-tight border border-blue-100">
                  Profilo: {userData.categoria}
                </span>
                
                {userData.prezzoExtra > 0 && (
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-tight border border-emerald-100">
                    Extra: {userData.extraSdraio > 0 ? `${userData.extraSdraio} Sdraio ` : ''}{(userData as any).extraLettini > 0 ? `${(userData as any).extraLettini} Lettini` : ''} (+€{userData.prezzoExtra.toFixed(2)})
                  </span>
                )}
              </div>
              
              {step === 3 && (
                <button 
                  onClick={() => setStep(2)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors underline"
                >
                  Cambia data
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flusso condizionale delle schermate (Step) */}
      <div className="animate-in fade-in duration-300">
        {step === 1 && (
          <BookingForm onComplete={handleFormComplete} />
        )}
        
        {step === 2 && userData && (
          <CalendarStep 
            categoria={userData.categoria} 
            onDateSelect={handleDateSelect} 
          />
        )}
        
        {step === 3 && userData && (
          <BeachMap 
            selectedDate={selectedDate} 
            userData={userData as any} 
          />
        )}
      </div>

      {/* Footer tecnico */}
      <div className="text-center mt-12 text-[10px] text-slate-400 uppercase tracking-widest font-medium">
        WebPilot • Gestione Lido © {new Date().getFullYear()} V2.5
      </div>
    </main>
  );
}
