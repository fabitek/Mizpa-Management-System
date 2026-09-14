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
  has_vehicle?: boolean | null;
  vehicle_plate?: string | null;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureUUID(id?: string | null): string {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
}

function optionalUUID(id?: string | null): string | null {
  if (id && UUID_REGEX.test(id)) return id;
  return null;
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
      hasVehicle: row.has_vehicle ?? undefined,
      vehiclePlate: row.vehicle_plate ?? undefined,
    };
  }

  private mapEntityToRow(attendance: Attendance): Partial<AttendanceRow> {
    const validId = ensureUUID(attendance.id);
    attendance.id = validId;
    return {
      id: validId,
      match_id: ensureUUID(attendance.matchId),
      player_id: ensureUUID(attendance.playerId),
      status: attendance.status,
      registered_at: attendance.registeredAt.toISOString(),
      registered_by_player_id: optionalUUID(attendance.registeredByPlayerId),
      guest_name: attendance.guestName ?? null,
      has_vehicle: attendance.hasVehicle ?? null,
      vehicle_plate: attendance.vehiclePlate ?? null,
    };
  }

  async findById(id: string): Promise<Attendance | null> {
    if (!id || !UUID_REGEX.test(id)) {
      return null;
    }
    try {
      const { data, error } = await this.client
        .from('attendances')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn(`Supabase findById attendance warning for '${id}':`, error.message);
        return null;
      }

      if (!data) {
        return null;
      }

      return this.mapRowToEntity(data as AttendanceRow);
    } catch (err) {
      console.warn(`Supabase findById attendance exception for '${id}':`, err);
      return null;
    }
  }

  async findByMatchId(matchId: string): Promise<Attendance[]> {
    if (!matchId || !UUID_REGEX.test(matchId)) {
      return [];
    }
    try {
      const { data, error } = await this.client
        .from('attendances')
        .select('*')
        .eq('match_id', matchId);

      if (error) {
        console.warn(`Supabase findByMatchId attendance warning for '${matchId}':`, error.message);
        return [];
      }

      if (!data) {
        return [];
      }

      return (data as AttendanceRow[]).map((row) => this.mapRowToEntity(row));
    } catch (err) {
      console.warn(`Supabase findByMatchId attendance exception for '${matchId}':`, err);
      return [];
    }
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
    if (!playerId || !UUID_REGEX.test(playerId)) {
      return [];
    }
    try {
      const { data, error } = await this.client
        .from('attendances')
        .select('*')
        .or(`player_id.eq.${playerId},registered_by_player_id.eq.${playerId}`);

      if (error) {
        console.warn(`Supabase findByPlayerId attendance warning for '${playerId}':`, error.message);
        return [];
      }

      if (!data) {
        return [];
      }

      return (data as AttendanceRow[]).map((row) => this.mapRowToEntity(row));
    } catch (err) {
      console.warn(`Supabase findByPlayerId attendance exception for '${playerId}':`, err);
      return [];
    }
  }

  async delete(id: string): Promise<void> {
    if (!id || !UUID_REGEX.test(id)) return;
    try {
      await this.client.from('attendances').delete().eq('id', id);
    } catch (err) {
      console.warn(`Supabase delete attendance exception for '${id}':`, err);
    }
  }

  async deleteByMatchId(matchId: string): Promise<void> {
    if (!matchId || !UUID_REGEX.test(matchId)) return;
    try {
      await this.client.from('attendances').delete().eq('match_id', matchId);
    } catch (err) {
      console.warn(`Supabase deleteByMatchId attendance exception for '${matchId}':`, err);
    }
  }

  async findAll(): Promise<Attendance[]> {
    try {
      const { data, error } = await this.client
        .from('attendances')
        .select('*');

      if (error) {
        console.warn('Supabase findAll attendances warning:', error.message);
        return [];
      }

      return (data as AttendanceRow[]).map((row) => this.mapRowToEntity(row));
    } catch (err) {
      console.warn('Supabase findAll attendances exception:', err);
      return [];
    }
  }
}
