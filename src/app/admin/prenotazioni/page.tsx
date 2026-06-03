// 1. ANNULLA O CHIUDI UNA PRENOTAZIONE (Cambia lo stato senza eliminarla dal DB, per storico)
async function updateBookingStatus(bookingId: string, newStatus: 'cancelled' | 'completed') {
  const { error } = await supabase
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', bookingId);

  if (error) {
    alert("Errore durante l'aggiornamento della prenotazione");
  } else {
    alert(`Prenotazione aggiornata in: ${newStatus}`);
    // Aggiorna lo stato locale della tabella
  }
}

// 2. SPOSTA PRENOTAZIONE (Modifica data o numero ombrellone)
async function editBookingDetails(bookingId: string, newSpotId: string, newDate: string) {
  // Prima controlliamo se il nuovo posto è libero in quella data
  const { data: checkOccupied } = await supabase
    .from('bookings')
    .select('id')
    .eq('spot_id', newSpotId)
    .eq('booking_date', newDate)
    .eq('status', 'confirmed')
    .not('id', 'eq', bookingId); // Escludiamo la prenotazione stessa dal controllo

  if (checkOccupied && checkOccupied.length > 0) {
    alert("Attenzione: Il nuovo ombrellone selezionato è già occupato per questa data!");
    return;
  }

  // Se è libero, procediamo alla modifica
  const { error } = await supabase
    .from('bookings')
    .update({ 
      spot_id: newSpotId,
      booking_date: newDate
    })
    .eq('id', bookingId);

  if (error) {
    alert("Errore durante lo spostamento della prenotazione");
  } else {
    alert("Prenotazione spostata con successo!");
  }
}
