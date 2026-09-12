import type { Match, IMatchRepository } from '../domain/index.ts';
import {
  MatchNotFoundError,
  MatchAlreadySettledError,
} from '../domain/index.ts';

export interface OpenMatchRegistrationInput {
  matchId: string;
}

export class OpenMatchRegistrationUseCase {
  private readonly matchRepository: IMatchRepository;

  constructor(matchRepository: IMatchRepository) {
    this.matchRepository = matchRepository;
  }

  async execute(input: OpenMatchRegistrationInput): Promise<Match> {
    const { matchId } = input;
    const match = await this.matchRepository.findById(matchId);

    if (!match) {
      throw new MatchNotFoundError(`Match with ID '${matchId}' not found.`);
    }

    if (match.status === 'SETTLED') {
      throw new MatchAlreadySettledError(
        `Cannot open registration for match '${matchId}': already settled.`
      );
    }

    if (match.status === 'OPEN_REGISTRATION') {
      return match;
    }

    const updatedMatch: Match = {
      ...match,
      status: 'OPEN_REGISTRATION',
      updatedAt: new Date(),
    };

    await this.matchRepository.update(updatedMatch);

    return updatedMatch;
  }
}
