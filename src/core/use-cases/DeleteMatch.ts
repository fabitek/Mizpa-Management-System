import type { IMatchRepository, IAttendanceRepository } from '../domain/index.ts';

export interface DeleteMatchInput {
  matchId: string;
}

export class DeleteMatchUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly attendanceRepository?: IAttendanceRepository;

  constructor(
    matchRepository: IMatchRepository,
    attendanceRepository?: IAttendanceRepository
  ) {
    this.matchRepository = matchRepository;
    this.attendanceRepository = attendanceRepository;
  }

  async execute(input: DeleteMatchInput): Promise<void> {
    const existing = await this.matchRepository.findById(input.matchId);
    if (!existing) {
      // Already gone or does not exist
      return;
    }

    if (existing.status === 'SETTLED') {
      throw new Error('No se puede eliminar un partido que ya ha sido liquidado con cargos financieros registrados.');
    }

    if (this.attendanceRepository) {
      await this.attendanceRepository.deleteByMatchId(input.matchId);
    }

    await this.matchRepository.delete(input.matchId);
  }
}
