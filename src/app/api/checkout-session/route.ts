import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request) {
  try {
    const { selectedDate, prezzoFinale, spotId, spotNumber, userData } = await req.json();

    // Specifica il dominio del tuo sito (in locale o in produzione)
    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Creazione della sessione di pagamento Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Prenotazione Ombrellone N° ${spotNumber}`,
              description: `Data: ${new Date(selectedDate).toLocaleDateString('it-IT')} - Lido Santa Severa`,
            },
            unit_amount: Math.round(prezzoFinale * 100), // Stripe accetta gli importi in centesimi
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Passaggio di tutti i dati essenziali all'interno dei metadati di Stripe
      metadata: {
        booking_date: selectedDate,
        spot_id: spotId,
        spot_number: String(spotNumber),
        guest_nome: userData.nome,
        guest_cognome: userData.cognome,
        guest_email: userData.email,
        guest_phone: userData.telefono || '',
        num_guests: String(userData.numUtenti),
        booking_category: userData.categoria,
        extra_sdraio: String(userData.extraSdraio),
        extra_lettini: String(userData.extraLettini),
        total_price: String(prezzoFinale),
      },
      success_url: `${origin}/booking-confirmation?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Errore Stripe Session:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
