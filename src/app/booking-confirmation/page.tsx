'use client';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// 1. Spostiamo tutta la logica all'interno di un componente interno
function BookingConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!sessionId || hasRun.current) return;
    hasRun.current = true;

    const finalizeBooking = async () => {
  try {
    // 1. Chiediamo a Stripe i dati della sessione per recuperare il booking_id
    const res = await fetch(`/api/verify-session?session_id=${sessionId}`);
    if (!res.ok) throw new Error("Verifica sessione fallita");
    
    const sessionData = await res.json();
    const bookingId = sessionData.metadata?.booking_id;

    if (!bookingId) {
      throw new Error("ID Prenotazione non trovato nei metadati di Stripe");
    }

    // 2. Recuperiamo la prenotazione esistente unendo i dati della tabella 'spots'
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        spots (
          internal_code
        )
      `)
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchError || !booking) {
      throw new Error("Impossibile trovare la prenotazione nel database");
    }

    // 3. Mappiamo i dati per renderli compatibili al 100% con il tuo Canvas e JSX
    const fullData = {
      ...booking,
      guest_nome: booking.guest_nome || booking.guest_first_name || 'Ospite',
      guest_cognome: booking.guest_cognome || booking.guest_last_name || '',
      spot_number: booking.spots?.internal_code || 'N/D'
    };

    // 4. Se la prenotazione è già confermata, mostriamo i dati senza fare doppi update
    if (booking.status === 'confirmed') {
      setBookingDetails(fullData);
      setStatus('success');
      return;
    }

    // 5. Se è ancora 'pending', la aggiorniamo a 'confirmed' visto che Stripe ha incassato
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // 6. Inviamo l'email di conferma con i dati reali del DB
    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: booking.guest_email?.trim(),
          nome: fullData.guest_nome,
          cognome: fullData.guest_cognome,
          data: new Date(booking.booking_date).toLocaleDateString('it-IT'),
          ombrellone: fullData.spot_number,
          prezzo: parseFloat(booking.total_price || 0).toFixed(2),
          utenti: booking.num_guests,
          categoria: booking.booking_category,
          extraSdraio: booking.extra_sdraio,
          extraLettini: booking.extra_lettini,
          prezzoExtra: 0
        }),
      });
    } catch (emailErr) {
      console.error("Errore invio email post-pagamento:", emailErr);
    }

    // 7. Aggiorniamo lo stato dell'interfaccia per mostrare il QR code
    setBookingDetails(fullData);
    setStatus('success');

    // 8. Lanciamo il download automatico del pass generato sul Canvas
    setTimeout(() => {
      scaricaRicevutaAutomatica(fullData);
    }, 800);

  } catch (err) {
    console.error("Errore nel completamento del booking:", err);
    setStatus('error');
  }
};
    finalizeBooking();
  }, [sessionId]);

  const scaricaRicevutaAutomatica = (meta: any) => {
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
    ctx.fillText(`DATA: ${new Date(meta.booking_date).toLocaleDateString('it-IT')}`, 40, 115);
    ctx.fillText(`TITOLARE: ${meta.guest_nome.toUpperCase()} ${meta.guest_cognome.toUpperCase()}`, 40, 135);
    ctx.fillText(`CATEGORIA: ${meta.booking_category}`, 40, 155);
    
    ctx.fillStyle = '#ea580c';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(`OMBRELLONE N°: ${meta.spot_number}`, 40, 190);

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
    if (parseInt(meta.extra_sdraio) > 0) {
      ctx.fillStyle = '#16a34a'; 
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`• ${meta.extra_sdraio} Sdraio EXTRA`, 50, currentY);
      currentY += 20;
    }
    if (parseInt(meta.extra_lettini) > 0) {
      ctx.fillStyle = '#16a34a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText(`• ${meta.extra_lettini} Lettini EXTRA`, 50, currentY);
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

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`LIDO_SANTA_SEVERA|DATA:${meta.booking_date}|POSTO:${meta.spot_number}|EMAIL:${meta.guest_email}`)}`;

    const qrImg = new Image();
    qrImg.crossOrigin = 'anonymous'; 
    qrImg.src = qrCodeUrl;
    qrImg.onload = () => {
      ctx.drawImage(qrImg, 110, 425, 180, 180);
      const link = document.createElement('a');
      link.download = `Pass_Ombrellone_${meta.spot_number}_${meta.booking_date}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
        <h2 className="text-lg font-bold text-slate-700">Elaborazione e conferma del pagamento...</h2>
        <p className="text-sm text-slate-500 text-center max-w-xs mt-1">Non chiudere o aggiornare questa pagina.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-3xl mb-4 shadow-sm">✕</div>
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-wide">Qualcosa è andato storto</h2>
        <p className="text-sm text-slate-500 max-w-sm mt-2 mb-6">Si è verificato un errore durante la registrazione della prenotazione. Contatta l'assistenza.</p>
        <button onClick={() => router.push('/')} className="bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 px-6 rounded-xl text-xs uppercase tracking-wider shadow">Torna alla Home</button>
      </div>
    );
  }

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`LIDO_SANTA_SEVERA|DATA:${bookingDetails.booking_date}|POSTO:${bookingDetails.spot_number}|EMAIL:${bookingDetails.guest_email}`)}`;

  return (
    <div className="min-h-screen bg-amber-50/20 py-12 px-4 flex items-center justify-center">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl text-center border border-slate-100 overflow-hidden relative">
        <div className="relative h-20 bg-gradient-to-r from-orange-500 to-amber-500 flex flex-col justify-center items-center text-white overflow-hidden select-none">
          <h3 className="text-base font-black uppercase tracking-wider relative z-10 drop-shadow-sm">Prenotazione Confermata</h3>
        </div>

        <div className="p-6 pt-5">
          <div className="py-1 flex flex-col items-center">
            <div className="w-11 h-11 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-xl mb-3 shadow-sm">✓</div>
            <p className="text-[11px] text-slate-500 -mt-1 mb-4">Il pagamento è andato a buon fine. Il pass è in download.</p>
            
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-inner mb-5 w-full text-left">
              <div className="flex justify-center mb-3">
                <img src={qrCodeUrl} alt="QR Code" className="w-36 h-36 mix-blend-multiply" />
              </div>

              <div className="mb-3 p-3 bg-orange-50 border border-orange-100 rounded-xl text-[11px] text-orange-950 leading-tight">
                <strong className="text-orange-700 block mb-0.5 uppercase tracking-wide text-[10px]">Nota di Accesso al Lido:</strong>
                La categoria dichiarata ed il possesso della <strong className="font-bold">CARTA ESERCITO</strong> verrà controllata all'ingresso dal personale militare preposto.
              </div>

              <div className="pt-2.5 border-t border-slate-200 font-mono text-xs text-slate-800 space-y-1 bg-white p-3 rounded-xl border">
                <p><strong>DATA:</strong> {new Date(bookingDetails.booking_date).toLocaleDateString('it-IT')}</p>
                <p className="text-orange-600 font-bold text-sm"><strong>OMBRELLONE N°:</strong> {bookingDetails.spot_number}</p>
                
                <div className="mt-2.5 pt-2 border-t border-dashed border-slate-200 text-[11px]">
                  <p className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mb-1">Riepilogo Consegna:</p>
                  <p>• 1 Ombrellone + 1 Lettino (Base)</p>
                  {parseInt(bookingDetails.extra_sdraio) > 0 && <p className="text-emerald-600 font-semibold">• {bookingDetails.extra_sdraio} Sdraio Extra</p>}
                  {parseInt(bookingDetails.extra_lettini) > 0 && <p className="text-emerald-600 font-semibold">• {bookingDetails.extra_lettini} Lettini Extra</p>}
                </div>
              </div>
            </div>

            <button onClick={() => router.push('/')} className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all text-xs uppercase tracking-wider shadow">Torna alla Mappa</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 2. L'export di default della pagina avvolge il contenuto dentro <Suspense>
export default function BookingConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
        <h2 className="text-lg font-bold text-slate-700">Inizializzazione sessione di conferma...</h2>
      </div>
    }>
      <BookingConfirmationContent />
    </Suspense>
  );
}
