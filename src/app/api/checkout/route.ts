import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Inizializzazione pulita con la versione di default
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { selectedDate, selectedSpotNumber, userData, prezzoFinale } = body;

    const importoInCentesimi = Math.round(prezzoFinale * 100); 

    // Creazione della sessione di Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Prenotazione Ombrellone N° ${selectedSpotNumber}`,
              description: `Data: ${new Date(selectedDate).toLocaleDateString('it-IT')} - Lido Santa Severa`,
            },
            unit_amount: importoInCentesimi,
          },
          quantity: 1,
        },
      ],
      
      // ==================== MODIFICA REDIRECT QUI ====================
      // Al successo, rimanda sulla pagina passando i parametri per far scattare il download del QR
      success_url: `${request.headers.get('origin')}/?success=true&spot=${selectedSpotNumber}&date=${selectedDate}`,
      cancel_url: `${request.headers.get('origin')}/?cancelled=true`,
      // ===============================================================

      metadata: {
        spot_number: selectedSpotNumber.toString(),
        date: selectedDate,
        guest_email: userData.email,
        guest_nome: userData.nome,
        guest_cognome: userData.cognome,
        guest_categoria: userData.categoria,
        guest_phone: userData.telefono || '',
        extra_sdraio: userData.extraSdraio.toString(),
        extra_lettini: userData.extraLettini.toString(),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error("Errore Stripe:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
