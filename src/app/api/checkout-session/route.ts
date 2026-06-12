import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27' as any, // Adatta la versione se necessario
});

// Client Supabase Service Role (essenziale per bypassare RLS in scrittura se l'utente è guest)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.STRIPE_SUPABASE_SERVICE_ROLE_KEY || '' 
);

export async function POST(request: Request) {
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
      // Se fallisce qui, probabilmente il posto è stato occupato nel millisecondo precedente (grazie al vincolo UNIQUE)
      return NextResponse.json({ error: "Postazione non disponibile o già riservata." }, { status: 400 });
    }

    // 2. Prepariamo la sessione di Stripe convertendo il prezzo in centesimi (Stripe vuole gli interi)
    const amountInCents = Math.round(prezzoFinale * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Puoi aggiungere 'google_pay', 'apple_pay' se configurati su Stripe
      customer_email: userData.email,
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Prenotazione Ombrellone N° ${spotNumber}`,
              description: `Data: ${new Date(selectedDate).toLocaleDateString('it-IT')} - Webpilot`,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Se il pagamento va a buon fine o fallisce, Stripe rimanda l'utente qui:
      success_url: `${request.headers.get('origin')}/booking-confermato?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get('origin')}/piantina?error=cancelled`,
      // Salviamo l'ID della prenotazione nei metadati di Stripe per sicurezza
      metadata: {
        booking_id: newBooking.id,
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
