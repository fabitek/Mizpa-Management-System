import type { SupabaseClient } from '@supabase/supabase-js';
import type { Player, IPlayerRepository, UserRole } from '../../../core/domain/index.ts';

interface PlayerRow {
  id: string;
  full_name: string;
  document_id?: string | null;
  email: string;
  phone?: string | null;
  alias?: string | null;
  role?: string | null;
  is_active: boolean;
  created_at: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function ensureUUID(id?: string | null): string {
  if (id && UUID_REGEX.test(id)) return id;
  return crypto.randomUUID();
}

export class SupabasePlayerRepository implements IPlayerRepository {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  private mapRowToEntity(row: PlayerRow): Player {
    const isFabian =
      row.full_name?.toLowerCase().includes('fabian') ||
      row.email?.toLowerCase().includes('fabian.tellez') ||
      row.role === 'ADMIN';

    const fullName = isFabian ? 'Fabián Téllez' : row.full_name;
    const alias = isFabian ? 'Admin' : (row.alias ?? undefined);
    const role: UserRole = isFabian ? 'ADMIN' : ((row.role as UserRole) || 'PLAYER');

    return {
      id: row.id,
      fullName,
      documentId: row.document_id ?? undefined,
      email: row.email,
      phone: row.phone ?? undefined,
      alias,
      role,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
    };
  }

  private mapEntityToRow(player: Player): Partial<PlayerRow> {
    const validId = ensureUUID(player.id);
    player.id = validId;
    return {
      id: validId,
      full_name: player.fullName,
      document_id: player.documentId ?? null,
      email: player.email,
      phone: player.phone ?? null,
      alias: player.alias ?? null,
      role: player.role,
      is_active: player.isActive,
      created_at: player.createdAt.toISOString(),
    };
  }

  async findById(id: string): Promise<Player | null> {
    if (!id || !UUID_REGEX.test(id)) {
      return null;
    }
    try {
      const { data, error } = await this.client
        .from('players')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.warn(`Supabase findById player warning for '${id}':`, error.message);
        return null;
      }

      if (!data) {
        return null;
      }

      return this.mapRowToEntity(data as PlayerRow);
    } catch (err) {
      console.warn(`Supabase findById player exception for '${id}':`, err);
      return null;
    }
  }

  async findByDocumentId(documentId: string): Promise<Player | null> {
    try {
      const cleanDoc = documentId.trim();
      const { data, error } = await this.client
        .from('players')
        .select('*')
        .eq('document_id', cleanDoc)
        .maybeSingle();

      if (error) {
        console.warn(`Supabase findByDocumentId warning for '${documentId}':`, error.message);
        return null;
      }

      if (!data) {
        return null;
      }

      return this.mapRowToEntity(data as PlayerRow);
    } catch (err) {
      console.warn(`Supabase findByDocumentId exception for '${documentId}':`, err);
      return null;
    }
  }

  async findAll(): Promise<Player[]> {
    try {
      const { data, error } = await this.client
        .from('players')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) {
        console.warn('Supabase findAll players warning:', error.message);
        return [];
      }

      return (data as PlayerRow[]).map((row) => this.mapRowToEntity(row));
    } catch (err) {
      console.warn('Supabase findAll players exception:', err);
      return [];
    }
  }

  async save(player: Player): Promise<void> {
    const row = this.mapEntityToRow(player);
    const { error } = await this.client.from('players').insert(row);

    if (error) {
      throw new Error(`Failed to save player '${player.id}': ${error.message}`);
    }
  }

  async update(player: Player): Promise<void> {
    const row = this.mapEntityToRow(player);
    const { error } = await this.client
      .from('players')
      .update(row)
      .eq('id', player.id);

    if (error) {
      throw new Error(`Failed to update player '${player.id}': ${error.message}`);
    }
  }
}
