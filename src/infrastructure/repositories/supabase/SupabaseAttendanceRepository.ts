import type { SupabaseClient } from '@supabase/supabase-js';
import type { Attendance, IAttendanceRepository, AttendanceStatus } from '../../../core/domain/index.ts';

interface AttendanceRow {
  id: string;
  match_id: string;
  player_id: string;
  status: string;
  registered_at: string;
  registered_by_player_id?: string | null;
  guest_name?: string | null;
}

export class SupabaseAttendanceRepository implements IAttendanceRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private mapRowToEntity(row: AttendanceRow): Attendance {
    return {
      id: row.id,
      matchId: row.match_id,
      playerId: row.player_id,
      status: row.status as AttendanceStatus,
      registeredAt: new Date(row.registered_at),
      registeredByPlayerId: row.registered_by_player_id ?? undefined,
      guestName: row.guest_name ?? undefined,
    };
  }

  private mapEntityToRow(attendance: Attendance): Partial<AttendanceRow> {
    return {
      id: attendance.id,
      match_id: attendance.matchId,
      player_id: attendance.playerId,
      status: attendance.status,
      registered_at: attendance.registeredAt.toISOString(),
      registered_by_player_id: attendance.registeredByPlayerId ?? null,
      guest_name: attendance.guestName ?? null,
    };
  }

  async findById(id: string): Promise<Attendance | null> {
    const { data, error } = await this.client
      .from('attendances')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Failed to find attendance by ID '${id}': ${error.message}`
      );
    }

    if (!data) {
      return null;
    }

    return this.mapRowToEntity(data as AttendanceRow);
  }

  async findByMatchId(matchId: string): Promise<Attendance[]> {
    const { data, error } = await this.client
      .from('attendances')
      .select('*')
      .eq('match_id', matchId);

    if (error) {
      throw new Error(
        `Failed to find attendances for match '${matchId}': ${error.message}`
      );
    }

    if (!data) {
      return [];
    }

    return (data as AttendanceRow[]).map((row) => this.mapRowToEntity(row));
  }

  async save(attendance: Attendance): Promise<void> {
    const row = this.mapEntityToRow(attendance);
    const { error } = await this.client.from('attendances').insert(row);

    if (error) {
      throw new Error(
        `Failed to save attendance '${attendance.id}': ${error.message}`
      );
    }
  }

  async update(attendance: Attendance): Promise<void> {
    const row = this.mapEntityToRow(attendance);
    const { error } = await this.client
      .from('attendances')
      .update(row)
      .eq('id', attendance.id);

    if (error) {
      throw new Error(
        `Failed to update attendance '${attendance.id}': ${error.message}`
      );
    }
  }

  async findByPlayerId(playerId: string): Promise<Attendance[]> {
    const { data, error } = await this.client
      .from('attendances')
      .select('*')
      .or(`player_id.eq.${playerId},registered_by_player_id.eq.${playerId}`);

    if (error) {
      throw new Error(
        `Failed to find attendances for player '${playerId}': ${error.message}`
      );
    }

    if (!data) {
      return [];
    }

    return (data as AttendanceRow[]).map((row) => this.mapRowToEntity(row));
  }

  async findAll(): Promise<Attendance[]> {
    const { data, error } = await this.client
      .from('attendances')
      .select('*');

    if (error) {
      throw new Error(`Failed to fetch all attendances: ${error.message}`);
    }

    return (data as AttendanceRow[]).map((row) => this.mapRowToEntity(row));
  }
}
