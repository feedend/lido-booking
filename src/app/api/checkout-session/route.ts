import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; 

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.STRIPE_SUPABASE_SERVICE_ROLE_KEY || '' 
);

export async function POST(request: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    console.error("Errore: STRIPE_SECRET_KEY non configurata nelle variabili d'ambiente.");
    return NextResponse.json({ error: "Configurazione del server incompleta." }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret);

  try {
    const body = await request.json();
    const { selectedDate, spotId, spotNumber, userData } = body;

    // =========================================================================
    // 🛡️ CONTROLLO E VALIDAZIONE PARAMETRI EXTRA (Risolve il bug dei 20 pezzi)
    // =========================================================================
    const extraSdraio = parseInt(userData.extraSdraio) || 0;
    const extraLettini = parseInt(userData.extraLettini) || 0;
    const pezziTotaliExtra = extraSdraio + extraLettini;

    // Blocca immediatamente se i limiti frontend sono stati forzati o manomessi
    if (pezziTotaliExtra > 3 || extraLettini > 1 || extraSdraio < 0 || extraLettini < 0) {
      return NextResponse.json({ error: "Configurazione attrezzatura extra non consentita." }, { status: 400 });
    }

    // =========================================================================
    // 🛡️ RICALCOLO FORZATO DEL PREZZO SUL SERVER (Risolve il bug del prezzo a 0€)
    // =========================================================================
    const quotaBaseOmbrellone = 2.0;
    const quotaBaseSdraio = 1.5; 
    const COSTO_PEZZO_EXTRA = 1.50;

    let supplementoPersona = 0.0;
    const catLower = userData.categoria ? userData.categoria.toLowerCase().trim() : '';

    if (catLower.includes('parenti')) {
      supplementoPersona = 3.5;
    } else if (catLower === 'esercito') {
      supplementoPersona = 1.5;
    } else if (catLower.includes('altra forza armata')) {
      supplementoPersona = 3.5;
    } else if (catLower.includes('quiescenza')) {
      supplementoPersona = 1.5;
    } else if (catLower === 'giornaliero') {
      supplementoPersona = 3.5;
    }

    const costoStrutturaBase = quotaBaseOmbrellone + quotaBaseSdraio;
    const costoComponenti = (parseInt(userData.numUtenti) || 1) * supplementoPersona;
    const prezzoExtraReale = pezziTotaliExtra * COSTO_PEZZO_EXTRA;

    // Il server ignora body.prezzoFinale e usa solo questa variabile blindata
    const prezzoFinaleSicuro = costoStrutturaBase + costoComponenti + prezzoExtraReale;

    if (prezzoFinaleSicuro <= 0) {
      return NextResponse.json({ error: "Errore nel calcolo di sicurezza della tariffa." }, { status: 400 });
    }
    // =========================================================================

    // --- PULIZIA SICURA DEI PENDING SCADUTI ---
    const quindiciMinutiFa = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: pendingPrecedenti } = await supabaseAdmin
      .from('bookings')
      .select('id, created_at')
      .eq('booking_date', selectedDate)
      .eq('status', 'pending')
      .or(`spot_id.eq.${spotId},guest_email.eq.${userData.email}`);

    if (pendingPrecedenti && pendingPrecedenti.length > 0) {
      const idsDaEliminare = pendingPrecedenti
        .filter(b => b.created_at < quindiciMinutiFa)
        .map(b => b.id);

      if (idsDaEliminare.length > 0) {
        await supabaseAdmin
          .from('bookings')
          .delete()
          .in('id', idsDaEliminare);
      }
    }

    // Creiamo la prenotazione in stato 'pending' nel database con i dati validati
    const { data: newBooking, error: dbError } = await supabaseAdmin
      .from('bookings')
      .insert({
        spot_id: spotId,
        booking_date: selectedDate,
        status: 'pending',
        total_price: prezzoFinaleSicuro, // <-- Usiamo il prezzo calcolato dal server
        num_guests: parseInt(userData.numUtenti) || 1,
        booking_category: userData.categoria,
        guest_first_name: userData.nome,
        guest_last_name: userData.cognome,
        guest_email: userData.email,
        guest_phone: userData.telefono || null,
        extra_sdraio: extraSdraio,       // <-- Usiamo la variabile sanitizzata
        extra_lettini: extraLettini      // <-- Usiamo la variabile sanitizzata
      })
      .select()
      .single();

    if (dbError) {
      console.error("Errore DB inserimento prenotazione:", dbError);
      return NextResponse.json({ error: "Postazione non disponibile o già riservata per questa data." }, { status: 400 });
    }

    // Prepariamo la sessione di Stripe usando il prezzo sicuro
    const amountInCents = Math.round(prezzoFinaleSicuro * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: userData.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Prenotazione Ombrellone N° ${spotNumber}`,
              description: `Data: ${new Date(selectedDate).toLocaleDateString('it-IT')} - C3C`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${request.headers.get('origin')}/booking-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/piantina?error=cancelled`,
      metadata: {
        booking_id: newBooking.id,
        booking_date: selectedDate,
        guest_nome: userData.nome,
        guest_cognome: userData.cognome,
        guest_email: userData.email,
        spot_number: String(spotNumber),
        booking_category: userData.categoria,
        extra_sdraio: String(extraSdraio),
        extra_lettini: String(extraLettini),
        total_price: String(prezzoFinaleSicuro),
        num_guests: String(userData.numUtenti)
      },
    });

    // Aggiorniamo la prenotazione inserendo lo stripe_session_id appena generato
    await supabaseAdmin
      .from('bookings')
      .update({ stripe_session_id: session.id })
      .eq('id', newBooking.id);

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("Errore Checkout Session:", err);
    return NextResponse.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
