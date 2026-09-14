import type { IOperatingExpenseRepository, OperatingExpense, ExpenseCategory } from '../domain/index.ts';

export interface OperatingExpensesSummary {
  expenses: OperatingExpense[];
  totalAmount: number;
  categoryBreakdown: Record<ExpenseCategory, number>;
  countByCategory: Record<ExpenseCategory, number>;
}

export class GetAllOperatingExpensesUseCase {
  private readonly expenseRepository: IOperatingExpenseRepository;

  constructor(expenseRepository: IOperatingExpenseRepository) {
    this.expenseRepository = expenseRepository;
  }

  async execute(): Promise<OperatingExpensesSummary> {
    const expenses = await this.expenseRepository.findAll();

    const categoryBreakdown: Record<ExpenseCategory, number> = {
      BALLS_EQUIPMENT: 0,
      BIBS_VESTS: 0,
      HYDRATION: 0,
      REFEREE_STAFF: 0,
      FIRST_AID: 0,
      AWARDS_CAPTAIN: 0,
      FIELD_MAINTENANCE: 0,
      OTHER: 0,
    };

    const countByCategory: Record<ExpenseCategory, number> = {
      BALLS_EQUIPMENT: 0,
      BIBS_VESTS: 0,
      HYDRATION: 0,
      REFEREE_STAFF: 0,
      FIRST_AID: 0,
      AWARDS_CAPTAIN: 0,
      FIELD_MAINTENANCE: 0,
      OTHER: 0,
    };

    let totalAmount = 0;

    for (const exp of expenses) {
      totalAmount += exp.amount;
      const cat = exp.category || 'OTHER';
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + exp.amount;
      countByCategory[cat] = (countByCategory[cat] || 0) + 1;
    }

    // Sort descending by date
    const sorted = [...expenses].sort(
      (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
    );

    return {
      expenses: sorted,
      totalAmount,
      categoryBreakdown,
      countByCategory,
    };
  }
}
