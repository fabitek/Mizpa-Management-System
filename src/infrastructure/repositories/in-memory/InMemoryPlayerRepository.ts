import type { Player, IPlayerRepository } from '../../../core/domain/index.ts';
import { loadDB, saveDB } from './FileDB.ts';

export class InMemoryPlayerRepository implements IPlayerRepository {
  private players: Map<string, Player>;

  constructor(initialPlayers: Player[] = []) {
    const db = loadDB();
    if (db && Array.isArray(db.players) && db.players.length > 0) {
      this.players = new Map(db.players.map((p) => [p.id, { ...p }]));
    } else {
      this.players = new Map(initialPlayers.map((p) => [p.id, { ...p }]));
      saveDB({ players: Array.from(this.players.values()) });
    }
  }

  private persist() {
    saveDB({ players: Array.from(this.players.values()) });
  }

  async findById(id: string): Promise<Player | null> {
    const player = this.players.get(id);
    return player ? { ...player } : null;
  }

  async findByDocumentId(documentId: string): Promise<Player | null> {
    const cleanDoc = documentId.trim().toLowerCase();
    for (const player of this.players.values()) {
      if (player.documentId && player.documentId.trim().toLowerCase() === cleanDoc) {
        return { ...player };
      }
    }
    return null;
  }

  async findAll(): Promise<Player[]> {
    return Array.from(this.players.values()).map((p) => ({ ...p }));
  }

  async save(player: Player): Promise<void> {
    this.players.set(player.id, { ...player });
    this.persist();
  }

  async update(player: Player): Promise<void> {
    if (!this.players.has(player.id)) {
      throw new Error(`Player with ID '${player.id}' not found in repository.`);
    }
    this.players.set(player.id, { ...player });
    this.persist();
  }
}
