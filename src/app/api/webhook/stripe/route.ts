import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// ▀▄▀▄▀▄ MODIFICA DI SICUREZZA PER IL DEPLOY SU VERCEL ▄▀▄▀▄▀
// Forza la route a essere dinamica al 100% (evita il blocco in fase di build)
export const dynamic = 'force-dynamic';
// Specifica l'ambiente Node.js standard per gestire payload e firme crittografiche
export const runtime = 'nodejs'; 

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-01-27' as any,
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.STRIPE_SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  const payload = await request.text();
  const sig = request.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      payload,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err: any) {
    console.error(`❌ Errore firma Webhook: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Gestiamo l'evento di pagamento andato a buon fine
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.booking_id;

    if (bookingId) {
      console.log(`PAGAMENTO CONFERMATO per la prenotazione: ${bookingId}`);
      
      // Aggiorniamo lo stato su Supabase a 'confirmed'
      const { error } = await supabaseAdmin
        .from('bookings')
        .update({ status: 'confirmed' }) 
        .eq('id', bookingId);

      if (error) {
        console.error(`Errore aggiornamento DB per prenotazione ${bookingId}:`, error);
        return NextResponse.json({ error: "Errore aggiornamento database" }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}
