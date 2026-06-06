'use client';
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Html5QrcodeScanner } from 'html5-qrcode';

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
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<{
    success: boolean;
    message: string;
    details?: BookingDetails;
  } | null>(null);

  useEffect(() => {
    // Inizializza lo scanner sul div con id "reader"
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        supportedScanTypes: [0] // Forza solo l'uso della fotocamera posteriore/video
      },
      /* verbose= */ false
    );

    const onScanSuccess = async (decodedText: string) => {
      // Ferma momentaneamente lo scanner o gestisci il risultato per evitare scansioni triple
      if (loading) return;
      
      scanner.clear(); // Chiude la telecamera dopo la prima lettura riuscita
      setScanResult(decodedText);
      await validaEInvalidaTicket(decodedText);
    };

    const onScanFailure = (error: any) => {
      // Callback silenziosa per i frame in cui non viene rilevato nessun QR
    };

    scanner.render(onScanSuccess, onScanFailure);

    // Cleanup dello scanner alla smobilitazione del componente
    return () => {
      scanner.clear().catch(err => console.error("Errore nel reset dello scanner:", err));
    };
  }, []);

  // Logica core di validazione e annullamento sul database
  const validaEInvalidaTicket = async (qrData: string) => {
    setLoading(true);
    setVerificationStatus(null);

    try {
      // 1. Parsing dei dati dal formato generato: LIDO_SANTA_SEVERA|DATA:2026-06-06|POSTO:13|EMAIL:danilo@example.com
      const parts = qrData.split('|');
      if (parts[0] !== 'LIDO_SANTA_SEVERA') {
        setVerificationStatus({
          success: false,
          message: "QR Code non valido o non appartenente a questo stabilimento."
        });
        setLoading(false);
        return;
      }

      // Estraiamo i metadati puliti
      const dataPart = parts.find(p => p.startsWith('DATA:'))?.replace('DATA:', '');
      const postoPart = parts.find(p => p.startsWith('POSTO:'))?.replace('POSTO:', '');
      const emailPart = parts.find(p => p.startsWith('EMAIL:'))?.replace('EMAIL:', '');

      if (!dataPart || !postoPart || !emailPart) {
        setVerificationStatus({
          success: false,
          message: "Struttura del QR corrotta o incompleta."
        });
        setLoading(false);
        return;
      }

      // 2. Cerchiamo la prenotazione su Supabase facendo un join con la tabella 'spots' per verificare il codice interno dell'ombrellone
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
        setLoading(false);
        return;
      }

      const booking = bookings[0];

      // 3. Controllo dello Stato per prevenire il doppio ingresso (Invalidazione)
      if (booking.status === 'checked_in') {
        setVerificationStatus({
          success: false,
          message: "⚠️ ATTENZIONE: Questo QR Code è già STATO UTILIZZATO per l'ingresso!",
          details: {
            id: booking.id,
            booking_date: booking.booking_date,
            internal_code: postoPart,
            guest_name: `${booking.guest_first_name} ${booking.guest_last_name}`,
            guest_email: booking.guest_email,
            booking_category: booking.booking_category,
            status: 'GIÀ VALIDATO IN PRECEDENZA'
          }
        });
        setLoading(false);
        return;
      }

      if (booking.status === 'cancelled') {
        setVerificationStatus({
          success: false,
          message: "❌ Questa prenotazione risulta cancellata o rimborsata.",
        });
        setLoading(false);
        return;
      }

      // 4. Se è confermata ('confirmed'), effettuiamo il Check-In cambiando lo stato e invalidando il codice per i controlli successivi
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'checked_in' })
        .eq('id', booking.id);

      if (updateError) {
        throw new Error("Impossibile aggiornare lo stato di check-in: " + updateError.message);
      }

      // Successo: Il ticket è ora valido e simultaneamente consumato
      setVerificationStatus({
        success: true,
        message: "✅ INGRESSO AUTORIZZATO! Biglietto validato e invalidato correttamente.",
        details: {
          id: booking.id,
          booking_date: booking.booking_date,
          internal_code: postoPart,
          guest_name: `${booking.guest_first_name} ${booking.guest_last_name}`,
          guest_email: booking.guest_email,
          booking_category: booking.booking_category,
          status: 'CHECKED-IN (In Spiaggia)'
        }
      });

    } catch (err: any) {
      setVerificationStatus({
        success: false,
        message: "Errore hardware o di rete durante la sincronizzazione: " + err.message
      });
    } finally {
      setLoading(false);
    }
  };

  const riavviaScanner = () => {
    setScanResult(null);
    setVerificationStatus(null);
    // Ricarica la finestra o forza il re-render del componente per far ripartire la fotocamera
    window.location.reload();
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

      {/* Area del mirino della Fotocamera */}
      <div className="overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 p-2 shadow-inner relative">
        {!scanResult && (
          <div id="reader" className="w-full text-slate-800 font-sans text-xs rounded-xl overflow-hidden" />
        )}

        {loading && (
          <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center space-y-3 z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-400"></div>
            <p className="text-xs text-sky-400 font-mono">Verifica database in corso...</p>
          </div>
        )}

        {scanResult && !loading && (
          <div className="p-4 text-center">
            <p className="text-[10px] font-mono text-slate-500 break-all bg-slate-900 p-2 rounded-lg mb-2">
              RAW: {scanResult}
            </p>
          </div>
        )}
      </div>

      {/* Output del Verificatore */}
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
            Sblocca Cam e Prossimo Ospite ➜
          </button>
        </div>
      )}
    </div>
  );
}
