'use client';
import React, { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Html5Qrcode } from 'html5-qrcode';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

interface BookingDetails {
  id: string;
  booking_date: string;
  internal_code: string;
  guest_name: string;
  guest_email: string;
  booking_category: string;
  status: string;
}

export default function OperatorDashboard() {
  const [loading, setLoading] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    message: string;
    details?: BookingDetails;
  } | null>(null);

  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    html5QrcodeRef.current = scanner;

    startCamera(scanner);

    return () => {
      if (scanner.isScanning) {
        scanner.stop()
          .then(() => console.log("Fotocamera spenta correttamente."))
          .catch(err => console.error("Errore nel distruggere lo scanner:", err));
      }
    };
  }, []);

  const startCamera = async (scannerInstance: Html5Qrcode) => {
    try {
      setLoading(true);
      await scannerInstance.start(
        { facingMode: "environment" },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        async (decodedText) => {
          await handleQrScanned(decodedText, scannerInstance);
        },
        (errorMessage) => {}
      );
      
      setIsCameraReady(true);
    } catch (err) {
      console.error("Errore di inizializzazione hardware camera:", err);
      setIsCameraReady(false);
    } finally {
      setLoading(false);
    }
  };

  const handleQrScanned = async (qrData: string, scannerInstance: Html5Qrcode) => {
    if (loading) return;

    try {
      if (scannerInstance.isScanning) {
        await scannerInstance.stop();
      }
      setIsCameraReady(false);
      await validaEInvalidaTicket(qrData);
    } catch (error) {
      console.error("Errore nel blocco della fotocamera:", error);
    }
  };

  const validaEInvalidaTicket = async (qrData: string) => {
    setLoading(true);
    setVerificationStatus(null);

    try {
      const parts = qrData.split('|');
      if (parts[0] !== 'LIDO_SANTA_SEVERA') {
        setVerificationStatus({
          success: false,
          message: "QR Code non valido o non appartenente a questo stabilimento."
        });
        return;
      }

      const dataPart = parts.find(p => p.startsWith('DATA:'))?.replace('DATA:', '');
      const postoPart = parts.find(p => p.startsWith('POSTO:'))?.replace('POSTO:', '');
      const emailPart = parts.find(p => p.startsWith('EMAIL:'))?.replace('EMAIL:', '');

      if (!dataPart || !postoPart || !emailPart) {
        setVerificationStatus({
          success: false,
          message: "Struttura del QR corrotta o incompleta."
        });
        return;
      }

      // Eseguiamo la query relazionale (assegnando un tipo locale any per evitare conflitti TypeScript sull'inner join)
      const { data: bookings, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          id,
          booking_date,
          status,
          booking_category,
          guest_first_name,
          guest_last_name,
          guest_email,
          created_at,
          spots!inner ( internal_code )
        `)
        .eq('booking_date', dataPart)
        .eq('guest_email', emailPart)
        .eq('spots.internal_code', postoPart);

      if (fetchError || !bookings || bookings.length === 0) {
        setVerificationStatus({
          success: false,
          message: `Nessuna prenotazione trovata per l'Ombrellone N° ${postoPart} in data ${new Date(dataPart).toLocaleDateString('it-IT')}.`
        });
        return;
      }

      const booking = bookings[0] as any;
      const dbInternalCode = booking.spots?.internal_code || postoPart;

      // CONTROLLO TIMEOUT 15 MINUTI SE ANCORA PENDING
      if (booking.status === 'pending') {
        const quindiciMinutiFa = new Date(Date.now() - 15 * 60 * 1000);
        const createdAtDate = new Date(booking.created_at);
        
        if (createdAtDate < quindiciMinutiFa) {
          setVerificationStatus({
            success: false,
            message: "❌ Prenotazione scaduta! Il cliente ha abbandonato il pagamento oltre 15 minuti fa.",
          });
          return;
        }
      }

      if (booking.status === 'checked_in') {
        setVerificationStatus({
          success: false,
          message: "⚠️ ATTENZIONE: Questo QR Code è già STATO UTILIZZATO per l'ingresso!",
          details: {
            id: booking.id,
            booking_date: booking.booking_date,
            internal_code: dbInternalCode,
            guest_name: `${booking.guest_first_name || ''} ${booking.guest_last_name || ''}`,
            guest_email: booking.guest_email,
            booking_category: booking.booking_category,
            status: 'GIÀ VALIDATO IN PRECEDENZA'
          }
        });
        return;
      }

      if (booking.status === 'cancelled') {
        setVerificationStatus({
          success: false,
          message: "❌ Questa prenotazione risulta cancellata o rimborsata.",
        });
        return;
      }

      const bookingDateObj = new Date(booking.booking_date);
      bookingDateObj.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isExpired = bookingDateObj < today;

      // Aggiorniamo a database solo se la prenotazione è valida ed è ad esempio 'confirmed' o 'pending' valido
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'checked_in' })
        .eq('id', booking.id);

      if (updateError) {
        throw new Error("Impossibile aggiornare lo stato di check-in: " + updateError.message);
      }

      if (isExpired) {
        setVerificationStatus({
          success: false,
          message: `⚠️ DATA SCADUTA! Prenotazione del ${bookingDateObj.toLocaleDateString('it-IT')}. Il biglietto è stato comunque invalidato nel database.`,
          details: {
            id: booking.id,
            booking_date: booking.booking_date,
            internal_code: dbInternalCode,
            guest_name: `${booking.guest_first_name || ''} ${booking.guest_last_name || ''}`,
            guest_email: booking.guest_email,
            booking_category: booking.booking_category,
            status: 'SCADUTO E ANNULLATO'
          }
        });
      } else {
        setVerificationStatus({
          success: true,
          message: "✅ INGRESSO AUTORIZZATO! Biglietto validato correttamente.",
          details: {
            id: booking.id,
            booking_date: booking.booking_date,
            internal_code: dbInternalCode,
            guest_name: `${booking.guest_first_name || ''} ${booking.guest_last_name || ''}`,
            guest_email: booking.guest_email,
            booking_category: booking.booking_category,
            status: 'CHECKED-IN (In Spiaggia)'
          }
        });
      }

 } catch (err: any) {
      setVerificationStatus({
        success: false,
        message: "Errore di sincronizzazione hardware o di rete: " + err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const riavviaScanner = () => {
    setVerificationStatus(null);
    if (html5QrcodeRef.current) {
      startCamera(html5QrcodeRef.current);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 text-white p-5 rounded-3xl shadow-2xl border border-slate-800 my-6">
      <div className="text-center mb-5">
        <span className="bg-sky-500/10 text-sky-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-sky-500/20">
          Controllo Accessi Spiaggia
        </span>
        <h2 className="text-xl font-black mt-2 tracking-tight">PROFILO OPERATORE</h2>
        <p className="text-xs text-slate-400 mt-1">Inquadra il QR Code del bagnante per assegnare l'attrezzatura</p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 p-2 shadow-inner relative aspect-square flex items-center justify-center">
        <div 
          id="reader" 
          className={`w-full h-full rounded-xl overflow-hidden [&>video]:object-cover [&>video]:w-full [&>video]:h-full ${
            verificationStatus ? "hidden" : "block"
          }`} 
        />

        {loading && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-3 z-10 rounded-xl">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
            <p className="text-xs text-sky-400 font-mono">Elaborazione in corso...</p>
          </div>
        )}

        {!isCameraReady && !verificationStatus && !loading && (
          <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-4 text-center rounded-xl">
            <p className="text-xs text-rose-400 font-medium mb-3">Fotocamera spenta o permessi mancanti.</p>
            <button
              onClick={riavviaScanner}
              className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-xl text-xs uppercase tracking-wide"
            >
              Attiva Fotocamera
            </button>
          </div>
        )}
      </div>

      {verificationStatus && (
        <div className={`mt-5 p-4 rounded-2xl border text-sm transition-all duration-300
          ${verificationStatus.success 
            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200' 
            : 'bg-rose-950/40 border-rose-500/30 text-rose-200'}`}
        >
          <p className="font-bold text-center mb-2 tracking-wide text-xs">
            {verificationStatus.message}
          </p>

          {verificationStatus.details && (
            <div className="space-y-1.5 font-mono text-[11px] bg-black/30 p-3 rounded-xl border border-white/5 text-slate-300">
              <p><strong>N° OMBRELLONE:</strong> <span className="text-sky-400 text-sm font-bold">{verificationStatus.details.internal_code}</span></p>
              <p><strong>OSPITE:</strong> {verificationStatus.details.guest_name}</p>
              <p><strong>EMAIL:</strong> {verificationStatus.details.guest_email}</p>
              <p><strong>TARIFFA:</strong> {verificationStatus.details.booking_category}</p>
              <p><strong>STATO ATTUALE:</strong> <span className={verificationStatus.success ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>{verificationStatus.details.status}</span></p>
            </div>
          )}

          <button
            onClick={riavviaScanner}
            className="mt-4 w-full bg-white text-slate-950 font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-slate-200 transition-all shadow-md"
          >
            Prossimo Ospite ➜
          </button>
        </div>
      )}
    </div>
  );
}
