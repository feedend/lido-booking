import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// Funzione per cambiare la disponibilità dell'ombrellone
async function toggleSpotAvailability(spotId: string, currentStatus: boolean, motivo?: string) {
  const { data, error } = await supabase
    .from('spots')
    .update({ 
      is_available: !currentStatus,
      notes: !currentStatus ? '' : (motivo || 'Chiuso manualmente dal gestore')
    })
    .eq('id', spotId);

  if (error) {
    console.error("Errore nel cambio stato dell'ombrellone:", error.message);
    alert("Impossibile aggiornare lo stato dell'ombrellone");
  } else {
    alert(`Ombrellone ${!currentStatus ? 'Aperto' : 'Chiuso'} con successo!`);
    // Qui ricarichi i dati della mappa
  }
}
