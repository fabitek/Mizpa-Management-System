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
      message: `Abono por $${amount.toLocaleString('es-CO')} guardado. Saldo actual: $${result.newBalance.toLocaleString('es-CO')}.`,
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
        message: 'El valor debe ser superior a cero.',
        errorCode: 'INVALID_AMOUNT',
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo registrar el abono.',
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
      message: 'Estado de cuenta actualizado.',
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
      message: error instanceof Error ? error.message : 'Error al cargar estado de cuenta.',
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
      message: 'Balance del partido listo.',
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
        message: 'Partido inexistente.',
        errorCode: 'MATCH_NOT_FOUND',
      };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo obtener el resumen financiero.',
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
      message: 'Balance de tesorería cargado.',
      data: overview,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al cargar tesorería.',
      errorCode: 'UNKNOWN_ERROR',
    };
  }
}

export async function getAllFinancialEntriesAction(): Promise<FinancialActionResult> {
  try {
    const entries = await container.financeRepository.getAllEntries();
    return {
      success: true,
      message: 'Movimientos financieros cargados.',
      data: entries.map((e) => ({
        ...e,
        referenceDate: e.referenceDate.toISOString(),
        createdAt: e.createdAt.toISOString(),
      })),
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al consultar libro contable.',
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
      message: `Egreso guardado: $${input.amount.toLocaleString('es-CO')} COP en ${input.description}.`,
      data: {
        ...expense,
        expenseDate: expense.expenseDate.toISOString(),
        createdAt: expense.createdAt.toISOString(),
      },
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo guardar el gasto.',
      errorCode: 'OPERATING_EXPENSE_ERROR',
    };
  }
}

export async function getOperatingExpensesAction(): Promise<FinancialActionResult> {
  try {
    const summary = await container.getAllOperatingExpensesUseCase.execute();

    return {
      success: true,
      message: 'Libro de egresos cargado.',
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
      message: error instanceof Error ? error.message : 'Error al consultar egresos.',
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
      message: 'Gasto eliminado del libro contable.',
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo eliminar el gasto.',
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
      message: `Comprobante leído: ${result.detectedBank}.`,
      data: result,
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo en lectura OCR del comprobante.',
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
      message: 'Movimiento eliminado del balance.',
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo anular el movimiento.',
      errorCode: 'DELETE_FINANCIAL_ENTRY_ERROR',
    };
  }
}


