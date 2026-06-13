import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Client amministrativo che bypassa i blocchi RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.STRIPE_SUPABASE_SERVICE_ROLE_KEY || '' 
);

export async function GET(request: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return NextResponse.json({ success: false, error: "Stripe key non configurata" }, { status: 500 });
  }

  const stripe = new Stripe(stripeSecret);
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ success: false, error: "Session ID mancante" }, { status: 400 });
  }

  try {
    // 1. Recuperiamo la sessione reale direttamente da Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const bookingId = session.metadata?.booking_id;

    if (!bookingId) {
      return NextResponse.json({ success: false, error: "ID Prenotazione non trovato nei metadati di Stripe" }, { status: 400 });
    }

    // 2. Eseguiamo l'UPDATE dello stato direttamente da server (bypass RLS)
    const { error: updateError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // 3. Recuperiamo i dettagli aggiornati facendo la JOIN sicura con la tabella spots
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from('bookings')
      .select(`
        *,
        spots (
          internal_code
        )
      `)
      .eq('id', bookingId)
      .maybeSingle();

    if (fetchError || !booking) {
      return NextResponse.json({ success: false, error: "Impossibile recuperare i dati dal database" }, { status: 404 });
    }

    // 4. Inviamo alla pagina un oggetto dati normalizzato e pronto all'uso
    const normalizedData = {
      ...booking,
      guest_nome: booking.guest_first_name || 'Ospite',
      guest_cognome: booking.guest_last_name || '',
      spot_number: booking.spots?.internal_code || 'N/D'
    };

    return NextResponse.json({ success: true, data: normalizedData });

  } catch (err: any) {
    console.error("Errore nell'API verify-session:", err);
    return NextResponse.json({ success: false, error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
