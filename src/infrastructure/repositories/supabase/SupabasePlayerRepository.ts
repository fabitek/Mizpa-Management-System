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
      full_name: player.fullName.trim(),
      document_id: player.documentId && player.documentId.trim() ? player.documentId.trim() : null,
      email: player.email.trim(),
      phone: player.phone && player.phone.trim() ? player.phone.trim() : null,
      alias: player.alias && player.alias.trim() ? player.alias.trim() : null,
      role: player.role,
      is_active: player.isActive,
      created_at: player.createdAt ? player.createdAt.toISOString() : new Date().toISOString(),
    };
  }

  async findById(id: string): Promise<Player | null> {
    if (!id) return null;

    try {
      if (UUID_REGEX.test(id)) {
        const { data, error } = await this.client
          .from('players')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (!error && data) {
          return this.mapRowToEntity(data as PlayerRow);
        }
      }

      // If id was seed ID or not matched, try finding by email or document if known
      const { data: allPlayers, error: allErr } = await this.client
        .from('players')
        .select('*')
        .limit(100);

      if (!allErr && allPlayers) {
        const found = allPlayers.find((p: PlayerRow) => p.id === id);
        if (found) return this.mapRowToEntity(found as PlayerRow);
      }

      return null;
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
    const updatePayload = {
      full_name: player.fullName.trim(),
      document_id: player.documentId && player.documentId.trim() ? player.documentId.trim() : null,
      email: player.email.trim(),
      phone: player.phone && player.phone.trim() ? player.phone.trim() : null,
      alias: player.alias && player.alias.trim() ? player.alias.trim() : null,
      role: player.role,
      is_active: player.isActive,
    };

    // 1. Try updating by id
    let { data, error } = await this.client
      .from('players')
      .update(updatePayload)
      .eq('id', player.id)
      .select();

    if (error) {
      console.warn(`Supabase update player error for id '${player.id}':`, error.message);
    }

    // 2. If no row updated by id, fallback to matching by email
    if (!data || data.length === 0) {
      if (player.email) {
        const resByEmail = await this.client
          .from('players')
          .update(updatePayload)
          .eq('email', player.email.trim())
          .select();

        if (resByEmail.data && resByEmail.data.length > 0) {
          return;
        }
      }

      // 3. Fallback to matching by document_id
      if (player.documentId && player.documentId.trim()) {
        const resByDoc = await this.client
          .from('players')
          .update(updatePayload)
          .eq('document_id', player.documentId.trim())
          .select();

        if (resByDoc.data && resByDoc.data.length > 0) {
          return;
        }
      }

      // 4. If row doesn't exist in Supabase yet, save it
      await this.save(player);
    }
  }
}
