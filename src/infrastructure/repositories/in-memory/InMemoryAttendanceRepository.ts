import type { Attendance, IAttendanceRepository } from '../../../core/domain/index.ts';

export class InMemoryAttendanceRepository implements IAttendanceRepository {
  private attendances: Attendance[];

  constructor(initialAttendances: Attendance[] = []) {
    this.attendances = initialAttendances.map((a) => ({ ...a }));
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
  }

  async update(attendance: Attendance): Promise<void> {
    const index = this.attendances.findIndex((a) => a.id === attendance.id);
    if (index === -1) {
      throw new Error(`Attendance with ID '${attendance.id}' not found.`);
    }
    this.attendances[index] = { ...attendance };
  }

  // Helper for UI/testing
  async findAll(): Promise<Attendance[]> {
    return this.attendances.map((a) => ({ ...a }));
  }
}
