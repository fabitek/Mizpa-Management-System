'use server';

import { revalidatePath } from 'next/cache';
import {
  registerAttendanceUseCase,
  cancelAttendanceUseCase,
  checkinAttendanceUseCase,
  openMatchRegistrationUseCase,
  createPlayerUseCase,
  playerRepository,
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
      message: `Jugador ${player.fullName} registrado correctamente.`,
      data: player,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al registrar jugador.',
      errorCode: 'CREATE_PLAYER_ERROR',
    };
  }
}

export async function registerAttendanceAction(
  matchId: string,
  playerId: string,
  guestName?: string,
  hasVehicle?: boolean,
  vehiclePlate?: string
): Promise<ActionResult> {
  try {
    const result = await registerAttendanceUseCase.execute({
      matchId,
      playerId,
      guestName,
      hasVehicle,
      vehiclePlate,
    });

    revalidatePath('/matches');
    revalidatePath(`/rsvp/${matchId}`);

    const displayName = guestName ? `Invitado (+1: ${guestName})` : 'Jugador';
    const vehicleMsg = hasVehicle && vehiclePlate ? ` (Vehículo: ${vehiclePlate.toUpperCase()})` : '';
    const statusMsg = result.isWaitlist
      ? `${displayName}${vehicleMsg} ingresó en LISTA DE ESPERA (Cupo lleno).`
      : `${displayName}${vehicleMsg} CONFIRMADO en cancha (${result.activeConfirmedCount}/${result.maxPlayers}).`;

    return {
      success: true,
      message: statusMsg,
      data: result,
    };
  } catch (error: unknown) {
    if (error instanceof PlayerAlreadyRegisteredError) {
      return {
        success: false,
        message: 'Este jugador o invitado ya está registrado para este partido.',
        errorCode: 'ALREADY_REGISTERED',
      };
    }
    if (error instanceof MatchRegistrationClosedError) {
      return {
        success: false,
        message: 'Las inscripciones para este partido no están abiertas.',
        errorCode: 'REGISTRATION_CLOSED',
      };
    }
    if (error instanceof MatchNotFoundError) {
      return {
        success: false,
        message: 'Partido no encontrado.',
        errorCode: 'MATCH_NOT_FOUND',
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error desconocido al inscribir.',
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

    let msg = 'Inscripción cancelada correctamente.';
    if (result.promotedAttendance) {
      msg += ` ¡Se promovió automáticamente a un jugador de la Lista de Espera a CONFIRMADO!`;
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
        message: 'No se puede cancelar la asistencia: el partido ya fue liquidado.',
        errorCode: 'MATCH_ALREADY_SETTLED',
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al cancelar la inscripción.',
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
        ? 'Asistencia marcada como PRESENTE (ATTENDED).'
        : 'Asistencia reajustada a CONFIRMADO (sin check-in aún).';

    return {
      success: true,
      message: msg,
      data: result,
    };
  } catch (error: unknown) {
    if (error instanceof MatchAlreadySettledError) {
      return {
        success: false,
        message: 'El partido ya fue liquidado, no se puede alterar el check-in.',
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
      message: error instanceof Error ? error.message : 'Error al actualizar el check-in.',
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
      message: `Inscripciones abiertas con éxito para el partido en ${match.location}.`,
      data: match,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al abrir inscripciones.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}
