import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Inizializza Resend con la chiave presente nel file .env.local
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, nome, cognome, data, ombrellone, prezzo, utenti, categoria } = body;

    // Generiamo lo stesso identico QR code asincrono della mappa
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
      `LIDO_SANTA_SEVERA|DATA:${data}|POSTO:${ombrellone}|EMAIL:${email}`
    )}`;

    // Struttura e invio del template email
    const emailResponse = await resend.emails.send({
      from: 'Stabilimento Santa Severa <onboarding@resend.dev>', // Mittente predefinito per i test in sandbox
      to: [email],
      subject: `Conferma Prenotazione Ombrellone N° ${ombrellone} - Santa Severa`,
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 24px; background-color: #ffffff;">
          
          <div style="background: linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%); padding: 25px; text-align: center; border-radius: 18px; color: white;">
            <h2 style="margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 1px;">Stabilimento Balneare<br>Santa Severa</h2>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 13px;">Il tuo pass digitale per la spiaggia</p>
          </div>
          
          <div style="padding: 20px 0; color: #334155;">
            <p style="font-size: 15px; margin-bottom: 16px;">Gentile <strong>${nome} ${cognome}</strong>,</p>
            <p style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">La tua prenotazione è stata registrata con successo. Di seguito trovi il riepilogo dei dettagli e il codice valido per l'accesso:</p>
            
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 16px; margin-bottom: 24px; border: 1px solid #f1f5f9; font-size: 13px; line-height: 1.6;">
              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;"><strong>Data della prenotazione:</strong> ${data}</div>
              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px; color: #ea580c;"><strong>Postazione:</strong> Ombrellone N° ${ombrellone}</div>
              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;"><strong>Ospiti inseriti:</strong> ${utenti} persone</div>
              <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 6px;"><strong>Tariffa applicata:</strong> ${categoria}</div>
              <div><strong>Prezzo complessivo:</strong> <span style="font-weight: bold; color: #0f172a;">${prezzo} €</span></div>
            </div>

            <div style="text-align: center; background-color: #fff7ed; padding: 20px; border-radius: 20px; border: 1px solid #ffedd5;">
              <p style="font-size: 12px; font-weight: bold; color: #c2410c; margin: 0 0 12px 0; uppercase">QR Code da mostrare al Check-in:</p>
              <img src="${qrCodeUrl}" alt="QR Code Ingresso" style="width: 160px; height: 160px; background-color: white; padding: 8px; border-radius: 12px; border: 1px solid #fed7aa;" />
              
              <div style="margin-top: 12px; font-family: monospace; font-size: 12px; font-weight: bold; color: #431407; background-color: white; display: inline-block; padding: 6px 12px; border-radius: 8px; border: 1px solid #ffe4e6;">
                DATA: ${data} — OMBRELLONE: N° ${ombrellone}
              </div>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 11px; color: #94a3b8;">
            <p style="margin: 0;">Gestione Digitale Webpilot.it - Tutti i diritti riservati</p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, data: emailResponse });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
