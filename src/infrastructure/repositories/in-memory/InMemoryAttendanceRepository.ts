import type { Attendance, IAttendanceRepository } from '../../../core/domain/index.ts';
import { loadDB, saveDB } from './FileDB.ts';

export class InMemoryAttendanceRepository implements IAttendanceRepository {
  private attendances: Attendance[];

  constructor(initialAttendances: Attendance[] = []) {
    const db = loadDB();
    if (db && Array.isArray(db.attendances)) {
      this.attendances = db.attendances.map((a) => ({ ...a }));
    } else {
      this.attendances = initialAttendances.map((a) => ({ ...a }));
      saveDB({ attendances: this.attendances });
    }
  }

  private persist() {
    saveDB({ attendances: this.attendances });
  }

  async findById(id: string): Promise<Attendance | null> {
    const attendance = this.attendances.find((a) => a.id === id);
    return attendance ? { ...attendance } : null;
  }

  async findByMatchId(matchId: string): Promise<Attendance[]> {
    return this.attendances
      .filter((a) => a.matchId === matchId)
      .map((a) => ({ ...a }));
  }

  async findByPlayerId(playerId: string): Promise<Attendance[]> {
    return this.attendances
      .filter((a) => a.playerId === playerId || a.registeredByPlayerId === playerId)
      .map((a) => ({ ...a }));
  }

  async save(attendance: Attendance): Promise<void> {
    this.attendances.push({ ...attendance });
    this.persist();
  }

  async update(attendance: Attendance): Promise<void> {
    const index = this.attendances.findIndex((a) => a.id === attendance.id);
    if (index === -1) {
      throw new Error(`Attendance with ID '${attendance.id}' not found.`);
    }
    this.attendances[index] = { ...attendance };
    this.persist();
  }

  async delete(id: string): Promise<void> {
    this.attendances = this.attendances.filter((a) => a.id !== id);
    this.persist();
  }

  async deleteByMatchId(matchId: string): Promise<void> {
    this.attendances = this.attendances.filter((a) => a.matchId !== matchId);
    this.persist();
  }

  // Helper for UI/testing
  async findAll(): Promise<Attendance[]> {
    return this.attendances.map((a) => ({ ...a }));
  }
}
