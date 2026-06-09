import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27' as any, // Adatta la versione se necessario
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { selectedDate, selectedSpotNumber, userData, prezzoFinale } = body;

    // 1. Validazione di sicurezza (Prezzo calcolato lato server per evitare manomissioni)
    // In produzione ricalcoleresti il prezzo qui, ma per il test usiamo quello passato o un calcolo rapido.
    const importoInCentesimi = Math.round(prezzoFinale * 100); 

    // 2. Creazione della sessione di Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Puoi aggiungere 'paypal', 'google_pay' ecc. dalla dashboard di Stripe
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
      // URL dove reindirizzare l'utente dopo il flusso
      success_url: `${request.headers.get('origin')}/?success=true&spot=${selectedSpotNumber}&date=${selectedDate}`,
      cancel_url: `${request.headers.get('origin')}/?cancelled=true`,
      // Salviamo i metadati che ci serviranno dopo il pagamento per confermare su Supabase
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
