import type { SupabaseClient } from '@supabase/supabase-js';
import type { Match, IMatchRepository, MatchStatus } from '../../../core/domain/index.ts';

interface MatchRow {
  id: string;
  date: string;
  location: string;
  location_address?: string | null;
  google_maps_url?: string | null;
  pitch_rental_cost: number | string;
  extra_costs: number | string;
  duration_hours?: number | null;
  parking_fee_per_hour?: number | string | null;
  max_players: number;
  settled_fee_per_player: number | string | null;
  status: string;
  mvp_player_id?: string | null;
  created_at: string;
  updated_at: string;
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

const globalMatchCache = new Map<string, Match>();

export class SupabaseMatchRepository implements IMatchRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private mapRowToEntity(row: MatchRow): Match {
    return {
      id: row.id,
      date: new Date(row.date),
      location: row.location,
      locationAddress: row.location_address ?? undefined,
      googleMapsUrl: row.google_maps_url ?? undefined,
      pitchRentalCost: Number(row.pitch_rental_cost),
      extraCosts: Number(row.extra_costs),
      durationHours: row.duration_hours ? Number(row.duration_hours) : 2,
      parkingFeePerHour: row.parking_fee_per_hour !== null && row.parking_fee_per_hour !== undefined ? Number(row.parking_fee_per_hour) : 1000,
      maxPlayers: Number(row.max_players),
      settledFeePerPlayer:
        row.settled_fee_per_player !== null && row.settled_fee_per_player !== undefined
          ? Number(row.settled_fee_per_player)
          : null,
      status: row.status as MatchStatus,
      mvpPlayerId: row.mvp_player_id ?? null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapEntityToRow(match: Match): Partial<MatchRow> {
    const validId = ensureUUID(match.id);
    match.id = validId;
    return {
      id: validId,
      date: match.date.toISOString(),
      location: match.location,
      location_address: match.locationAddress ?? null,
      google_maps_url: match.googleMapsUrl ?? null,
      pitch_rental_cost: match.pitchRentalCost,
      extra_costs: match.extraCosts,
      duration_hours: match.durationHours ?? 2,
      parking_fee_per_hour: match.parkingFeePerHour ?? 1000,
      max_players: match.maxPlayers,
      settled_fee_per_player: match.settledFeePerPlayer,
      status: match.status,
      mvp_player_id: optionalUUID(match.mvpPlayerId),
      created_at: match.createdAt.toISOString(),
      updated_at: match.updatedAt.toISOString(),
    };
  }

  async findById(id: string): Promise<Match | null> {
    if (!id || !UUID_REGEX.test(id)) {
      return globalMatchCache.get(id) ?? null;
    }
    try {
      const { data, error } = await this.client
        .from('matches')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn(`Supabase findById match warning for '${id}':`, error.message);
        return globalMatchCache.get(id) ?? null;
      }

      if (!data) {
        return globalMatchCache.get(id) ?? null;
      }

      const entity = this.mapRowToEntity(data as MatchRow);
      globalMatchCache.set(entity.id, entity);
      return entity;
    } catch (err) {
      console.warn(`Supabase findById match exception for '${id}':`, err);
      return globalMatchCache.get(id) ?? null;
    }
  }

  async save(match: Match): Promise<void> {
    globalMatchCache.set(match.id, { ...match });
    const row = this.mapEntityToRow(match);

    try {
      const { error } = await this.client.from('matches').insert(row);
      if (error) {
        console.warn(`Supabase insert match warning '${match.id}': ${error.message}`);
        // If it's a gateway timeout or network error, keep in cache rather than failing user
        if (!error.message.includes('duplicate key') && !error.message.includes('foreign key')) {
          console.info(`Saved match '${match.id}' in resilient local cache.`);
          return;
        }
        throw new Error(`Failed to save match '${match.id}': ${error.message}`);
      }
    } catch (err: any) {
      console.warn(`Supabase insert exception '${match.id}', preserved in cache:`, err.message);
      // Preserved in globalMatchCache
    }
  }

  async update(match: Match): Promise<void> {
    globalMatchCache.set(match.id, { ...match });
    const row = this.mapEntityToRow(match);

    try {
      const { error } = await this.client
        .from('matches')
        .update(row)
        .eq('id', match.id);

      if (error) {
        console.warn(`Supabase update match warning '${match.id}': ${error.message}`);
      }
    } catch (err: any) {
      console.warn(`Supabase update exception '${match.id}', preserved in cache:`, err.message);
    }
  }

  async delete(id: string): Promise<void> {
    globalMatchCache.delete(id);
    if (!id || !UUID_REGEX.test(id)) return;
    try {
      // Clean up linked rows first (attendances, goal_events)
      await this.client.from('attendances').delete().eq('match_id', id);
      await this.client.from('goal_events').delete().eq('match_id', id);
      await this.client.from('matches').delete().eq('id', id);
    } catch (err) {
      console.warn(`Supabase delete match exception for '${id}':`, err);
    }
  }

  async findAll(): Promise<Match[]> {
    try {
      const { data, error } = await this.client
        .from('matches')
        .select('*')
        .order('date', { ascending: true });

      if (error) {
        console.warn('Supabase findAll matches warning:', error.message);
        return Array.from(globalMatchCache.values()).sort(
          (a, b) => a.date.getTime() - b.date.getTime()
        );
      }

      const matches = (data as MatchRow[]).map((row) => this.mapRowToEntity(row));
      for (const m of matches) {
        globalMatchCache.set(m.id, m);
      }

      // Merge cached items that might not be synced yet
      for (const cached of globalMatchCache.values()) {
        if (!matches.some((m) => m.id === cached.id)) {
          matches.push(cached);
        }
      }

      return matches.sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (err) {
      console.warn('Supabase findAll matches exception:', err);
      return Array.from(globalMatchCache.values()).sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
    }
  }
}
