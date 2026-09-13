import type { Match, IMatchRepository, MatchStatus } from '../domain/index.ts';

export interface CreateMatchInput {
  id?: string;
  date: Date;
  location: string;
  locationAddress?: string;
  googleMapsUrl?: string;
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
      locationAddress,
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

    // Clean emojis and symbols for search query
    const cleanLocation = location.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    const cleanAddress = locationAddress ? locationAddress.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() : '';
    
    // Prefer searching for the address + location name or address
    const fullLocationQuery = cleanAddress
      ? `${cleanAddress} ${cleanLocation}`.trim()
      : cleanLocation;

    const computedGoogleMapsUrl =
      input.googleMapsUrl && input.googleMapsUrl.trim().length > 0
        ? input.googleMapsUrl.trim()
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullLocationQuery || location.trim())}`;

    const newMatch: Match = {
      id: matchId,
      date,
      location: location.trim(),
      locationAddress: locationAddress ? locationAddress.trim() : undefined,
      googleMapsUrl: computedGoogleMapsUrl,
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
