import type { Match, IMatchRepository, MatchStatus } from '../domain/index.ts';

export interface UpdateMatchInput {
  id: string;
  date?: Date;
  location?: string;
  locationAddress?: string;
  googleMapsUrl?: string;
  pitchRentalCost?: number;
  extraCosts?: number;
  durationHours?: number;
  parkingFeePerHour?: number;
  maxPlayers?: number;
  status?: MatchStatus;
}

export class UpdateMatchUseCase {
  private readonly matchRepository: IMatchRepository;

  constructor(matchRepository: IMatchRepository) {
    this.matchRepository = matchRepository;
  }

  async execute(input: UpdateMatchInput): Promise<Match> {
    const existing = await this.matchRepository.findById(input.id);
    if (!existing) {
      throw new Error(`Match with ID '${input.id}' not found.`);
    }

    if (existing.status === 'SETTLED') {
      throw new Error('No se puede modificar un partido que ya ha sido liquidado.');
    }

    const location = input.location !== undefined ? input.location.trim() : existing.location;
    if (!location) {
      throw new Error('La sede del partido no puede estar vacía.');
    }

    const locationAddress =
      input.locationAddress !== undefined ? input.locationAddress.trim() : existing.locationAddress;

    let computedGoogleMapsUrl = existing.googleMapsUrl;
    if (input.googleMapsUrl !== undefined) {
      if (input.googleMapsUrl.trim().length > 0) {
        computedGoogleMapsUrl = input.googleMapsUrl.trim();
      } else {
        const cleanLocation = location.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
        const cleanAddress = locationAddress ? locationAddress.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim() : '';
        const fullLocationQuery = cleanAddress ? `${cleanAddress} ${cleanLocation}`.trim() : cleanLocation;
        computedGoogleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullLocationQuery || location)}`;
      }
    }

    const updatedMatch: Match = {
      ...existing,
      location,
      locationAddress: locationAddress || undefined,
      googleMapsUrl: computedGoogleMapsUrl,
      date: input.date || existing.date,
      pitchRentalCost: input.pitchRentalCost !== undefined ? Number(input.pitchRentalCost) : existing.pitchRentalCost,
      extraCosts: input.extraCosts !== undefined ? Number(input.extraCosts) : existing.extraCosts,
      durationHours: input.durationHours !== undefined ? Number(input.durationHours) : existing.durationHours,
      parkingFeePerHour:
        input.parkingFeePerHour !== undefined ? Number(input.parkingFeePerHour) : existing.parkingFeePerHour,
      maxPlayers: input.maxPlayers !== undefined ? Number(input.maxPlayers) : existing.maxPlayers,
      status: input.status || existing.status,
      updatedAt: new Date(),
    };

    if (updatedMatch.pitchRentalCost < 0 || updatedMatch.extraCosts < 0) {
      throw new Error('Los costos no pueden ser negativos.');
    }

    if (updatedMatch.maxPlayers <= 0) {
      throw new Error('El número máximo de jugadores debe ser mayor a cero.');
    }

    await this.matchRepository.update(updatedMatch);

    return updatedMatch;
  }
}
