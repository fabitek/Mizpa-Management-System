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
          ? `${entry.fullName} (+1 Invitado Jugador de ${entry.hostPlayerName})`
          : `${entry.fullName} (+1 Invitado Jugador)`;
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
          ? ` (Acompañante de ${entry.hostPlayerName})`
          : ' (Acompañante / Barra)';
        const vehicleTag = entry.hasVehicle && entry.vehiclePlate
          ? ` 🚗 [${entry.vehiclePlate.trim().toUpperCase()}]`
          : '';
        return `${num}. 👥 ${entry.fullName}${hostTag}${vehicleTag}`;
      })
      .join('\n');

    companionsSection = `\n\n👥 *ACOMPAÑANTES & BARRA (${companionCount} - Cuota Cancha $0):*\n${companionLines}`;
  }

  const spotsLeft = Math.max(0, remainingSpots);
  const spotsAlert =
    spotsLeft > 0
      ? `⚡ *Cupos Restantes:* ¡Quedan *${spotsLeft}* cupos disponibles en cancha!\n📋 *Lista de espera:* Activa para registros posteriores.`
      : `🔒 *CUPO COMPLETO EN CANCHA (${totalCapacity}/${totalCapacity})!* Lista de espera activa.`;

  const feeLine = estFee
    ? `💵 *Cuota Cancha Estimada:* $${estFee.toLocaleString('es-CO')} COP c/u\n`
    : '';

  const mapsLine = googleMapsUrl
    ? `🗺️ *Ubicación:* ${googleMapsUrl}\n`
    : '';

  const ctaLine = rsvpUrl
    ? `\n🔗 *Confirma o gestiona tu cupo aquí:*\n👉 ${rsvpUrl}\n`
    : '';

  const headerTitle =
    playingCount >= 10
      ? `🔥 *¡QUÓRUM ALCANZADO (${playingCount}/${totalCapacity})! PARTIDO CONFIRMADO* ⚽`
      : `⚽ *CONVOCATORIA & NÓMINA OFICIAL (${playingCount}/${totalCapacity})* ⚽`;

  return (
    `${headerTitle}\n\n` +
    `¡Llegamos a los ${playingCount} jugadores confirmados en cancha! La reserva está 100% asegurada.\n\n` +
    `📅 *Fecha:* ${dateStr}\n` +
    `📍 *Lugar:* ${locationStr}\n` +
    feeLine +
    mapsLine +
    `\n👥 *NÓMINA CONFIRMADA EN CANCHA (${playingCount}/${totalCapacity}):*\n` +
    `${playingRosterLines}` +
    `${companionsSection}\n\n` +
    `${spotsAlert}\n` +
    `${ctaLine}\n` +
    `_Mizpa FC • Fútbol, Integración y Disciplina_`
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
      let roleTag = 'Jugador en cancha';
      if (entry.isGuest) {
        if (entry.guestType === 'COMPANION') {
          roleTag = entry.hostPlayerName
            ? `Acompañante de ${entry.hostPlayerName}`
            : 'Acompañante';
        } else {
          roleTag = entry.hostPlayerName
            ? `Invitado Jugador de ${entry.hostPlayerName}`
            : 'Invitado Jugador';
        }
      }
      const doc = entry.documentId ? entry.documentId.trim() : 'Sin documento registrado';
      
      const hasPlate = Boolean(entry.hasVehicle && entry.vehiclePlate);
      const plate = hasPlate
        ? entry.vehiclePlate!.trim().toUpperCase()
        : 'Peatonal';

      if (hasPlate) {
        vehicleCount++;
        vehiclePlates.push(plate);
      }

      return `${num}. ${entry.fullName} (${roleTag})\n    📄 Doc: ${doc} | 🚗 Placa: ${plate}`;
    })
    .join('\n');

  return (
    `========================================\n` +
    `📋 *PLANILLA DE INGRESO Y PORTERÍA - MIZPA FC*\n` +
    `========================================\n\n` +
    `📌 *DATOS DEL ENCUENTRO:*\n` +
    `• *Fecha y Hora:* ${dateStr}\n` +
    `• *Sede / Cancha:* ${locationStr}\n` +
    `• *Tiempo Reservado:* ${durationHours} Horas\n` +
    `• *Estado:* AUTORIZADO\n\n` +
    `📋 *LISTADO DE ASISTENTES AUTORIZADOS (${roster.length}):*\n` +
    `----------------------------------------\n` +
    `${rosterTable}\n` +
    `----------------------------------------\n\n` +
    `📊 *RESUMEN DE PORTERÍA & CONTROL DE ACCESO:*\n` +
    `• *Total Personas Autorizadas:* ${roster.length} (${playingAttendees.length} Jugadores + ${companionAttendees.length} Acompañantes)\n` +
    `• *Total Vehículos Autorizados:* ${vehicleCount} [${vehiclePlates.length > 0 ? vehiclePlates.join(', ') : 'Ninguno'}]\n` +
    `• *Total Ingresos Peatonales:* ${roster.length - vehicleCount}\n\n` +
    `⚠️ *Nota para Vigilancia:* Se autoriza el ingreso exclusivo a las personas y vehículos relacionados en esta planilla.\n` +
    `========================================`
  );
}
