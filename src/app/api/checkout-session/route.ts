import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

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

    // 1. Creiamo la prenotazione in stato 'pending' nel database
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
      return NextResponse.json({ error: "Postazione non disponibile o già riservata." }, { status: 400 });
    }

    // 2. Prepariamo la sessione di Stripe convertendo il prezzo in centesimi
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
      // CORREZIONE 1: URL modificato in /booking-confirmation per combaciare al millimetro con la tua cartella
      success_url: `${request.headers.get('origin')}/booking-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/piantina?error=cancelled`,
      // CORREZIONE 2: Passiamo TUTTI i dati nei metadati così la pagina di conferma li legge istantaneamente
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

    // 3. Aggiorniamo la prenotazione inserendo lo stripe_session_id appena generato
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
