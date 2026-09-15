import type { IGoalRepository } from '../domain/repositories.ts';

export interface DeleteGoalDTO {
  goalId: string;
}

export class DeleteGoalUseCase {
  private readonly goalRepository: IGoalRepository;

  constructor(goalRepository: IGoalRepository) {
    this.goalRepository = goalRepository;
  }

  async execute(dto: DeleteGoalDTO): Promise<void> {
    if (!dto.goalId) {
      throw new Error('Goal ID is required.');
    }
    await this.goalRepository.deleteGoal(dto.goalId);
  }
}
