'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const POSTI_DISABILI = [30, 51, 70, 91];

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
    extraLettini: number; 
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

  const calcolaPrezzoTotale = () => {
    const quotaBaseOmbrellone = 2.0;
    const quotaBaseSdraio = 1.5; 
    
    let supplementoPersona = 0.0;
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

  const scaricaRicevutaAutomatica = (postoNum: number) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 400;
    canvas.height = 620;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ea580c';
    ctx.fillRect(0, 0, canvas.width, 85);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('STABILIMENTO BALNEARE SANTA SEVERA', 200, 35);
    ctx.font = '11px sans-serif';
    ctx.fillText('PASS DI ACCESSO GIORNALIERO', 200, 58);

    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'left';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`DATA: ${new Date(selectedDate).toLocaleDateString('it-IT')}`, 40, 115);
    ctx.fillText(`TITOLARE: ${userData.nome.toUpperCase()} ${userData.cognome.toUpperCase()}`, 40, 135);
    ctx.fillText(`CATEGORIA: ${userData.categoria}`, 40, 155);
    
    ctx.fillStyle = '#ea580c';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`OMBRELLONE N°: ${postoNum}`, 40, 190);

    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 205);
    ctx.lineTo(360, 205);
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('DOTAZIONE DA CONSEGNARE:', 40, 225);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('• 1 Ombrellone Standard (Incluso)', 50, 245);
    ctx.fillText('• 1 Lettino Standard (Incluso)', 50, 265);

    let currentY = 285;
    if (userData.extraSdraio > 0) {
      ctx.fillStyle = '#16a34a'; 
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`• ${userData.extraSdraio} Sdraio EXTRA`, 50, currentY);
      currentY += 20;
    }
    if (userData.extraLettini > 0) {
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`• ${userData.extraLettini} Lettini EXTRA`, 50, currentY);
      currentY += 20;
    }

    ctx.strokeStyle = '#f97316';
    ctx.fillStyle = '#fff7ed';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(40, currentY, 320, 54, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#c2410c';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('ATTENZIONE CONTROLLO ACCESSO:', 48, currentY + 16);
    
    ctx.fillStyle = '#431407';
    ctx.font = '9px sans-serif';
    ctx.fillText('La categoria dichiarata in fase di prenotazione ed il possesso della', 48, currentY + 30);
    ctx.fillText('CARTA ESERCITO verranno controllati all\'ingresso del Lido dal', 48, currentY + 41);
    ctx.fillText('personale militare preposto.', 48, currentY + 52);

    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous'; 
    qrImg.src = qrCodeUrl;
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 110, 425, 180, 180);

      const link = document.createElement('a');
      link.download = `Pass_Ombrellone_${postoNum}_${selectedDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  // LOGICA FITTIZIA ORIGINALE RIPRISTINATA
  const handlePaymentAndBooking = async () => {
    if (selectedSpotNumber === null) return;
    
    const extraTotati = (userData.extraSdraio || 0) + (userData.extraLettini || 0);
    if (extraTotati > 3) {
      alert("Configurazione extra non valida. Puoi selezionare al massimo 3 pezzi totali tra Sdraio e Lettini aggiuntivi.");
      return;
    }
    
    setIsSubmitting(true);
    setPaymentProcessing(true);

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
        .select('guest_email')
        .eq('booking_date', selectedDate)
        .not('status', 'eq', 'cancelled');

      if (fetchError) {
        alert("Errore controllo prenotazioni: " + fetchError.message);
        setPaymentProcessing(false);
        setIsSubmitting(false);
        return;
      }

      const haGiaPrenotato = existingBookings?.some(b => b.guest_email?.toLowerCase() === userData.email.toLowerCase());
      if (haGiaPrenotato) {
        alert(`Attenzione! Risulta già una prenotazione attiva a nome di ${userData.email} per la data selezionata.`);
        setPaymentProcessing(false);
        setIsSubmitting(false);
        setSelectedSpotNumber(null);
        return;
      }

      // Simulazione locale dell'attesa di pagamento (3 secondi fittizi)
      setTimeout(async () => {
        try {
          const { error: insertError } = await supabase
            .from('bookings')
            .insert([{
              spot_id: matchingSpot.id,
              booking_date: selectedDate,
              guest_nome: userData.nome,
              guest_cognome: userData.cognome,
              guest_email: userData.email,
              guest_phone: userData.telefono || null,
              num_guests: userData.numUtenti,
              booking_category: userData.categoria,
              extra_sdraio: userData.extraSdraio,
              extra_lettini: userData.extraLettini,
              total_price: prezzoFinale,
              status: 'confirmed'
            }]);

          if (insertError) {
            alert("Errore nel salvataggio: " + insertError.message);
          } else {
            setBookingSuccess(true);
            setReservedSpots(prev => [...prev, matchingSpot.id]);
            scaricaRicevutaAutomatica(selectedSpotNumber);
          }
        } catch (err: any) {
          alert("Errore DB: " + err.message);
        } finally {
          setPaymentProcessing(false);
          setIsSubmitting(false);
        }
      }, 3000);

    } catch (err: any) {
      alert(err.message || "Si è verificato un errore critico durante la transazione.");
      setPaymentProcessing(false);
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
    const isSelected = selectedSpotNumber === num;
    const isDisabili = POSTI_DISABILI.includes(num);

    return (
      <div
        key={num}
        onClick={() => !isReserved && setSelectedSpotNumber(num)}
        className={`relative w-11 h-14 flex flex-col items-center justify-center transition-all duration-150 select-none shrink-0
          ${isReserved ? 'text-gray-400 cursor-not-allowed' : 'text-orange-950 hover:scale-110 cursor-pointer'}`}
      >
        <svg viewBox="0 0 24 24" className={`w-9 h-9 drop-shadow-sm transition-colors ${isReserved ? 'fill-gray-300' : isSelected ? 'fill-orange-600 scale-105' : 'fill-orange-400 hover:fill-orange-500'}`}>
          <path d="M12 2C6.48 2 2 6.48 2 12h20c0-5.52-4.48-10-10-10z" />
          <path d="M12 2v10M7 4.5L12 12M17 4.5L12 12" stroke="white" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M11.5 12h1v9h-1z" fill="#94a3b8" />
        </svg>
        <span className={`text-[9px] font-black mt-0.5 px-1 rounded bg-white/90 shadow-sm border transition-all flex items-center gap-0.5 ${isReserved ? 'text-gray-400 border-gray-200' : isSelected ? 'text-orange-600 border-orange-500 ring-1 ring-orange-500/30' : 'text-orange-950 border-orange-100'}`}>
          {num}
          {isDisabili && <span title="Postazione Accessibile Riservata" className="text-[9px]">♿</span>}
        </span>
        {isReserved && <div className="absolute top-1.5 w-6 h-6 flex items-center justify-center bg-red-500/90 text-white font-extrabold text-[9px] rounded-full shadow-md">✕</div>}
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
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes waveMove { 0% { transform: translateX(0) translateZ(0) scaleY(1); } 50% { transform: translateX(-25%) translateZ(0) scaleY(0.85); } 100% { transform: translateX(-50%) translateZ(0) scaleY(1); } }
        .animate-wave-slow { animation: waveMove 8s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite; }
        .animate-wave-fast { animation: waveMove 5s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite; }
        @keyframes modalFadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-modal { animation: modalFadeIn 0.25s ease-out forwards; }
      `}} />

      <div className="w-full text-center py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-2xl shadow-md mb-6 sticky left-0">
        <h2 className="font-black text-white uppercase tracking-wider text-xs sm:text-sm">FRONTE MARE</h2>
      </div>

      <div className="w-full overflow-x-auto pb-4 rounded-xl">
        <div className="flex flex-col gap-3 w-[960px] mx-auto pl-2 pr-4">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-center justify-start gap-4">
              <div className="w-[430px] grid grid-cols-10 gap-0.5 justify-items-start">
                {row.startL ? (
                  <>
                    {Array.from({ length: 10 - (row.endL! - row.startL! + 1) }).map((_, i) => <div key={`empty-l-${i}`} className="w-10 h-14 opacity-0 pointer-events-none" />)}
                    {Array.from({ length: row.endL! - row.startL! + 1 }, (_, i) => row.startL! + i).map(renderSpot)}
                  </>
                ) : (
                  Array.from({ length: 10 }).map((_, i) => <div key={`blank-l-${i}`} className="w-10 h-14" />)
                )}
              </div>
              <div className="w-12 shrink-0 flex justify-center items-center font-black text-amber-900 uppercase text-[9px] bg-amber-100/90 py-2 rounded-xl border">{row.center || "•"}</div>
              <div className="w-[430px] grid grid-cols-10 gap-0.5 justify-items-start">
                {row.startR ? (
                  <>
                    {Array.from({ length: row.endR! - row.startR! + 1 }, (_, i) => row.startR! + i).map(renderSpot)}
                    {Array.from({ length: 10 - (row.endR! - row.startR! + 1) }).map((_, i) => <div key={`empty-r-${i}`} className="w-10 h-14 opacity-0 pointer-events-none" />)}
                  </>
                ) : (
                  Array.from({ length: 10 }).map((_, i) => <div key={`blank-r-${i}`} className="w-10 h-14" />)
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedSpotNumber !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl text-center border overflow-hidden relative animate-modal">
            <div className="relative h-20 bg-gradient-to-r from-orange-500 to-amber-500 flex flex-col justify-center items-center text-white select-none">
              <h3 className="text-base font-black uppercase tracking-wider relative z-10">{bookingSuccess ? "Prenotazione Confermata" : "Riepilogo Postazione"}</h3>
              <div className="absolute left-0 bottom-0 w-[200%] h-8 pointer-events-none origin-bottom">
                <svg className="absolute left-0 bottom-0 w-full h-full text-white/20 fill-current animate-wave-slow" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,60 C150,90 350,30 500,60 C650,90 850,30 1000,60 C1150,90 1350,30 1500,60 L1500,120 L0,120 Z"></path></svg>
              </div>
            </div>

            <div className="p-6 pt-4">
              {bookingSuccess ? (
                <div className="py-1 flex flex-col items-center">
                  <div className="w-11 h-11 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl mb-3 shadow-sm">✓</div>
                  <p className="text-[11px] text-slate-500 -mt-1 mb-4">Il pass digitale è stato memorizzato correttamente.</p>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner mb-4 w-full text-left">
                    <div className="flex justify-center mb-3">
                      <img src={qrCodeUrl} alt="QR Code" className="w-36 h-36 mix-blend-multiply" />
                    </div>

                    <div className="mb-3 p-3 bg-orange-50 border border-orange-100 rounded-xl text-[11px] text-orange-950 leading-tight">
                      <strong className="text-orange-700 block mb-0.5 uppercase tracking-wide text-[10px]">Nota di Accesso al Lido:</strong>
                      La categoria dichiarata in fase di prenotazione ed il possesso della <strong className="font-bold">CARTA ESERCITO</strong> verrà controllata all'ingresso del Lido dal personale militare preposto.
                    </div>

                    <div className="pt-2.5 border-t border-slate-200 font-mono text-xs text-slate-800 space-y-1 bg-white p-3 rounded-xl border">
                      <p><strong>DATA:</strong> {new Date(selectedDate).toLocaleDateString('it-IT')}</p>
                      <p className="text-orange-600 font-bold text-sm"><strong>OMBRELLONE N°:</strong> {selectedSpotNumber}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setBookingSuccess(false);
                      setSelectedSpotNumber(null);
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider"
                  >
                    Chiudi e Torna alla Mappa
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-4">Stai per riservare l'ombrellone <span className="font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border">N° {selectedSpotNumber}</span>.</p>
                  <div className="bg-orange-50 border rounded-2xl p-3.5 mb-5 flex justify-between items-center text-sm">
                    <span className="font-bold text-orange-950 uppercase text-xs">Totale da pagare:</span>
                    <span className="font-black text-lg text-orange-600">{prezzoFinale.toFixed(2)} €</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setSelectedSpotNumber(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm">Annulla</button>
                    <button disabled={isSubmitting} onClick={handlePaymentAndBooking} className="flex-1 bg-orange-500 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center">
                      {paymentProcessing ? "Elaborazione..." : "Paga e Conferma"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
