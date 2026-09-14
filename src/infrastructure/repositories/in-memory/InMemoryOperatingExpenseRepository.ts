import type { IOperatingExpenseRepository, OperatingExpense, ExpenseCategory } from '../../../core/domain/index.ts';

export const initialOperatingExpenses: OperatingExpense[] = [
  {
    id: 'exp-1',
    category: 'BALLS_EQUIPMENT',
    description: 'Compra de 2 Balones Golty Sintética #5 Oficiales',
    amount: 140000,
    expenseDate: new Date('2026-09-01T10:00:00Z'),
    receiptUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=500&auto=format&fit=crop&q=60',
    createdAt: new Date('2026-09-01T10:00:00Z'),
  },
  {
    id: 'exp-2',
    category: 'BIBS_VESTS',
    description: 'Juego de 12 Petos fluorescentes (Verde y Naranja flúor)',
    amount: 75000,
    expenseDate: new Date('2026-09-05T14:30:00Z'),
    createdAt: new Date('2026-09-05T14:30:00Z'),
  },
  {
    id: 'exp-3',
    category: 'HYDRATION',
    description: 'Bolsas de agua cristal x24 + Gatorade para el tercer tiempo',
    amount: 32000,
    expenseDate: new Date('2026-09-10T19:00:00Z'),
    createdAt: new Date('2026-09-10T19:00:00Z'),
  },
];

export class InMemoryOperatingExpenseRepository implements IOperatingExpenseRepository {
  private expenses: Map<string, OperatingExpense> = new Map();

  constructor(initial: OperatingExpense[] = initialOperatingExpenses) {
    for (const exp of initial) {
      this.expenses.set(exp.id, { ...exp });
    }
  }

  async recordExpense(expense: OperatingExpense): Promise<void> {
    this.expenses.set(expense.id, { ...expense });
  }

  async findAll(): Promise<OperatingExpense[]> {
    return Array.from(this.expenses.values()).sort(
      (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
    );
  }

  async findByCategory(category: ExpenseCategory): Promise<OperatingExpense[]> {
    return Array.from(this.expenses.values()).filter((e) => e.category === category);
  }

  async findById(id: string): Promise<OperatingExpense | null> {
    const found = this.expenses.get(id);
    return found ? { ...found } : null;
  }

  async delete(id: string): Promise<void> {
    this.expenses.delete(id);
  }
}
