import type { Match, IMatchRepository, MatchStatus } from '../domain/index.ts';

export interface CreateMatchInput {
  id?: string;
  date: Date;
  location: string;
  locationAddress?: string;
  googleMapsUrl?: string;
  pitchRentalCost: number;
  extraCosts?: number;
  durationHours?: number;
  parkingFeePerHour?: number;
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
      extraCosts = 0,
      durationHours = 2,
      parkingFeePerHour = 1000,
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

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let matchId = crypto.randomUUID();
    if (id && UUID_REGEX.test(id)) {
      matchId = id;
    } else if (this.idGenerator) {
      const gen = this.idGenerator();
      if (UUID_REGEX.test(gen)) {
        matchId = gen;
      }
    }

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
      durationHours,
      parkingFeePerHour,
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
