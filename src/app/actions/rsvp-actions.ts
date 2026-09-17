'use server';

import { revalidatePath } from 'next/cache';
import {
  registerAttendanceUseCase,
  cancelAttendanceUseCase,
  checkinAttendanceUseCase,
  openMatchRegistrationUseCase,
  createPlayerUseCase,
  checkAndNotifyCapacityReachedUseCase,
  playerRepository,
  attendanceRepository,
} from '../../infrastructure/container.ts';
import {
  MatchNotFoundError,
  MatchRegistrationClosedError,
  PlayerAlreadyRegisteredError,
  MatchAlreadySettledError,
  InvalidAttendanceStateError,
  Player,
} from '../../core/domain/index.ts';

export interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
}

export async function createPlayerAction(input: {
  fullName: string;
  documentId: string;
  phone: string;
  alias?: string;
  email?: string;
}): Promise<ActionResult<Player>> {
  try {
    const player = await createPlayerUseCase.execute(input);
    revalidatePath('/matches');
    revalidatePath('/wallet');
    return {
      success: true,
      message: `Jugador ${player.fullName} registrado.`,
      data: player,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo registrar el jugador.',
      errorCode: 'CREATE_PLAYER_ERROR',
    };
  }
}

export async function registerAttendanceAction(
  matchId: string,
  playerId: string,
  guestName?: string,
  hasVehicle?: boolean,
  vehiclePlate?: string,
  guestType?: 'PLAYER' | 'COMPANION'
): Promise<ActionResult> {
  try {
    const result = await registerAttendanceUseCase.execute({
      matchId,
      playerId,
      guestName,
      guestType,
      hasVehicle,
      vehiclePlate,
    });

    revalidatePath('/matches');
    revalidatePath(`/rsvp/${matchId}`);

    const isCompanion = guestType === 'COMPANION';
    const displayName = guestName
      ? isCompanion
        ? `Acompañante (+1: ${guestName})`
        : `Invitado (+1: ${guestName})`
      : 'Jugador';
    const vehicleMsg = hasVehicle && vehiclePlate ? ` (Vehículo: ${vehiclePlate.toUpperCase()})` : '';
    const statusMsg = isCompanion
      ? `${displayName}${vehicleMsg}: registrado como acompañante.`
      : result.isWaitlist
      ? `${displayName}${vehicleMsg}: en lista de espera (cupos llenos).`
      : `${displayName}${vehicleMsg}: cupo confirmado (${result.activeConfirmedCount}/${result.maxPlayers}).`;

    // Automated 10-player capacity check trigger
    try {
      if (result.attendance.status === 'CONFIRMED') {
        await checkAndNotifyCapacityReachedUseCase.execute({ matchId });
      }
    } catch (capacityErr) {
      console.warn('Capacity trigger warning (non-blocking):', capacityErr);
    }

    return {
      success: true,
      message: statusMsg,
      data: result,
    };
  } catch (error: unknown) {
    if (error instanceof PlayerAlreadyRegisteredError) {
      return {
        success: false,
        message: 'Ya inscrito en este partido.',
        errorCode: 'ALREADY_REGISTERED',
      };
    }
    if (error instanceof MatchRegistrationClosedError) {
      return {
        success: false,
        message: 'Inscripciones cerradas para este partido.',
        errorCode: 'REGISTRATION_CLOSED',
      };
    }
    if (error instanceof MatchNotFoundError) {
      return {
        success: false,
        message: 'Partido inexistente.',
        errorCode: 'MATCH_NOT_FOUND',
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo al procesar inscripción.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}

export async function cancelAttendanceAction(
  attendanceId: string
): Promise<ActionResult> {
  try {
    const result = await cancelAttendanceUseCase.execute({ attendanceId });

    revalidatePath('/matches');

    let msg = 'Inscripción cancelada.';
    if (result.promotedAttendance) {
      msg += ` Cupo asignado al siguiente en lista de espera.`;
      // Trigger automated 10-player capacity check if promotion completed 10 players
      try {
        await checkAndNotifyCapacityReachedUseCase.execute({
          matchId: result.cancelledAttendance.matchId,
        });
      } catch (capacityErr) {
        console.warn('Capacity promotion trigger warning (non-blocking):', capacityErr);
      }
    }

    return {
      success: true,
      message: msg,
      data: result,
    };
  } catch (error: unknown) {
    if (error instanceof MatchAlreadySettledError) {
      return {
        success: false,
        message: 'Partido ya liquidado. No se puede cancelar asistencia.',
        errorCode: 'MATCH_ALREADY_SETTLED',
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo cancelar la inscripción.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}

export async function checkinAttendanceAction(
  attendanceId: string,
  status: 'ATTENDED' | 'CONFIRMED'
): Promise<ActionResult> {
  try {
    const result = await checkinAttendanceUseCase.execute({ attendanceId, status });

    revalidatePath('/matches');

    const msg =
      status === 'ATTENDED'
        ? 'Asistencia confirmada en cancha (ATTENDED).'
        : 'Check-in revertido a CONFIRMADO.';

    return {
      success: true,
      message: msg,
      data: result,
    };
  } catch (error: unknown) {
    if (error instanceof MatchAlreadySettledError) {
      return {
        success: false,
        message: 'Partido liquidado. Asistencia bloqueada.',
        errorCode: 'MATCH_ALREADY_SETTLED',
      };
    }
    if (error instanceof InvalidAttendanceStateError) {
      return {
        success: false,
        message: error.message,
        errorCode: 'INVALID_STATE',
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo al actualizar check-in.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}

export async function openMatchRegistrationAction(
  matchId: string
): Promise<ActionResult> {
  try {
    const match = await openMatchRegistrationUseCase.execute({ matchId });

    revalidatePath('/matches');

    return {
      success: true,
      message: `Inscripciones abiertas en ${match.location}.`,
      data: match,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo al abrir inscripciones.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}

export async function updateAttendanceGuestTypeAction(
  attendanceId: string,
  guestType: 'PLAYER' | 'COMPANION'
): Promise<ActionResult> {
  try {
    const attendance = await attendanceRepository.findById(attendanceId);
    if (!attendance) {
      return {
        success: false,
        message: 'Asistencia no encontrada.',
        errorCode: 'ATTENDANCE_NOT_FOUND',
      };
    }

    const updatedAttendance = {
      ...attendance,
      guestType,
    };

    await attendanceRepository.update(updatedAttendance);

    revalidatePath('/matches');
    revalidatePath(`/rsvp/${attendance.matchId}`);

    const typeLabel = guestType === 'COMPANION' ? 'Acompañante (no juega)' : 'Invitado (juega cancha)';
    return {
      success: true,
      message: `Rol de invitado: ${typeLabel}.`,
      data: updatedAttendance,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo cambiar rol de invitado.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}

