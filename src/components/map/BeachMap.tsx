'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type BeachMapProps = {
  selectedDate: string;
  userData: {
    nome: string;
    cognome: string;
    email: string;
    numUtenti: number;
    categoria: string;
  };
};

interface DBSpot {
  id: string;
  internal_code: string;
  is_available: boolean;
}

export default function BeachMap({ selectedDate, userData }: BeachMapProps) {
  const [reservedSpots, setReservedSpots] = useState<number[]>([]);
  const [dbSpots, setDbSpots] = useState<DBSpot[]>([]); // Memorizza gli ombrelloni da DB
  const [selectedSpotNumber, setSelectedSpotNumber] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBeachData = async () => {
      setIsLoading(true);
      try {
        // 1. RECUPERA LO STATO DI TUTTI GLI OMBRELLONI (Tabella 'spots')
        const { data: spotsData } = await supabase
          .from('spots')
          .select('id, internal_code, is_available');
        
        if (spotsData) {
          setDbSpots(spotsData);
        }

        // 2. RECUPERA LE PRENOTAZIONI DI OGGI
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('booking_category, spot_id, status') 
          .eq('booking_date', selectedDate)
          .not('status', 'eq', 'cancelled');

        if (bookingsData) {
          const occupati = bookingsData
            .map(b => {
              // Se la prenotazione ha già lo spot_id compilato come codice numerico o UUID
              // cerchiamo di risalire al numero, altrimenti facciamo il fallback sul vecchio split della stringa
              const fallbackNum = parseInt(b.booking_category?.split('|')[0]);
              return fallbackNum;
            })
            .filter(num => !isNaN(num));
          
          setReservedSpots(occupati);
        }
      } catch (err) {
        console.error("Errore nel caricamento dei dati della spiaggia:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBeachData();
  }, [selectedDate]);

  // FUNZIONE PER IL CALCOLO DINAMICO DEL PREZZO
  const calcolaPrezzoTotale = () => {
    const quotaBaseOmbrellone = 2.0;
    let supplementoPersona = 0.0;
    const cat = userData.categoria.trim().toLowerCase();

    if (cat.includes('esercito parenti')) {
      supplementoPersona = 1.5;
    } else if (cat === 'esercito' || cat.includes('altra forza armata')) {
      supplementoPersona = 1.5;
    } else if (cat.includes('quiescenza')) {
      supplementoPersona = 3.5;
    }

    return quotaBaseOmbrellone + (userData.numUtenti * supplementoPersona);
  };

  const prezzoFinale = calcolaPrezzoTotale();

  // GESTIONE PAGAMENTO FITTIZIO + SALVATAGGIO RADDRIZZATO
  const handlePaymentAndBooking = async () => {
    if (selectedSpotNumber === null) return;
    
    setPaymentProcessing(true);
    setIsSubmitting(true);

    try {
      // Controlliamo i duplicati prima di pagare
      const { data: existingBookings, error: fetchError } = await supabase
        .from('bookings')
        .select('booking_category')
        .eq('booking_date', selectedDate)
        .not('status', 'eq', 'cancelled');

      if (fetchError) {
        alert("Errore di controllo: " + fetchError.message);
        setPaymentProcessing(false);
        setIsSubmitting(false);
        return;
      }

      // Manteniamo il controllo di compatibilità per i record scritti con la vecchia logica
      const haGiaPrenotatoCategoria = existingBookings?.some(b => {
        if (!b.booking_category) return false;
        const parti = b.booking_category.split('|');
        if (parti.length >= 3) {
          const catMappa = parti[1].trim();
          const emailMappa = parti[2].trim().toLowerCase();
          return catMappa === userData.categoria && emailMappa === userData.email.toLowerCase();
        }
        return false;
      });

      if (haGiaPrenotatoCategoria) {
        alert(`Attenzione! L'email ${userData.email} ha già una prenotazione attiva per la categoria "${userData.categoria}" in questa data.`);
        setPaymentProcessing(false);
        setIsSubmitting(false);
        setSelectedSpotNumber(null);
        return;
      }

      // Simulazione circuito Nexi (3 secondi)
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      setPaymentProcessing(false); 

      // TROVA L'ID REALE DELL'OMBRELLONE CORRISPONDENTE AL NUMERO SELEZIONATO
      const matchingSpot = dbSpots.find(s => parseInt(s.internal_code) === selectedSpotNumber);
      const spotIdToSave = matchingSpot ? matchingSpot.id : selectedSpotNumber.toString();

      // Componiamo il nome completo da salvare nella nuova colonna
      const nomeCompletoCliente = `${userData.nome} ${userData.cognome}`;

      // INSERIMENTO PULITO NELLE RISPETTIVE COLONNE
      const { error } = await supabase
        .from('bookings')
        .insert([
          {
            booking_date: selectedDate,
            num_guests: userData.numUtenti,
            spot_id: spotIdToSave,
            total_price: prezzoFinale,             // Prezzo registrato correttamente come numero puro
            client_name: nomeCompletoCliente,       // Nome registrato nella nuova colonna text
            booking_category: userData.categoria,   // Categoria pulita senza concatenazioni
            status: 'confirmed'
          }
        ]);

      if (error) {
        alert("Errore durante la registrazione della prenotazione: " + error.message);
      } else {
        try {
          await fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: userData.email.trim(),
              nome: userData.nome,
              cognome: userData.cognome,
              data: new Date(selectedDate).toLocaleDateString('it-IT'),
              ombrellone: selectedSpotNumber,
              prezzo: prezzoFinale.toFixed(2),
              utenti: userData.numUtenti,
              categoria: userData.categoria
            }),
          });
        } catch (emailErr) {
          console.error("Errore nell'invio dell'email:", emailErr);
        }

        setBookingSuccess(true);
        setReservedSpots([...reservedSpots, selectedSpotNumber]);
      }
    } catch (err) {
      alert("Errore durante il processo di transazione.");
      setPaymentProcessing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const qrCodeUrl = selectedSpotNumber 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`LIDO_SANTA_SEVERA|DATA:${selectedDate}|POSTO:${selectedSpotNumber}|EMAIL:${userData.email}`)}`
    : '';

  const rows = [
    { startL: 1, endL: 10, startR: 11, endR: 20, center: "Bagnino" },
    { startL: 21, endL: 30, startR: 31, endR: 40, center: "" },
    { startL: 41, endL: 50, startR: 51, endR: 60, center: "" },
    { startL: 61, endL: 70, startR: 71, endR: 80, center: "P" },
    { startL: 81, endL: 90, startR: 91, endR: 100, center: "a" },
    { startL: 101, endL: 110, startR: 111, endR: 120, center: "s" },
    { startL: 121, endL: 129, startR: 130, endR: 139, center: "s" },
    { startL: 140, endL: 146, startR: 147, endR: 154, center: "e" },
    { startL: 155, endL: 160, startR: 161, endR: 167, center: "r" },
    { startL: null, endL: null, startR: 168, endR: 171, center: "a" },
    { startL: null, endL: null, startR: 172, endR: 174, center: "" },
  ];

  const renderSpot = (num: number) => {
    const isDbReserved = reservedSpots.includes(num);
    const correspondingDbSpot = dbSpots.find(s => parseInt(s.internal_code) === num);
    const isDeactivatedByAdmin = correspondingDbSpot ? correspondingDbSpot.is_available === false : false;
    const isReserved = isDbReserved || isDeactivatedByAdmin;

    return (
      <div
        key={num}
        onClick={() => !isReserved && setSelectedSpotNumber(num)}
        className={`relative w-11 h-14 flex flex-col items-center justify-center transition-all duration-150 select-none shrink-0
          ${isReserved ? 'text-gray-400 cursor-not-allowed' : 'text-orange-600 hover:scale-110 cursor-pointer'}`}
      >
        <svg 
          viewBox="0 0 24 24" 
          className={`w-9 h-9 drop-shadow-sm transition-colors ${isReserved ? 'fill-gray-300' : 'fill-orange-500 hover:fill-orange-600'}`}
        >
          <path d="M12 2C6.48 2 2 6.48 2 12h20c0-5.52-4.48-10-10-10z" />
          <path d="M12 2v10M7 4.5L12 12M17 4.5L12 12" stroke="white" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M11.5 12h1v9h-1z" fill="#94a3b8" />
        </svg>

        <span className={`text-[9px] font-black mt-0.5 px-1 rounded bg-white/90 shadow-sm border
          ${isReserved ? 'text-gray-400 border-gray-200' : 'text-orange-950 border-orange-100'}`}>
          {num}
        </span>

        {isReserved && (
          <div className="absolute top-1.5 w-6 h-6 flex items-center justify-center bg-red-500/90 text-white font-extrabold text-[9px] rounded-full shadow-md">
            ✕
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-md max-w-sm mx-auto">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-sm font-semibold text-slate-600">Sincronizzazione spiaggia...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto bg-amber-50/40 p-4 sm:p-6 rounded-3xl shadow-xl border border-orange-100/70 relative">
      <div className="block md:hidden text-center text-[10px] text-orange-800/70 font-bold uppercase tracking-wider mb-2 animate-pulse">
        ↔ Scorri lateralmente per vedere tutta la spiaggia ↔
      </div>

      <div className="w-full text-center py-3.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 rounded-2xl shadow-md mb-6 sticky left-0">
        <h2 className="font-black text-white uppercase tracking-wider text-xs sm:text-sm">
          Stabilimento Balneare Santa Severa
        </h2>
        <p className="text-[10px] text-cyan-50 font-medium tracking-[0.3em] uppercase mt-0.5">
          ~~~ Mappa della Spiaggia ~~~
        </p>
      </div>

      <div className="w-full overflow-x-auto pb-4 rounded-xl">
        <div className="flex flex-col gap-3 w-[960px] mx-auto pl-2 pr-4">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center justify-start gap-4">
              <div className="w-[430px] grid grid-cols-10 gap-0.5 justify-items-start">
                {row.startL ? (
                  <>
                    {Array.from({ length: 10 - (row.endL! - row.startL! + 1) }).map((_, i) => (
                      <div key={`empty-l-${i}`} className="w-10 h-14 opacity-0 pointer-events-none" />
                    ))}
                    {Array.from({ length: row.endL! - row.startL! + 1 }, (_, i) => row.startL! + i).map(renderSpot)}
                  </>
                ) : (
                  Array.from({ length: 10 }).map((_, i) => <div key={`blank-l-${i}`} className="w-10 h-14" />)
                )}
              </div>
              
              <div className="w-12 shrink-0 flex justify-center items-center font-black text-amber-800 uppercase text-[9px] tracking-wider bg-yellow-100/90 py-2 rounded-xl border border-yellow-200/50 shadow-inner">
                {row.center || "•"}
              </div>
              
              <div className="w-[430px] grid grid-cols-10 gap-0.5 justify-items-start">
                {row.startR ? (
                  <>
                    {Array.from({ length: row.endR! - row.startR! + 1 }, (_, i) => row.startR! + i).map(renderSpot)}
                    {Array.from({ length: 10 - (row.endR! - row.startR! + 1) }).map((_, i) => (
                      <div key={`empty-r-${i}`} className="w-10 h-14 opacity-0 pointer-events-none" />
                    ))}
                  </>
                ) : (
                  Array.from({ length: 10 }).map((_, i) => <div key={`blank-r-${i}`} className="w-10 h-14" />)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modale Pop-up */}
      {selectedSpotNumber !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center border border-slate-100 scale-in duration-200">
            {bookingSuccess ? (
              <div className="py-2 flex flex-col items-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mb-3">✓</div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Prenotazione Confermata</h3>
                <p className="text-xs text-slate-500 mt-1 mb-4">Mostra questo pass all'ingresso dello stabilimento</p>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner mb-3">
                  <img src={qrCodeUrl} alt="QR Code Prenotazione" className="w-44 h-44 mix-blend-multiply" />
                  <div className="mt-3 pt-2.5 border-t border-slate-200 font-mono text-xs text-slate-800 space-y-1 bg-white p-2 rounded-xl border">
                    <p><strong>DATA:</strong> {new Date(selectedDate).toLocaleDateString('it-IT')}</p>
                    <p className="text-orange-600 font-bold"><strong>OMBRELLONE N°:</strong> {selectedSpotNumber}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setBookingSuccess(false);
                    setSelectedSpotNumber(null);
                  }}
                  className="mt-2 w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider"
                >
                  Chiudi e Torna alla Mappa
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-black text-orange-950 uppercase tracking-tight mb-2">Riepilogo e Pagamento</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Stai per riservare l'ombrellone <span className="font-extrabold text-orange-600">N° {selectedSpotNumber}</span>.
                </p>
                
                <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs space-y-2 text-slate-600 border border-slate-100 mb-4">
                  <p className="border-b border-slate-200/60 pb-1"><strong>Data:</strong> {new Date(selectedDate).toLocaleDateString('it-IT')}</p>
                  <p className="border-b border-slate-200/60 pb-1"><strong>Bagnante:</strong> {userData.nome} {userData.cognome}</p>
                  <p className="border-b border-slate-200/60 pb-1"><strong>Componenti:</strong> {userData.numUtenti} persone</p>
                  <p><strong>Tariffa:</strong> {userData.categoria}</p>
                </div>

                <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3.5 mb-6 flex justify-between items-center text-sm shadow-inner">
                  <span className="font-bold text-orange-950 uppercase text-xs tracking-wider">Totale da pagare:</span>
                  <span className="font-black text-lg text-orange-600">{prezzoFinale.toFixed(2)} €</span>
                </div>

                <div className="flex gap-3">
                  <button
                    disabled={isSubmitting}
                    onClick={() => setSelectedSpotNumber(null)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-all text-sm"
                  >
                    Annulla
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handlePaymentAndBooking}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl shadow-md transition-all text-sm flex items-center justify-center min-w-[140px]"
                  >
                    {paymentProcessing ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="text-xs">Circuito Nexi...</span>
                      </div>
                    ) : (
                      "Paga e Conferma"
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
