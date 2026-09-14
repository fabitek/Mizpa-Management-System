import type { IOperatingExpenseRepository } from '../domain/index.ts';

export class DeleteOperatingExpenseUseCase {
  private readonly expenseRepository: IOperatingExpenseRepository;

  constructor(expenseRepository: IOperatingExpenseRepository) {
    this.expenseRepository = expenseRepository;
  }

  async execute(expenseId: string): Promise<void> {
    if (!expenseId) {
      throw new Error('El ID del gasto operativo es requerido.');
    }
    await this.expenseRepository.delete(expenseId);
  }
}
