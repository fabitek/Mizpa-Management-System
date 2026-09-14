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
  guest_type?: string | null;
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

const globalAttendanceCache = new Map<string, Attendance>();

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
      guestType: (row.guest_type as 'PLAYER' | 'COMPANION') || (row.guest_name ? 'PLAYER' : undefined),
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
      guest_type: attendance.guestType ?? (attendance.guestName ? 'PLAYER' : null),
      has_vehicle: attendance.hasVehicle ?? null,
      vehicle_plate: attendance.vehiclePlate ?? null,
    };
  }

  async findById(id: string): Promise<Attendance | null> {
    if (!id || !UUID_REGEX.test(id)) {
      return globalAttendanceCache.get(id) ?? null;
    }
    try {
      const { data, error } = await this.client
        .from('attendances')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn(`Supabase findById attendance warning for '${id}':`, error.message);
        return globalAttendanceCache.get(id) ?? null;
      }

      if (!data) {
        return globalAttendanceCache.get(id) ?? null;
      }

      const entity = this.mapRowToEntity(data as AttendanceRow);
      globalAttendanceCache.set(entity.id, entity);
      return entity;
    } catch (err) {
      console.warn(`Supabase findById attendance exception for '${id}':`, err);
      return globalAttendanceCache.get(id) ?? null;
    }
  }

  async findByMatchId(matchId: string): Promise<Attendance[]> {
    const cachedForMatch = Array.from(globalAttendanceCache.values()).filter(
      (a) => a.matchId === matchId
    );

    if (!matchId || !UUID_REGEX.test(matchId)) {
      return cachedForMatch;
    }
    try {
      const { data, error } = await this.client
        .from('attendances')
        .select('*')
        .eq('match_id', matchId);

      if (error) {
        console.warn(`Supabase findByMatchId attendance warning for '${matchId}':`, error.message);
        return cachedForMatch;
      }

      if (!data) {
        return cachedForMatch;
      }

      const list = (data as AttendanceRow[]).map((row) => this.mapRowToEntity(row));
      for (const item of list) {
        globalAttendanceCache.set(item.id, item);
      }

      for (const item of cachedForMatch) {
        if (!list.some((l) => l.id === item.id)) {
          list.push(item);
        }
      }

      return list;
    } catch (err) {
      console.warn(`Supabase findByMatchId attendance exception for '${matchId}':`, err);
      return cachedForMatch;
    }
  }

  async save(attendance: Attendance): Promise<void> {
    globalAttendanceCache.set(attendance.id, { ...attendance });
    const row = this.mapEntityToRow(attendance);

    try {
      const { error } = await this.client.from('attendances').insert(row);
      if (error) {
        console.warn(`Supabase insert attendance warning '${attendance.id}': ${error.message}`);
      }
    } catch (err: any) {
      console.warn(`Supabase insert attendance exception '${attendance.id}', preserved in cache:`, err.message);
    }
  }

  async update(attendance: Attendance): Promise<void> {
    globalAttendanceCache.set(attendance.id, { ...attendance });
    const row = this.mapEntityToRow(attendance);

    try {
      const { error } = await this.client
        .from('attendances')
        .update(row)
        .eq('id', attendance.id);

      if (error) {
        console.warn(`Supabase update attendance warning '${attendance.id}': ${error.message}`);
      }
    } catch (err: any) {
      console.warn(`Supabase update attendance exception '${attendance.id}', preserved in cache:`, err.message);
    }
  }

  async findByPlayerId(playerId: string): Promise<Attendance[]> {
    const cachedForPlayer = Array.from(globalAttendanceCache.values()).filter(
      (a) => a.playerId === playerId || a.registeredByPlayerId === playerId
    );

    if (!playerId || !UUID_REGEX.test(playerId)) {
      return cachedForPlayer;
    }
    try {
      const { data, error } = await this.client
        .from('attendances')
        .select('*')
        .or(`player_id.eq.${playerId},registered_by_player_id.eq.${playerId}`);

      if (error) {
        console.warn(`Supabase findByPlayerId attendance warning for '${playerId}':`, error.message);
        return cachedForPlayer;
      }

      if (!data) {
        return cachedForPlayer;
      }

      const list = (data as AttendanceRow[]).map((row) => this.mapRowToEntity(row));
      for (const item of list) {
        globalAttendanceCache.set(item.id, item);
      }

      return list;
    } catch (err) {
      console.warn(`Supabase findByPlayerId attendance exception for '${playerId}':`, err);
      return cachedForPlayer;
    }
  }

  async delete(id: string): Promise<void> {
    globalAttendanceCache.delete(id);
    if (!id || !UUID_REGEX.test(id)) return;
    try {
      await this.client.from('attendances').delete().eq('id', id);
    } catch (err) {
      console.warn(`Supabase delete attendance exception for '${id}':`, err);
    }
  }

  async deleteByMatchId(matchId: string): Promise<void> {
    for (const [key, item] of globalAttendanceCache.entries()) {
      if (item.matchId === matchId) {
        globalAttendanceCache.delete(key);
      }
    }
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
        return Array.from(globalAttendanceCache.values());
      }

      const list = (data as AttendanceRow[]).map((row) => this.mapRowToEntity(row));
      for (const item of list) {
        globalAttendanceCache.set(item.id, item);
      }
      return list;
    } catch (err) {
      console.warn('Supabase findAll attendances exception:', err);
      return Array.from(globalAttendanceCache.values());
    }
  }
}
