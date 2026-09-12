import type { Match, IMatchRepository } from '../../../core/domain/index.ts';

export class InMemoryMatchRepository implements IMatchRepository {
  private matches: Map<string, Match>;

  constructor(initialMatches: Match[] = []) {
    this.matches = new Map(initialMatches.map((m) => [m.id, { ...m }]));
  }

  async findById(id: string): Promise<Match | null> {
    const match = this.matches.get(id);
    return match ? { ...match } : null;
  }

  async save(match: Match): Promise<void> {
    this.matches.set(match.id, { ...match });
  }

  async update(match: Match): Promise<void> {
    if (!this.matches.has(match.id)) {
      throw new Error(`Match with ID '${match.id}' not found in repository.`);
    }
    this.matches.set(match.id, { ...match });
  }

  // Helper for UI/testing
  async findAll(): Promise<Match[]> {
    return Array.from(this.matches.values()).map((m) => ({ ...m }));
  }
}
