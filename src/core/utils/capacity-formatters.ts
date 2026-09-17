import type {
  WhatsAppGroupMessagePayload,
  SecurityGateRosterPayload,
  ConfirmedRosterEntry,
} from '../domain/types.ts';

/**
 * Formats a date in Colombian Spanish for sports notifications.
 */
export function formatMatchDateTime(date: Date): string {
  const d = new Date(date);
  const formatted = d.toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  // Capitalize first letter (e.g., "sábado" -> "Sábado")
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Pure Formatter 1: WhatsApp Group Notification
 * Sporty, concise, displaying the full live confirmed roster,
 * separating playing squad from companions, showing dynamic remaining spots and fee.
 */
export function formatWhatsAppGroupCapacityMessage(payload: WhatsAppGroupMessagePayload): string {
  const {
    matchLocation,
    matchLocationAddress,
    matchDate,
    totalCapacity = 18,
    remainingSpots,
    roster,
    rsvpUrl,
    estFee,
    googleMapsUrl,
  } = payload;

  const dateStr = formatMatchDateTime(matchDate);
  const locationStr = matchLocationAddress
    ? `${matchLocation} (${matchLocationAddress})`
    : matchLocation;

  // Separate playing roster from non-playing companions
  const playingPlayers = roster.filter((entry) => entry.guestType !== 'COMPANION');
  const companions = roster.filter((entry) => entry.guestType === 'COMPANION');

  const playingCount = playingPlayers.length;
  const companionCount = companions.length;

  const playingRosterLines = playingPlayers
    .map((entry, index) => {
      const num = String(index + 1).padStart(2, '0');
      let nameLabel = entry.fullName;

      if (entry.isGuest) {
        nameLabel = entry.hostPlayerName
          ? `${entry.fullName} (+1 de ${entry.hostPlayerName})`
          : `${entry.fullName} (+1 invitado)`;
      }

      const vehicleTag = entry.hasVehicle && entry.vehiclePlate
        ? ` 🚗 [${entry.vehiclePlate.trim().toUpperCase()}]`
        : '';

      return `${num}. ⚽ ${nameLabel}${vehicleTag}`;
    })
    .join('\n');

  let companionsSection = '';
  if (companions.length > 0) {
    const companionLines = companions
      .map((entry, index) => {
        const num = String(index + 1).padStart(2, '0');
        const hostTag = entry.hostPlayerName
          ? ` (acompaña a ${entry.hostPlayerName})`
          : ' (barra / no juega)';
        const vehicleTag = entry.hasVehicle && entry.vehiclePlate
          ? ` 🚗 [${entry.vehiclePlate.trim().toUpperCase()}]`
          : '';
        return `${num}. 👥 ${entry.fullName}${hostTag}${vehicleTag}`;
      })
      .join('\n');

    companionsSection = `\n\n👥 *ACOMPAÑANTES (${companionCount} - sin costo cancha):*\n${companionLines}`;
  }

  const spotsLeft = Math.max(0, remainingSpots);
  const spotsAlert =
    spotsLeft > 0
      ? `⚡ *Cupos disponibles:* ${spotsLeft} libres en cancha.\n📋 Lista de espera abre al copar nómina.`
      : `🔒 *Nómina completa (${totalCapacity}/${totalCapacity}).* Registros entran a lista de espera.`;

  const feeLine = estFee
    ? `💵 *Cuota proyectada:* $${estFee.toLocaleString('es-CO')} COP\n`
    : '';

  const mapsLine = googleMapsUrl
    ? `🗺️ *Ubicación:* ${googleMapsUrl}\n`
    : '';

  const ctaLine = rsvpUrl
    ? `\n🔗 *Anota tu cupo aquí:*\n👉 ${rsvpUrl}\n`
    : '';

  const headerTitle =
    playingCount >= 10
      ? `🔥 *QUÓRUM LISTO (${playingCount}/${totalCapacity}) • PARTIDO CONFIRMADO* ⚽`
      : `⚽ *CONVOCATORIA ABIERTA (${playingCount}/${totalCapacity})* ⚽`;

  return (
    `${headerTitle}\n\n` +
    `Cancha asegurada con ${playingCount} confirmados.\n\n` +
    `📅 *Fecha:* ${dateStr}\n` +
    `📍 *Sede:* ${locationStr}\n` +
    feeLine +
    mapsLine +
    `\n👥 *NÓMINA CONFIRMADA (${playingCount}/${totalCapacity}):*\n` +
    `${playingRosterLines}` +
    `${companionsSection}\n\n` +
    `${spotsAlert}\n` +
    `${ctaLine}\n` +
    `_Mizpa FC_`
  );
}

/**
 * Pure Formatter 2: Security Gate / Vigilance Roster
 * Formal, structured plain text sheet for access control at the sports complex,
 * detailing full names, national identification documents, and vehicle license plates.
 */
export function formatSecurityGateRosterMessage(payload: SecurityGateRosterPayload): string {
  const {
    matchLocation,
    matchLocationAddress,
    matchDate,
    durationHours = 2,
    roster,
  } = payload;

  const dateStr = formatMatchDateTime(matchDate);
  const locationStr = matchLocationAddress
    ? `${matchLocation} - ${matchLocationAddress}`
    : matchLocation;

  let vehicleCount = 0;
  const vehiclePlates: string[] = [];

  const playingAttendees = roster.filter((r) => r.guestType !== 'COMPANION');
  const companionAttendees = roster.filter((r) => r.guestType === 'COMPANION');

  const rosterTable = roster
    .map((entry, index) => {
      const num = String(index + 1).padStart(2, '0');
      let roleTag = 'Jugador';
      if (entry.isGuest) {
        if (entry.guestType === 'COMPANION') {
          roleTag = entry.hostPlayerName
            ? `Acompaña a ${entry.hostPlayerName}`
            : 'Acompañante';
        } else {
          roleTag = entry.hostPlayerName
            ? `Invitado de ${entry.hostPlayerName}`
            : 'Invitado';
        }
      }
      const doc = entry.documentId ? entry.documentId.trim() : 'Sin documento';
      
      const hasPlate = Boolean(entry.hasVehicle && entry.vehiclePlate);
      const plate = hasPlate
        ? entry.vehiclePlate!.trim().toUpperCase()
        : 'Peatonal';

      if (hasPlate) {
        vehicleCount++;
        vehiclePlates.push(plate);
      }

      return `${num}. ${entry.fullName} (${roleTag})\n    Doc: ${doc} | Placa: ${plate}`;
    })
    .join('\n');

  return (
    `========================================\n` +
    `📋 *CONTROL DE ACCESO Y PORTERÍA • MIZPA FC*\n` +
    `========================================\n\n` +
    `📌 *DATOS DEL PARTIDO:*\n` +
    `• Fecha: ${dateStr}\n` +
    `• Sede: ${locationStr}\n` +
    `• Reserva: ${durationHours} horas\n` +
    `• Estado: AUTORIZADO\n\n` +
    `📋 *ASISTENTES AUTORIZADOS (${roster.length}):*\n` +
    `----------------------------------------\n` +
    `${rosterTable}\n` +
    `----------------------------------------\n\n` +
    `📊 *RESUMEN:*\n` +
    `• Personas: ${roster.length} (${playingAttendees.length} en cancha + ${companionAttendees.length} acompañantes)\n` +
    `• Vehículos: ${vehicleCount} [${vehiclePlates.length > 0 ? vehiclePlates.join(', ') : 'Ninguno'}]\n` +
    `• Peatonales: ${roster.length - vehicleCount}\n\n` +
    `Acceso autorizado únicamente al personal y vehículos de esta lista.\n` +
    `========================================`
  );
}
