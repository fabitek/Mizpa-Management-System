'use server';

import { revalidatePath } from 'next/cache';
import { settleMatchUseCase } from '../../infrastructure/container.ts';
import {
  MatchAlreadySettledError,
  InvalidAttendanceStateError,
  InvalidFinancialAmountError,
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

export async function settleMatchAction(
  matchId: string
): Promise<SettleMatchActionResult> {
  try {
    const result = await settleMatchUseCase.execute({ matchId });

    revalidatePath('/matches');

    return {
      success: true,
      message: `Partido liquidado con éxito. Cuota congelada: $${result.settledFeePerPlayer.toLocaleString()} por jugador.`,
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
