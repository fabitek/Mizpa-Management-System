'use server';

import { revalidatePath } from 'next/cache';
import {
  settleMatchUseCase,
  createMatchUseCase,
  updateMatchUseCase,
  reconcileMatchAttendancesUseCase,
  deleteMatchUseCase,
  openMatchRegistrationUseCase,
  matchRepository,
} from '../../infrastructure/container.ts';
import {
  MatchAlreadySettledError,
  InvalidAttendanceStateError,
  InvalidFinancialAmountError,
  type Match,
  type MatchStatus,
  type Attendance,
} from '../../core/domain/index.ts';

export interface SettleMatchActionResult {
  success: boolean;
  message: string;
  data?: {
    matchId: string;
    settledFeePerPlayer: number;
    status: string;
    updatedAt: string;
    totalDebitsCreated: number;
  };
  errorCode?: string;
}

export interface CreateMatchActionResult {
  success: boolean;
  message: string;
  data?: Match;
  errorCode?: string;
}

export interface UpdateMatchActionResult {
  success: boolean;
  message: string;
  data?: Match;
  promotedCount?: number;
  promotedAttendances?: Attendance[];
  attendances?: Attendance[];
}

export interface ReconcileMatchActionResult {
  success: boolean;
  message: string;
  data?: {
    match: Match;
    promotedCount: number;
    promotedAttendances: Attendance[];
    activeConfirmedCount: number;
    waitlistCount: number;
    maxPlayers: number;
    allAttendances: Attendance[];
  };
}

export async function settleMatchAction(
  matchId: string
): Promise<SettleMatchActionResult> {
  try {
    const result = await settleMatchUseCase.execute({ matchId });

    revalidatePath('/matches');
    revalidatePath('/wallet');
    revalidatePath('/notifications');

    return {
      success: true,
      message: `Partido liquidado. Cuota fijada en $${result.settledFeePerPlayer.toLocaleString('es-CO')} COP.`,
      data: {
        matchId: result.match.id,
        settledFeePerPlayer: result.settledFeePerPlayer,
        status: result.match.status,
        updatedAt: result.match.updatedAt.toISOString(),
        totalDebitsCreated: result.entries.length,
      },
    };
  } catch (error: unknown) {
    if (error instanceof MatchAlreadySettledError) {
      return {
        success: false,
        message: 'Partido ya liquidado. Cuota inmutable.',
        errorCode: 'MATCH_ALREADY_SETTLED',
      };
    }

    if (error instanceof InvalidAttendanceStateError) {
      return {
        success: false,
        message: 'Sin jugadores presentes (ATTENDED) para liquidar.',
        errorCode: 'INVALID_ATTENDANCE_STATE',
      };
    }

    if (error instanceof InvalidFinancialAmountError) {
      return {
        success: false,
        message: 'Monto inválido para liquidación.',
        errorCode: 'INVALID_FINANCIAL_AMOUNT',
      };
    }

    const genericMessage =
      error instanceof Error ? error.message : 'Fallo al liquidar partido.';

    return {
      success: false,
      message: genericMessage,
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}

function parseColombiaDate(dateInput: string | Date): Date {
  if (dateInput instanceof Date) return dateInput;
  const trimmed = dateInput.trim();
  // If string matches YYYY-MM-DDTHH:mm or YYYY-MM-DDTHH:mm:ss without timezone
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(trimmed)) {
    const hasSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed);
    return new Date(`${trimmed}${hasSeconds ? '' : ':00'}-05:00`);
  }
  return new Date(trimmed);
}

