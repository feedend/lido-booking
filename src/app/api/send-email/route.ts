import { NextResponse, NextRequest } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Spostando l'inizializzazione qui dentro, proteggi la build se la chiave manca nell'ambiente di compilazione
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error("⚠️ RESEND_API_KEY non configurata nelle variabili d'ambiente.");
      return NextResponse.json({ success: false, error: "Configurazione server incompleta." }, { status: 500 });
    }

    const resend = new Resend(apiKey);

    const body = await request.json();
    const { email, nome, cognome, data, ombrellone, prezzo, utenti, categoria } = body;

    // Generazione del link per il QR Code funzionante
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
      `LIDO_SANTA_SEVERA|DATA:${data}|POSTO:${ombrellone}|EMAIL:${email}`
    )}`;

    // Invio della mail tramite le API di Resend
    const emailResponse = await resend.emails.send({
      from: 'Stabilimento Santa Severa <onboarding@resend.dev>', 
      to: 'questforfeed@gmail.com',
      subject: `Conferma Prenotazione Ombrellone N° ${ombrellone} - Santa Severa`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <div style="background: linear-gradient(90deg, #06b6d4, #3b82f6); padding: 20px; text-align: center; border-radius: 12px; color: white;">
            <h2 style="margin: 0; text-transform: uppercase;">Stabilimento Santa Severa</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Il tuo pass per il mare è pronto!</p>
          </div>
          <div style="padding: 20px 0; color: #334155;">
            <p>Ciao <strong>${nome} ${cognome}</strong>,</p>
            <p>Ecco i dettagli della tua prenotazione:</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #edf2f7; font-size: 14px;">
              <p><strong>Data:</strong> ${data}</p>
              <p style="color: #ea580c;"><strong>Ombrellone:</strong> N° ${ombrellone}</p>
              <p><strong>Persone:</strong> ${utenti}</p>
              <p><strong>Tariffa:</strong> ${categoria}</p>
              <p><strong>Prezzo Totale:</strong> ${prezzo} €</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <img src="${qrCodeUrl}" alt="QR Code" style="width: 160px; height: 160px; border: 1px solid #cbd5e1; padding: 8px; border-radius: 8px;" />
              <p style="font-family: monospace; font-size: 12px; margin-top: 8px; font-weight: bold;">DATA: ${data} - OMBRELLONE: N° ${ombrellone}</p>
            </div>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data: emailResponse });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
