import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Sostituisci con la tua API Key di Resend (da mettere poi nel file .env.local)
const resend = new Resend(process.env.RESEND_API_KEY || 're_tuachiave_fittizia');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, nome, cognome, data, ombrellone, prezzo, utenti, categoria } = body;

    // Generiamo lo stesso identico URL del QR code che vede a schermo
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
      `LIDO_SANTA_SEVERA|DATA:${data}|POSTO:${ombrellone}|EMAIL:${email}`
    )}`;

    // Invio dell'email tramite l'API di Resend
    const dataEmail = await resend.emails.send({
      from: 'Stabilimento Santa Severa <onboarding@resend.dev>', // In produzione userai info@tuodominio.it
      to: [email],
      subject: `Conferma Prenotazione Ombrellone N° ${ombrellone} - Santa Severa`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px;">
          <div style="background: linear-gradient(90deg, #06b6d4, #3b82f6); padding: 20px; text-align: center; border-radius: 12px; color: white;">
            <h2 style="margin: 0; text-transform: uppercase; tracking-wider">Stabilimento Balneare Santa Severa</h2>
            <p style="margin: 5px 0 0 0; opacity: 0.9;">Il tuo pass per il mare è pronto!</p>
          </div>
          
          <div style="padding: 20px 0;">
            <p>Ciao <strong>${nome} ${cognome}</strong>,</p>
            <p>Grazie per aver prenotato presso il nostro stabilimento. Il pagamento è andato a buon fine. Ecco i dettagli della tua prenotazione:</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 12px; margin: 20px 0; border: 1px solid #edf2f7;">
              <p style="margin: 5px 0;"><strong>Data:</strong> ${data}</p>
              <p style="margin: 5px 0; color: #ea580c;"><strong>Ombrellone Selezionato:</strong> N° ${ombrellone}</p>
              <p style="margin: 5px 0;"><strong>Numero Persone:</strong> ${utenti}</p>
              <p style="margin: 5px 0;"><strong>Tariffa Applicata:</strong> ${categoria}</p>
              <p style="margin: 5px 0;"><strong>Prezzo Totale Pagato:</strong> ${prezzo} €</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
              <p style="font-size: 14px; color: #64748b; margin-bottom: 10px;">Mostra questo QR Code al bagnino al tuo arrivo in spiaggia:</p>
              <img src="${qrCodeUrl}" alt="QR Code Ingresso" style="width: 180px; height: 180px; border: 1px solid #cbd5e1; padding: 10px; border-radius: 8px;" />
              <p style="font-family: monospace; font-size: 12px; margin-top: 5px; font-weight: bold;">DATA: ${data} - OMBRELLONE: N° ${ombrellone}</p>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 12px; color: #94a3b8;">
            <p>Stabilimento Balneare Santa Severa - Webpilot.it</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data: dataEmail });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
