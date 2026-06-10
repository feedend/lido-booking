import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Controllo preventivo per intercettare subito configurazioni errate sul server
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ ERRORE CRITICO: STRIPE_SECRET_KEY non è definita nelle variabili d'ambiente!");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  // Aggiornato alla versione richiesta da Stripe per evitare disallineamenti della struttura dati
  apiVersion: '2026-05-27.dahlia' as any,
});

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: "Session ID mancante" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    // Verifichiamo lo stato del pagamento
    if (session.payment_status !== 'paid') {
      console.warn(`⚠️ Tentativo di accesso con sessione non pagata. Stato: ${session.payment_status}`);
      return NextResponse.json({ error: "Sessione non pagata" }, { status: 400 });
    }

    // Se i metadata per assurdo sono nulli, ritorniamo un oggetto vuoto per non far crashare il frontend
    return NextResponse.json({ metadata: session.metadata || {} });

  } catch (err: any) {
    // FONDAMENTALE: Senza questo console.error, l'errore viene spedito al client 
    // ma non vedrai mai COSA è fallito nei log di Vercel o del terminale locale!
    console.error("❌ Errore durante Stripe retrieve session:", {
      message: err.message,
      stack: err.stack,
      sessionId: sessionId
    });

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
