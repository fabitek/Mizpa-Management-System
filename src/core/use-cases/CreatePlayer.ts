import type { Player, UserRole, IPlayerRepository } from '../domain/index.ts';

export interface CreatePlayerInput {
  fullName: string;
  documentId?: string;
  phone?: string;
  email?: string;
  alias?: string;
  role?: UserRole;
  isActive?: boolean;
}

export class CreatePlayerUseCase {
  private readonly playerRepository: IPlayerRepository;
  private readonly idGenerator?: () => string;

  constructor(playerRepository: IPlayerRepository, idGenerator?: () => string) {
    this.playerRepository = playerRepository;
    this.idGenerator = idGenerator;
  }

  async execute(input: CreatePlayerInput): Promise<Player> {
    const { fullName, phone, email, alias, role = 'PLAYER', isActive = true } = input;

    if (!fullName || !fullName.trim()) {
      throw new Error('El nombre completo es obligatorio.');
    }

    const cleanName = fullName.trim();
    const cleanPhone = phone?.trim() || '';
    const cleanEmail = email?.trim() || '';
    const cleanAlias = alias?.trim() || cleanName.split(' ')[0];

    const allPlayers = await this.playerRepository.findAll();

    // Check if player with same email or phone or documentId exists
    const existing = allPlayers.find((p) => {
      if (cleanEmail && p.email && p.email.toLowerCase() === cleanEmail.toLowerCase()) return true;
      if (cleanPhone && p.phone && p.phone === cleanPhone) return true;
      if (input.documentId && p.documentId && p.documentId === input.documentId.trim()) return true;
      return false;
    });

    if (existing) {
      const updated: Player = {
        ...existing,
        fullName: cleanName,
        phone: cleanPhone || existing.phone,
        email: cleanEmail || existing.email,
        alias: cleanAlias || existing.alias,
        role: role || existing.role,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      };
      await this.playerRepository.update(updated);
      return updated;
    }

    const cleanDocId =
      input.documentId?.trim() ||
      `DOC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const finalEmail =
      cleanEmail ||
      `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@mizpafc.internal`;

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    let playerId = crypto.randomUUID();
    if (this.idGenerator) {
      const gen = this.idGenerator();
      if (UUID_REGEX.test(gen)) {
        playerId = gen;
      }
    }

    const newPlayer: Player = {
      id: playerId,
      fullName: cleanName,
      documentId: cleanDocId,
      phone: cleanPhone,
      email: finalEmail,
      alias: cleanAlias,
      role,
      isActive,
      createdAt: new Date(),
    };

    await this.playerRepository.save(newPlayer);
    return newPlayer;
  }
}
