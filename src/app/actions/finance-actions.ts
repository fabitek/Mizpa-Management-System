'use server';

import { revalidatePath } from 'next/cache';
import {
  recordPlayerCreditUseCase,
  getPlayerStatementUseCase,
  getMatchFinancialSummaryUseCase,
  getAllPlayersFinancialOverviewUseCase,
} from '../../infrastructure/container.ts';
import { InvalidFinancialAmountError, MatchNotFoundError } from '../../core/domain/index.ts';

export interface FinancialActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
}

export async function recordPlayerCreditAction(
  playerId: string,
  amount: number,
  note?: string,
  receiptUrl?: string
): Promise<FinancialActionResult> {
  try {
    const result = await recordPlayerCreditUseCase.execute({
      playerId,
      amount,
      note,
      receiptUrl,
    });

    revalidatePath('/wallet');
    revalidatePath('/matches');

    return {
      success: true,
      message: `Abono de $${amount.toLocaleString('es-CO')} registrado con éxito. Nuevo saldo: $${result.newBalance.toLocaleString('es-CO')}.`,
      data: {
        entry: {
          ...result.entry,
          referenceDate: result.entry.referenceDate.toISOString(),
          createdAt: result.entry.createdAt.toISOString(),
        },
        newBalance: result.newBalance,
      },
    };
  } catch (error: unknown) {
    if (error instanceof InvalidFinancialAmountError) {
      return {
        success: false,
        message: 'El monto del abono debe ser mayor a cero.',
        errorCode: 'INVALID_AMOUNT',
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al registrar el abono.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}

export async function getPlayerStatementAction(
  playerId: string
): Promise<FinancialActionResult> {
  try {
    const statement = await getPlayerStatementUseCase.execute(playerId);

    return {
      success: true,
      message: 'Estado de cuenta obtenido con éxito.',
      data: {
        ...statement,
        entries: statement.entries.map((e) => ({
          ...e,
          referenceDate: e.referenceDate.toISOString(),
          createdAt: e.createdAt.toISOString(),
        })),
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al consultar estado de cuenta.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}

export async function getMatchSummaryAction(
  matchId: string
): Promise<FinancialActionResult> {
  try {
    const summary = await getMatchFinancialSummaryUseCase.execute(matchId);

    return {
      success: true,
      message: 'Resumen financiero obtenido con éxito.',
      data: {
        ...summary,
        date: summary.date.toISOString(),
        entries: summary.entries.map((e) => ({
          ...e,
          referenceDate: e.referenceDate.toISOString(),
          createdAt: e.createdAt.toISOString(),
        })),
      },
    };
  } catch (error: unknown) {
    if (error instanceof MatchNotFoundError) {
      return {
        success: false,
        message: 'Partido no encontrado.',
        errorCode: 'MATCH_NOT_FOUND',
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al consultar resumen financiero.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}

export async function getTreasuryOverviewAction(
  playerIds: string[]
): Promise<FinancialActionResult> {
  try {
    const overview = await getAllPlayersFinancialOverviewUseCase.execute(playerIds);

    return {
      success: true,
      message: 'Resumen global de tesorería obtenido con éxito.',
      data: overview,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al consultar tesorería.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}
