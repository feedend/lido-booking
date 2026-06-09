'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Costante per identificare al volo le postazioni accessibili
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

  const scaricaRicevutaAutomatica = (postoNum: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Aumentato leggermente l'altezza del canvas per far spazio alla nota legale/militare
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

    // --- AGGIUNTA NOTA DI CONTROLLO PERSONALE MILITARE ---
    ctx.strokeStyle = '#f97316';
    ctx.fillStyle = '#fff7ed';
    ctx.lineWidth = 1;
    // Disegna un box di avviso leggero
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
      // Spostato il QR code sul fondo del nuovo canvas allungato
      ctx.drawImage(qrImg, 110, 425, 180, 180);

      const link = document.createElement('a');
      link.download = `Pass_Ombrellone_${postoNum}_${selectedDate}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

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
              extraLettini: userData.extraLettini,
              prezzoExtra: userData.prezzoExtra
            }),
          });
        } catch (emailErr) {
          console.error("Errore di invio notifica email:", emailErr);
        }

        setBookingSuccess(true);
        setReservedSpots([...reservedSpots, matchingSpot.id]);

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
    const isSelected = selectedSpotNumber === num;
    const isDisabili = POSTI_DISABILI.includes(num);

    return (
      <div
        key={num}
        onClick={() => !isReserved && setSelectedSpotNumber(num)}
        className={`relative w-11 h-14 flex flex-col items-center justify-center transition-all duration-150 select-none shrink-0
          ${isReserved ? 'text-gray-400 cursor-not-allowed' : 'text-orange-950 hover:scale-110 cursor-pointer'}`}
      >
        <svg 
          viewBox="0 0 24 24" 
          className={`w-9 h-9 drop-shadow-sm transition-colors ${
            isReserved 
              ? 'fill-gray-300' 
              : isSelected 
                ? 'fill-orange-600 scale-105' 
                : 'fill-orange-400 hover:fill-orange-500'
          }`}
        >
          <path d="M12 2C6.48 2 2 6.48 2 12h20c0-5.52-4.48-10-10-10z" />
          <path d="M12 2v10M7 4.5L12 12M17 4.5L12 12" stroke="white" strokeWidth="0.5" strokeLinecap="round" />
          <path d="M11.5 12h1v9h-1z" fill="#94a3b8" />
        </svg>

        <span className={`text-[9px] font-black mt-0.5 px-1 rounded bg-white/90 shadow-sm border transition-all flex items-center gap-0.5
          ${isReserved 
            ? 'text-gray-400 border-gray-200' 
            : isSelected 
              ? 'text-orange-600 border-orange-500 ring-1 ring-orange-500/30' 
              : 'text-orange-950 border-orange-100'
          }`}>
          {num}
          {isDisabili && <span title="Postazione Accessibile Riservata" className="text-[9px]">♿</span>}
        </span>

        {isReserved && (
          <div className="absolute top-1.5 w-6 h-6 flex items-center justify-center bg-red-500/90 text-white font-extrabold text-[9px] rounded-full shadow-md">
            ✕
          </div>
        )}

        {isDisabili && !isReserved && !isSelected && (
          <div className="absolute top-0 right-0 w-2 h-2 bg-orange-600 rounded-full border border-white shadow-sm" />
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
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes waveMove {
          0% { transform: translateX(0) translateZ(0) scaleY(1); }
          50% { transform: translateX(-25%) translateZ(0) scaleY(0.85); }
          100% { transform: translateX(-50%) translateZ(0) scaleY(1); }
        }
        .animate-wave-slow {
          animation: waveMove 8s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite;
        }
        .animate-wave-fast {
          animation: waveMove 5s cubic-bezier(0.36, 0.45, 0.63, 0.53) infinite;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-modal {
          animation: modalFadeIn 0.25s ease-out forwards;
        }
      `}} />

      <div className="block md:hidden text-center text-[10px] text-orange-800/70 font-bold uppercase tracking-wider mb-2 animate-pulse">
        ↔ Scorri lateralmente per vedere tutta la spiaggia ↔
      </div>

      <div className="w-full text-center py-3.5 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-2xl shadow-md mb-6 sticky left-0">
        <h2 className="font-black text-white uppercase tracking-wider text-xs sm:text-sm">FRONTE MARE</h2>
        <p className="text-[10px] text-orange-50 font-medium tracking-[0.3em] uppercase mt-0.5">~~~ Mappa della Spiaggia ~~~</p>
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
              
              <div className="w-12 shrink-0 flex justify-center items-center font-black text-amber-900 uppercase text-[9px] tracking-wider bg-amber-100/90 py-2 rounded-xl border border-amber-200/50 shadow-inner">
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

      {/* Modale Riepilogo */}
      {selectedSpotNumber !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl text-center border border-slate-100 overflow-hidden relative animate-modal">
            
            <div className="relative h-20 bg-gradient-to-r from-orange-500 to-amber-500 flex flex-col justify-center items-center text-white overflow-hidden select-none">
              <h3 className="text-base font-black uppercase tracking-wider relative z-10 drop-shadow-sm">
                {bookingSuccess ? "Prenotazione Confermata" : "Riepilogo Postazione"}
              </h3>
              
              <div className="absolute left-0 bottom-0 w-[200%] h-8 pointer-events-none origin-bottom">
                <svg className="absolute left-0 bottom-0 w-full h-full text-white/20 fill-current animate-wave-slow" viewBox="0 0 1200 120" preserveAspectRatio="none">
                  <path d="M0,60 C150,90 350,30 500,60 C650,90 850,30 1000,60 C1150,90 1350,30 1500,60 L1500,120 L0,120 Z"></path>
                </svg>
                <svg className="absolute left-0 bottom-0 w-full h-full text-white fill-current animate-wave-fast" viewBox="0 0 1200 120" preserveAspectRatio="none">
                  <path d="M0,50 C200,80 400,20 600,50 C800,80 1000,20 1200,50 L1200,120 L0,120 Z"></path>
                </svg>
              </div>
            </div>

            <div className="p-6 pt-4">
              {bookingSuccess ? (
                <div className="py-1 flex flex-col items-center">
                  <div className="w-11 h-11 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl mb-3 shadow-sm">✓</div>
                  <p className="text-[11px] text-slate-500 -mt-1 mb-4">Il pass digitale è stato scaricato automaticamente.</p>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner mb-4 w-full text-left">
                    <div className="flex justify-center mb-3">
                      <img src={qrCodeUrl} alt="QR Code" className="w-36 h-36 mix-blend-multiply" />
                    </div>

                    {/* --- BOX DI AVVISO RIGURDO IL CONTROLLO MILITARE A SCHERMO SOPRA IL QR --- */}
                    <div className="mb-3 p-3 bg-orange-50 border border-orange-100 rounded-xl text-[11px] text-orange-950 leading-tight">
                      <strong className="text-orange-700 block mb-0.5 uppercase tracking-wide text-[10px]">Nota di Accesso al Lido:</strong>
                      La categoria dichiarata in fase di prenotazione ed il possesso della <strong className="font-bold">CARTA ESERCITO</strong> verrà controllata all'ingresso del Lido dal personale militare preposto.
                    </div>

                    <div className="pt-2.5 border-t border-slate-200 font-mono text-xs text-slate-800 space-y-1 bg-white p-3 rounded-xl border">
                      <p><strong>DATA:</strong> {new Date(selectedDate).toLocaleDateString('it-IT')}</p>
                      <p className="text-orange-600 font-bold text-sm"><strong>OMBRELLONE N°:</strong> {selectedSpotNumber}</p>
                      
                      <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 text-[11px]">
                        <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Riepilogo Consegna:</p>
                        <p>• 1 Ombrellone + 1 Lettino (Base)</p>
                        {userData.extraSdraio > 0 && <p className="text-emerald-600 font-semibold">• {userData.extraSdraio} Sdraio Extra</p>}
                        {userData.extraLettini > 0 && <p className="text-emerald-600 font-semibold">• {userData.extraLettini} {userData.extraLettini === 1 ? 'Lettino' : 'Lettini'} Extra</p>}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setBookingSuccess(false);
                      setSelectedSpotNumber(null);
                    }}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider shadow"
                  >
                    Chiudi e Torna alla Mappa
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600 mb-4">
                    Stai per riservare l'ombrellone{' '}
                    <span className="font-extrabold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-100">
                      N° {selectedSpotNumber} {POSTI_DISABILI.includes(selectedSpotNumber) ? '♿' : ''}
                    </span>.
                  </p>
                  
                  <div className="bg-slate-50 p-4 rounded-2xl text-left text-xs space-y-2 text-slate-600 border border-slate-100 mb-4">
                    <p className="border-b border-slate-200/60 pb-1"><strong>Data:</strong> {new Date(selectedDate).toLocaleDateString('it-IT')}</p>
                    <p className="border-b border-slate-200/60 pb-1"><strong>Bagnante:</strong> {userData.nome} {userData.cognome}</p>
                    <p className="border-b border-slate-200/60 pb-1"><strong>Componenti:</strong> {userData.numUtenti} persone</p>
                    {userData.prezzoExtra > 0 && (
                      <p className="border-b border-slate-200/60 pb-1 text-emerald-600 font-medium">
                        <strong>Attrezzatura Extra:</strong> {userData.extraSdraio > 0 ? `${userData.extraSdraio} Sdraio ` : ''}{userData.extraLettini > 0 ? `${userData.extraLettini} Lettini` : ''} (+ {userData.prezzoExtra.toFixed(2)}€)
                      </p>
                    )}
                    <p><strong>Tariffa:</strong> {userData.categoria} {POSTI_DISABILI.includes(selectedSpotNumber) ? '(Postazione Accessibile)' : ''}</p>
                  </div>

                  <div className="bg-orange-50 border border-orange-100 rounded-2xl p-3.5 mb-5 flex justify-between items-center text-sm shadow-inner">
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
        </div>
      )}
    </div>
  );
}
