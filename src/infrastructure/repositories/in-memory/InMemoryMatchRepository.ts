import type { Match, IMatchRepository } from '../../../core/domain/index.ts';
import { loadDB, saveDB } from './FileDB.ts';

export class InMemoryMatchRepository implements IMatchRepository {
  private matches: Map<string, Match>;

  constructor(initialMatches: Match[] = []) {
    const db = loadDB();
    if (db && Array.isArray(db.matches)) {
      this.matches = new Map(db.matches.map((m) => [m.id, { ...m }]));
    } else {
      this.matches = new Map(initialMatches.map((m) => [m.id, { ...m }]));
      saveDB({ matches: Array.from(this.matches.values()) });
    }
  }

  private persist() {
    saveDB({ matches: Array.from(this.matches.values()) });
  }

  async findById(id: string): Promise<Match | null> {
    const match = this.matches.get(id);
    return match ? { ...match } : null;
  }

  async save(match: Match): Promise<void> {
    this.matches.set(match.id, { ...match });
    this.persist();
  }

  async update(match: Match): Promise<void> {
    if (!this.matches.has(match.id)) {
      throw new Error(`Match with ID '${match.id}' not found in repository.`);
    }
    this.matches.set(match.id, { ...match });
    this.persist();
  }

  async delete(id: string): Promise<void> {
    this.matches.delete(id);
    this.persist();
  }

  // Helper for UI/testing
  async findAll(): Promise<Match[]> {
    return Array.from(this.matches.values()).map((m) => ({ ...m }));
  }
}