export async function createMatchAction(input: {
  location: string;
  locationAddress?: string;
  googleMapsUrl?: string;
  date: string;
  pitchRentalCost: number;
  extraCosts?: number;
  durationHours?: number;
  parkingFeePerHour?: number;
  maxPlayers?: number;
  openImmediately?: boolean;
}): Promise<CreateMatchActionResult> {
  try {
    const parsedDate = parseColombiaDate(input.date);
    if (isNaN(parsedDate.getTime())) {
      return {
        success: false,
        message: 'Fecha y hora inválidas.',
        errorCode: 'INVALID_DATE',
      };
    }

    const newMatch = await createMatchUseCase.execute({
      location: input.location,
      locationAddress: input.locationAddress,
      googleMapsUrl: input.googleMapsUrl,
      date: parsedDate,
      pitchRentalCost: Number(input.pitchRentalCost) || 0,
      extraCosts: Number(input.extraCosts) || 0,
      durationHours: Number(input.durationHours) || 2,
      parkingFeePerHour: Number(input.parkingFeePerHour) ?? 1000,
      maxPlayers: Number(input.maxPlayers) || 18,
      openImmediately: input.openImmediately ?? true,
    });

    revalidatePath('/matches');
    revalidatePath('/notifications');
    revalidatePath(`/rsvp/${newMatch.id}`);

    return {
      success: true,
      message: `Partido en ${newMatch.location} creado (${newMatch.maxPlayers} cupos).`,
      data: newMatch,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo crear el partido.',
      errorCode: 'CREATE_MATCH_ERROR',
    };
  }
}

export async function getAllMatchesAction(): Promise<{ success: boolean; data: Match[] }> {
  try {
    const matches = await matchRepository.findAll();
    return {
      success: true,
      data: matches,
    };
  } catch {
    return {
      success: false,
      data: [],
    };
  }
}

export async function openMatchRegistrationAction(
  matchId: string
): Promise<{ success: boolean; message: string; data?: Match }> {
  try {
    const match = await openMatchRegistrationUseCase.execute({ matchId });
    revalidatePath('/matches');
    revalidatePath('/notifications');
    revalidatePath(`/rsvp/${matchId}`);
    return {
      success: true,
      message: `Inscripciones abiertas en ${match.location}.`,
      data: match,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo al abrir inscripciones.',
    };
  }
}

export async function updateMatchAction(input: {
  id: string;
  location?: string;
  locationAddress?: string;
  googleMapsUrl?: string;
  date?: string;
  pitchRentalCost?: number;
  extraCosts?: number;
  durationHours?: number;
  parkingFeePerHour?: number;
  maxPlayers?: number;
  status?: MatchStatus;
}): Promise<UpdateMatchActionResult> {
  try {
    let parsedDate: Date | undefined;
    if (input.date) {
      parsedDate = parseColombiaDate(input.date);
      if (isNaN(parsedDate.getTime())) {
        return {
          success: false,
          message: 'Fecha inválida.',
        };
      }
    }

    const { match, promotedAttendances, allAttendances } = await updateMatchUseCase.execute({
      id: input.id,
      location: input.location,
      locationAddress: input.locationAddress,
      googleMapsUrl: input.googleMapsUrl,
      date: parsedDate,
      pitchRentalCost: input.pitchRentalCost,
      extraCosts: input.extraCosts,
      durationHours: input.durationHours,
      parkingFeePerHour: input.parkingFeePerHour,
      maxPlayers: input.maxPlayers,
      status: input.status,
    });

    revalidatePath('/matches');
    revalidatePath('/notifications');
    revalidatePath(`/rsvp/${input.id}`);

    const promoMsg =
      promotedAttendances.length > 0
        ? ` ${promotedAttendances.length} promovido(s) de lista de espera a cancha.`
        : '';

    return {
      success: true,
      message: `Partido en ${match.location} actualizado.${promoMsg}`,
      data: match,
      promotedCount: promotedAttendances.length,
      promotedAttendances,
      attendances: allAttendances,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo al actualizar partido.',
    };
  }
}

export async function reconcileMatchAttendancesAction(
  matchId: string
): Promise<ReconcileMatchActionResult> {
  try {
    const result = await reconcileMatchAttendancesUseCase.execute(matchId);

    revalidatePath('/matches');
    revalidatePath('/notifications');
    revalidatePath(`/rsvp/${matchId}`);

    const msg =
      result.promotedCount > 0
        ? `${result.promotedCount} promovidos de lista de espera a cancha.`
        : 'Cupos al día. Sin promociones pendientes.';

    return {
      success: true,
      message: msg,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Fallo al sincronizar cupos.',
    };
  }
}

export async function deleteMatchAction(
  matchId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await deleteMatchUseCase.execute({ matchId });

    revalidatePath('/matches');
    revalidatePath('/notifications');

    return {
      success: true,
      message: 'Partido eliminado.',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo eliminar el partido.',
    };
  }
}
