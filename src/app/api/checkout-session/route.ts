import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// 1. Forza il comportamento totalmente dinamico lato server
export const dynamic = 'force-dynamic';
// 2. Forza esplicitamente il runtime a Node.js (evita l'ottimizzazione statica delle pagine)
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
    const { selectedDate, prezzoFinale, spotId, spotNumber, userData } = body;

    // --- PULIZIA SICURA DEI PENDING SCADUTI (COMPATIBILE AL 100% CON IL DEPLOY) ---
    const quindiciMinutiFa = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    // 1. Recuperiamo i record pending per quella data che corrispondono all'ombrellone O alla mail
    const { data: pendingPrecedenti } = await supabaseAdmin
      .from('bookings')
      .select('id, created_at')
      .eq('booking_date', selectedDate)
      .eq('status', 'pending')
      .or(`spot_id.eq.${spotId},guest_email.eq.${userData.email}`);

    // 2. Se ci sono, filtriamo quelli creati PRIMA dei 15 minuti fa ed eliminiamoli per ID
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
    // -----------------------------------------------------------------------------

    // Creiamo la prenotazione in stato 'pending' nel database
    const { data: newBooking, error: dbError } = await supabaseAdmin
      .from('bookings')
      .insert({
        spot_id: spotId,
        booking_date: selectedDate,
        status: 'pending',
        total_price: prezzoFinale,
        num_guests: userData.numUtenti,
        booking_category: userData.categoria,
        guest_first_name: userData.nome,
        guest_last_name: userData.cognome,
        guest_email: userData.email,
        guest_phone: userData.telefono || null,
        extra_sdraio: userData.extraSdraio || 0,
        extra_lettini: userData.extraLettini || 0
      })
      .select()
      .single();

    if (dbError) {
      console.error("Errore DB inserimento prenotazione:", dbError);
      return NextResponse.json({ error: "Postazione non disponibile o già riservata per questa data." }, { status: 400 });
    }

    // Prepariamo la sessione di Stripe convertendo il prezzo in centesimi
    const amountInCents = Math.round(prezzoFinale * 100);

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
        extra_sdraio: String(userData.extraSdraio || 0),
        extra_lettini: String(userData.extraLettini || 0),
        total_price: String(prezzoFinale),
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
