import type { IOperatingExpenseRepository, OperatingExpense, ExpenseCategory } from '../domain/index.ts';

export interface RecordOperatingExpenseInput {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expenseDate?: Date;
  receiptUrl?: string;
  recordedByPlayerId?: string;
  matchId?: string;
}

export class RecordOperatingExpenseUseCase {
  private readonly expenseRepository: IOperatingExpenseRepository;

  constructor(expenseRepository: IOperatingExpenseRepository) {
    this.expenseRepository = expenseRepository;
  }

  async execute(input: RecordOperatingExpenseInput): Promise<OperatingExpense> {
    const { category, description, amount, expenseDate, receiptUrl, recordedByPlayerId, matchId } = input;

    if (!description || !description.trim()) {
      throw new Error('La descripción del gasto operativo es obligatoria.');
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error('El monto del gasto operativo debe ser mayor a cero.');
    }

    const newExpense: OperatingExpense = {
      id: crypto.randomUUID(),
      category: category || 'OTHER',
      description: description.trim(),
      amount: Math.round(amount),
      expenseDate: expenseDate || new Date(),
      receiptUrl: receiptUrl?.trim() || undefined,
      recordedByPlayerId: recordedByPlayerId || undefined,
      matchId: matchId || undefined,
      createdAt: new Date(),
    };

    await this.expenseRepository.recordExpense(newExpense);
    return newExpense;
  }
}
