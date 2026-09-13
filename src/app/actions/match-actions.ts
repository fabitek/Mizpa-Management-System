'use server';

import { revalidatePath } from 'next/cache';
import {
  settleMatchUseCase,
  createMatchUseCase,
  openMatchRegistrationUseCase,
  matchRepository,
} from '../../infrastructure/container.ts';
import {
  MatchAlreadySettledError,
  InvalidAttendanceStateError,
  InvalidFinancialAmountError,
  type Match,
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
      message: `Partido liquidado con éxito. Cuota congelada: $${result.settledFeePerPlayer.toLocaleString('es-CO')} por jugador.`,
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
        message: 'El partido ya fue liquidado previamente y su cuota está congelada.',
        errorCode: 'MATCH_ALREADY_SETTLED',
      };
    }

    if (error instanceof InvalidAttendanceStateError) {
      return {
        success: false,
        message: 'No es posible liquidar: no se encontraron jugadores con estado ATTENDED.',
        errorCode: 'INVALID_ATTENDANCE_STATE',
      };
    }

    if (error instanceof InvalidFinancialAmountError) {
      return {
        success: false,
        message: 'Monto financiero inválido durante el cálculo de la liquidación.',
        errorCode: 'INVALID_FINANCIAL_AMOUNT',
      };
    }

    const genericMessage =
      error instanceof Error ? error.message : 'Error desconocido al liquidar el partido.';

    return {
      success: false,
      message: genericMessage,
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}

export async function createMatchAction(input: {
  location: string;
  locationAddress?: string;
  googleMapsUrl?: string;
  date: string;
  pitchRentalCost: number;
  extraCosts: number;
  maxPlayers?: number;
  openImmediately?: boolean;
}): Promise<CreateMatchActionResult> {
  try {
    const parsedDate = new Date(input.date);
    if (isNaN(parsedDate.getTime())) {
      return {
        success: false,
        message: 'Fecha y hora del partido no válidas.',
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
      maxPlayers: Number(input.maxPlayers) || 18,
      openImmediately: input.openImmediately ?? true,
    });

    revalidatePath('/matches');
    revalidatePath('/notifications');
    revalidatePath(`/rsvp/${newMatch.id}`);

    return {
      success: true,
      message: `¡Partido en ${newMatch.location} creado exitosamente con cupo de ${newMatch.maxPlayers} jugadores!`,
      data: newMatch,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al crear el partido.',
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
      message: `Inscripciones abiertas con éxito para ${match.location}.`,
      data: match,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al abrir inscripciones.',
    };
  }
}
