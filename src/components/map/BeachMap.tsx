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
    telefono?: string;
    extraSdraio: number;    
    extraSpiaggine: number;  
    prezzoExtra: number;     
  };
};

interface DBSpot {
  id: string;
  internal_code: string;
  is_available: boolean;
}

export default function BeachMap({ selectedDate, userData }: BeachMapProps) {
  const [reservedSpots, setReservedSpots] = useState<string[]>([]); 
  const [dbSpots, setDbSpots] = useState<DBSpot[]>([]);
  const [selectedSpotNumber, setSelectedSpotNumber] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadBeachData = async () => {
      setIsLoading(true);
      try {
        const { data: spotsData } = await supabase
          .from('spots')
          .select('id, internal_code, is_available')
          .eq('is_active', true); 
        
        if (spotsData) {
          setDbSpots(spotsData);
        }

        const { data: bookingsData } = await supabase
          .from('bookings')
          .select('spot_id, status, booking_category') 
          .eq('booking_date', selectedDate)
          .not('status', 'eq', 'cancelled');

        if (bookingsData && spotsData) {
          const occupatiIds = bookingsData
            .map(b => b.spot_id)
            .filter(id => id !== null) as string[];
          
          setReservedSpots(occupatiIds);
        }
      } catch (err) {
        console.error("Errore nel caricamento dei dati della spiaggia:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadBeachData();
  }, [selectedDate]);

  // Calcolo dinamico del prezzo basato sulle tariffe ufficiali + supplementi extra
  const calcolaPrezzoTotale = () => {
    const quotaBaseOmbrellone = 2.0;
    const quotaBaseSdraio = 1.5; 
    
    let supplementoPersona = 0.0;
    // RISOLTO BUG DI COMPILAZIONE: Legge correttamente da userData.categoria
    const catLower = userData.categoria ? userData.categoria.toLowerCase().trim() : '';

    if (catLower.includes('parenti')) {
      supplementoPersona = 1.5;
    } else if (catLower === 'esercito') {
      supplementoPersona = 1.5;
    } else if (catLower.includes('altra forza armata')) {
      supplementoPersona = 3.5;
    } else if (catLower.includes('quiescenza')) {
      supplementoPersona = 3.5;
    } else if (catLower === 'giornaliero') {
      supplementoPersona = 3.5;
    }
    
    const costoStrutturaBase = quotaBaseOmbrellone + quotaBaseSdraio;
    const costoComponenti = userData.numUtenti * supplementoPersona;
    
    return costoStrutturaBase + costoComponenti + (userData.prezzoExtra || 0);
  };
  const prezzoFinale = calcolaPrezzoTotale();

  const qrCodeUrl = selectedSpotNumber 
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`LIDO_SANTA_SEVERA|DATA:${selectedDate}|POSTO:${selectedSpotNumber}|EMAIL:${userData.email}`)}`
    : '';

  // Genera un'immagine PNG completa unendo QR Code e dettagli degli extra, forzando il download
  const scaricaRicevutaAutomatica = (postoNum: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 560;

    // Sfondo Bianco
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Intestazione
    ctx.fillStyle = '#0ea5e9';
    ctx.fillRect(0, 0, canvas.width, 85);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STABILIMENTO BALNEARE SANTA SEVERA', 200, 35);
    ctx.font = '11px sans-serif';
    ctx.fillText('PASS DI ACCESSO GIORNALIERO', 200, 58);

    // Dettagli Prenotazione
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`DATA: ${new Date(selectedDate).toLocaleDateString('it-IT')}`, 40, 125);
    ctx.fillText(`TITOLARE: ${userData.nome.toUpperCase()} ${userData.cognome.toUpperCase()}`, 40, 150);
    ctx.fillText(`CATEGORIA: ${userData.categoria}`, 40, 175);
    
    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`OMBRELLONE N°: ${postoNum}`, 40, 210);

    // Linea Divisoria
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 230);
    ctx.lineTo(360, 230);
    ctx.stroke();

    // Elenco Attrezzatura per il Personale
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('DOTAZIONE DA CONSEGNARE:', 40, 255);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('• 1 Ombrellone Standard (Incluso)', 50, 280);
    ctx.fillText('• 1 Sdraio Standard (Incluso)', 50, 300);

    let currentY = 320;
    if (userData.extraSdraio > 0) {
      ctx.fillStyle = '#16a34a'; 
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`• ${userData.extraSdraio} Sdraio EXTRA`, 50, currentY);
      currentY += 20;
    }
    if (userData.extraSpiaggine > 0) {
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`• ${userData.extraSpiaggine} Spiaggine EXTRA`, 50, currentY);
    }

    // Caricamento asincrono del QR per non corrompere il Canvas
    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous'; 
    qrImg.src = qrCodeUrl;
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 110, 360, 180, 180);

      // Trigger automatico download del file immagine
      const link = document.createElement('a');
      link.download = `Pass_Ombrellone_${postoNum}_${selectedDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  const handlePaymentAndBooking = async () => {
    if (selectedSpotNumber === null) return;
    
    setPaymentProcessing(true);
    setIsSubmitting(true);

    try {
      const matchingSpot = dbSpots.find(s => parseInt(s.internal_code) === selectedSpotNumber);
      if (!matchingSpot) {
        alert("Errore nella configurazione della postazione.");
        setIsSubmitting(false);
        setPaymentProcessing(false);
        return;
      }

      const { data: existingBookings, error: fetchError } = await supabase
        .from('bookings')
        .select('guest_email, booking_category')
        .eq('booking_date', selectedDate)
        .not('status', 'eq', 'cancelled');

      if (fetchError) {
        alert("Errore controllo prenotazioni: " + fetchError.message);
        setPaymentProcessing(false);
        setIsSubmitting(false);
        return;
      }

      const haGiaPrenotato = existingBookings?.some(b => {
        return b.guest_email?.toLowerCase() === userData.email.toLowerCase();
      });

      if (haGiaPrenotato) {
        alert(`Attenzione! Risulta già una prenotazione attiva a nome di ${userData.email} per la data selezionata.`);
        setPaymentProcessing(false);
        setIsSubmitting(false);
        setSelectedSpotNumber(null);
        return;
      }

      // Nexi Gateway Simulation
      await new Promise((resolve) => setTimeout(resolve, 3000));
      setPaymentProcessing(false); 

      const { error } = await supabase
        .from('bookings')
        .insert([
          {
            booking_date: selectedDate,
            num_guests: userData.numUtenti,
            spot_id: matchingSpot.id,               
            user_id: null,                                    
            total_price: prezzoFinale,              
            booking_category: userData.categoria,   
            status: 'confirmed',
            guest_first_name: userData.nome,
            guest_last_name: userData.cognome,
            guest_email: userData.email,
            guest_phone: userData.telefono || null
          }
        ]);

      if (error) {
        alert("Errore durante il salvataggio a database: " + error.message);
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
              categoria: userData.categoria,
              extraSdraio: userData.extraSdraio,
              extraSpiaggine: userData.extraSpiaggine,
              prezzoExtra: userData.prezzoExtra
            }),
          });
        } catch (emailErr) {
          console.error("Errore di invio notifica email:", emailErr);
        }

        setBookingSuccess(true);
        setReservedSpots([...reservedSpots, matchingSpot.id]);

        // Esecuzione download automatico ticket
        setTimeout(() => {
          scaricaRicevutaAutomatica(matchingSpot.internal_code);
        }, 600);
      }
    } catch (err) {
      alert("Si è verificato un errore critico durante la transazione.");
      setPaymentProcessing(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const rows = [
    { startL: 1, endL: 10, startR: 11, endR: 20, center: "Bagnino" },
    { startL: 21, endL: 30, startR: 31, endR: 40, center: "P" },
    { startL: 41, endL: 50, startR: 51, endR: 60, center: "A" },
    { startL: 61, endL: 70, startR: 71, endR: 80, center: "S" },
    { startL: 81, endL: 90, startR: 91, endR: 100, center: "S" },
    { startL: 101, endL: 110, startR: 111, endR: 120, center: "E" },
    { startL: 121, endL: 129, startR: 130, endR: 139, center: "R" },
    { startL: 140, endL: 146, startR: 147, endR: 154, center: "E" },
    { startL: 155, endL: 160, startR: 161, endR: 167, center: "L" },
    { startL: null, endL: null, startR: 168, endR: 171, center: "L" },
    { startL: null, endL: null, startR: 172, endR: 174, center: "A" },
  ];

  const renderSpot = (num: number) => {
    const correspondingDbSpot = dbSpots.find(s => parseInt(s.internal_code) === num);
    if (!correspondingDbSpot) return <div key={num} className="w-11 h-14 opacity-10 pointer-events-none" />;

    const isDbReserved = reservedSpots.includes(correspondingDbSpot.id);
    const isDeactivatedByAdmin = correspondingDbSpot.is_available === false;
    const isReserved = isDbReserved || isDeactivatedByAdmin;

    return (
      <div
        key={num}
        onClick={() => !isReserved && setSelectedSpotNumber(num)}
        className={`relative w-11 h-14 flex flex-col items-center justify-center transition-all duration-150 select-none shrink-0
          ${isReserved ? 'text-gray-400 cursor-not-allowed' : 'text-sky-800 hover:scale-110 cursor-pointer'}`}
      >
        <svg 
          viewBox="0 0 24 24" 
          className={`w-9 h-9 drop-shadow-sm transition-colors ${isReserved ? 'fill-gray-300' : 'fill-sky-400 hover:fill-sky-500'}`}
        >
          <path d="M12 2C6.48 2 2 6.48 2 12h20c0-5.52-4.48-10-10-10z" />
          <path d="M12 2v10M7 4.5L12 12M17 4.5L12 12" stroke="white" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M11.5 12h1v9h-1z" fill="#94a3b8" />
        </svg>

        <span className={`text-[9px] font-black mt-0.5 px-1 rounded bg-white/90 shadow-sm border
          ${isReserved ? 'text-gray-400 border-gray-200' : 'text-sky-950 border-sky-100'}`}>
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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500 mb-4"></div>
        <p className="text-sm font-semibold text-slate-600">Sincronizzazione spiaggia...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto bg-amber-50/40 p-4 sm:p-6 rounded-3xl shadow-xl border border-sky-100/70 relative">
      <div className="block md:hidden text-center text-[10px] text-sky-800/70 font-bold uppercase tracking-wider mb-2 animate-pulse">
        ↔ Scorri lateralmente per vedere tutta la spiaggia ↔
      </div>

      <div className="w-full text-center py-3.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-600 rounded-2xl shadow-md mb-6 sticky left-0">
        <h2 className="font-black text-white uppercase tracking-wider text-xs sm:text-sm">FRONTE MARE</h2>
        <p className="text-[10px] text-cyan-50 font-medium tracking-[0.3em] uppercase mt-0.5">~~~ Mappa della Spiaggia ~~~</p>
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

      {/* Modale Riepilogo e Pagamento */}
      {selectedSpotNumber !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center border border-slate-100">
            {bookingSuccess ? (
              <div className="py-2 flex flex-col items-center">
                <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-2xl mb-3">✓</div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Prenotazione Confermata</h3>
                <p className="text-[11px] text-slate-500 mt-1 mb-4">Il pass digitale è stato scaricato automaticamente.</p>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner mb-4 w-full text-left">
                  <div className="flex justify-center mb-3">
                    <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 mix-blend-multiply" />
                  </div>
                  <div className="pt-2.5 border-t border-slate-200 font-mono text-xs text-slate-800 space-y-1 bg-white p-3 rounded-xl border">
                    <p><strong>DATA:</strong> {new Date(selectedDate).toLocaleDateString('it-IT')}</p>
                    <p className="text-sky-600 font-bold text-sm"><strong>OMBRELLONE N°:</strong> {selectedSpotNumber}</p>
                    
                    {/* Visualizzazione Extra anche all'interno della modale di successo */}
                    <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 text-[11px]">
                      <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Riepilogo Consegna:</p>
                      <p>• 1 Ombrellone + 1 Sdraio (Base)</p>
                      {userData.extraSdraio > 0 && <p className="text-emerald-600 font-semibold">• {userData.extraSdraio} Sdraio Extra</p>}
                      {userData.extraSpiaggine > 0 && <p className="text-emerald-600 font-semibold">• {userData.extraSpiaggine} Spiaggine Extra</p>}
                    </div>
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
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Riepilogo e Pagamento</h3>
                <p className="text-sm text-slate-600 mb-4">Stai per riservare l'ombrellone <span className="font-extrabold text-sky-600">N° {selectedSpotNumber}</span>.</p>
                
                <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs space-y-2 text-slate-600 border border-slate-100 mb-4">
                  <p className="border-b border-slate-200/60 pb-1"><strong>Data:</strong> {new Date(selectedDate).toLocaleDateString('it-IT')}</p>
                  <p className="border-b border-slate-200/60 pb-1"><strong>Bagnante:</strong> {userData.nome} {userData.cognome}</p>
                  <p className="border-b border-slate-200/60 pb-1"><strong>Componenti:</strong> {userData.numUtenti} persone</p>
                  {userData.prezzoExtra > 0 && (
                    <p className="border-b border-slate-200/60 pb-1 text-emerald-600 font-medium">
                      <strong>Attrezzatura Extra:</strong> {userData.extraSdraio > 0 ? `${userData.extraSdraio} Sdraio ` : ''}{userData.extraSpiaggine > 0 ? `${userData.extraSpiaggine} Spiaggine` : ''} (+ {userData.prezzoExtra.toFixed(2)}€)
                    </p>
                  )}
                  <p><strong>Tariffa:</strong> {userData.categoria}</p>
                </div>

                <div className="bg-sky-50 border border-sky-100 rounded-2xl p-3.5 mb-6 flex justify-between items-center text-sm shadow-inner">
                  <span className="font-bold text-sky-950 uppercase text-xs tracking-wider">Totale da pagare:</span>
                  <span className="font-black text-lg text-sky-600">{prezzoFinale.toFixed(2)} €</span>
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
                    className="flex-1 bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl shadow-md transition-all text-sm flex items-center justify-center min-w-[140px]"
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
