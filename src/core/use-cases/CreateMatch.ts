import type { Match, IMatchRepository, MatchStatus } from '../domain/index.ts';

export interface CreateMatchInput {
  id?: string;
  date: Date;
  location: string;
  pitchRentalCost: number;
  extraCosts: number;
  maxPlayers: number;
  openImmediately?: boolean;
}

export class CreateMatchUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly idGenerator?: () => string;

  constructor(
    matchRepository: IMatchRepository,
    idGenerator?: () => string
  ) {
    this.matchRepository = matchRepository;
    this.idGenerator = idGenerator;
  }

  async execute(input: CreateMatchInput): Promise<Match> {
    const {
      id,
      date,
      location,
      pitchRentalCost,
      extraCosts,
      maxPlayers,
      openImmediately = false,
    } = input;

    if (!location || location.trim().length === 0) {
      throw new Error('Match location cannot be empty.');
    }

    if (pitchRentalCost < 0 || extraCosts < 0) {
      throw new Error('Match rental and extra costs cannot be negative.');
    }

    if (maxPlayers <= 0) {
      throw new Error('Maximum players count must be greater than 0.');
    }

    const matchId =
      id ??
      (this.idGenerator
        ? this.idGenerator()
        : `match-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`);

    const status: MatchStatus = openImmediately ? 'OPEN_REGISTRATION' : 'DRAFT';
    const now = new Date();

    const newMatch: Match = {
      id: matchId,
      date,
      location: location.trim(),
      pitchRentalCost,
      extraCosts,
      maxPlayers,
      settledFeePerPlayer: null,
      status,
      createdAt: now,
      updatedAt: now,
    };

    await this.matchRepository.save(newMatch);

    return newMatch;
  }
}
