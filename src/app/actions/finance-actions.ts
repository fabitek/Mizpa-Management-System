'use server';

import { revalidatePath } from 'next/cache';
import {
  recordPlayerCreditUseCase,
  getPlayerStatementUseCase,
  getMatchFinancialSummaryUseCase,
  getAllPlayersFinancialOverviewUseCase,
  container,
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
  receiptUrl?: string,
  matchId?: string | null
): Promise<FinancialActionResult> {
  try {
    const result = await recordPlayerCreditUseCase.execute({
      playerId,
      amount,
      note,
      receiptUrl,
      matchId,
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

export async function getAllFinancialEntriesAction(): Promise<FinancialActionResult> {
  try {
    const entries = await container.financeRepository.getAllEntries();
    return {
      success: true,
      message: 'Entradas financieras obtenidas.',
      data: entries.map((e) => ({
        ...e,
        referenceDate: e.referenceDate.toISOString(),
        createdAt: e.createdAt.toISOString(),
      })),
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener entradas financieras.',
      errorCode: 'FINANCE_ERROR',
    };
  }
}

export async function recordOperatingExpenseAction(input: {
  category: any;
  description: string;
  amount: number;
  expenseDate?: string;
  receiptUrl?: string;
  recordedByPlayerId?: string;
  matchId?: string;
}): Promise<FinancialActionResult> {
  try {
    const expense = await container.recordOperatingExpenseUseCase.execute({
      category: input.category,
      description: input.description,
      amount: input.amount,
      expenseDate: input.expenseDate ? new Date(input.expenseDate) : new Date(),
      receiptUrl: input.receiptUrl,
      recordedByPlayerId: input.recordedByPlayerId,
      matchId: input.matchId,
    });

    revalidatePath('/wallet');

    return {
      success: true,
      message: `Egreso de $${input.amount.toLocaleString('es-CO')} COP registrado en '${input.description}'.`,
      data: {
        ...expense,
        expenseDate: expense.expenseDate.toISOString(),
        createdAt: expense.createdAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al registrar egreso operativo.',
      errorCode: 'OPERATING_EXPENSE_ERROR',
    };
  }
}

export async function getOperatingExpensesAction(): Promise<FinancialActionResult> {
  try {
    const summary = await container.getAllOperatingExpensesUseCase.execute();

    return {
      success: true,
      message: 'Gastos operativos obtenidos con éxito.',
      data: {
        ...summary,
        expenses: summary.expenses.map((e) => ({
          ...e,
          expenseDate: e.expenseDate.toISOString(),
          createdAt: e.createdAt.toISOString(),
        })),
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al consultar gastos operativos.',
      errorCode: 'OPERATING_EXPENSE_ERROR',
    };
  }
}

export async function deleteOperatingExpenseAction(
  expenseId: string
): Promise<FinancialActionResult> {
  try {
    await container.deleteOperatingExpenseUseCase.execute(expenseId);
    revalidatePath('/wallet');

    return {
      success: true,
      message: 'Gasto operativo eliminado correctamente.',
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al eliminar gasto operativo.',
      errorCode: 'DELETE_EXPENSE_ERROR',
    };
  }
}

export async function parseReceiptOcrAction(
  rawText: string
): Promise<FinancialActionResult> {
  try {
    const result = container.processReceiptOcrUseCase.execute(rawText);
    return {
      success: true,
      message: `Comprobante analizado con éxito (${result.detectedBank}).`,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al analizar el comprobante.',
      errorCode: 'OCR_ERROR',
    };
  }
}

export async function deleteFinancialEntryAction(
  entryId: string
): Promise<FinancialActionResult> {
  try {
    await container.financeRepository.deleteEntry(entryId);
    revalidatePath('/wallet');
    revalidatePath('/matches');

    return {
      success: true,
      message: 'Registro financiero eliminado con éxito.',
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al eliminar el registro financiero.',
      errorCode: 'DELETE_FINANCIAL_ENTRY_ERROR',
    };
  }
}


