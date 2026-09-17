'use server';

import { revalidatePath } from 'next/cache';
import {
  playerRepository,
  createPlayerUseCase,
} from '../../infrastructure/container.ts';
import type { Player, UserRole } from '../../core/domain/types.ts';

export interface PlayerActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errorCode?: string;
}

export async function getAllPlayersAction(): Promise<Player[]> {
  try {
    return await playerRepository.findAll();
  } catch (error) {
    console.error('Error fetching players:', error);
    return [];
  }
}

export async function createPlayerAction(data: {
  fullName: string;
  phone?: string;
  email?: string;
  alias?: string;
  documentId?: string;
  role?: UserRole;
  isActive?: boolean;
}): Promise<PlayerActionResult<Player>> {
  try {
    const player = await createPlayerUseCase.execute({
      fullName: data.fullName,
      phone: data.phone,
      email: data.email,
      alias: data.alias,
      documentId: data.documentId,
      role: data.role || 'PLAYER',
      isActive: data.isActive ?? true,
    });

    revalidatePath('/players');
    revalidatePath('/matches');
    revalidatePath('/stats');
    revalidatePath('/wallet');

    return {
      success: true,
      message: `Jugador ${player.fullName} creado.`,
      data: player,
    };
  } catch (error) {
    console.error('Error creating player:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No se pudo crear el jugador.',
    };
  }
}

export async function updatePlayerAction(
  id: string,
  data: Partial<Omit<Player, 'id' | 'createdAt'>>
): Promise<PlayerActionResult<Player>> {
  try {
    const existing = await playerRepository.findById(id);
    if (!existing) {
      return {
        success: false,
        message: 'Jugador inexistente.',
      };
    }

    const updated: Player = {
      ...existing,
      fullName: data.fullName !== undefined ? data.fullName.trim() : existing.fullName,
      phone: data.phone !== undefined ? data.phone.trim() : existing.phone,
      email: data.email !== undefined ? data.email.trim() : existing.email,
      alias: data.alias !== undefined ? data.alias.trim() : existing.alias,
      documentId: data.documentId !== undefined ? data.documentId.trim() : existing.documentId,
      role: data.role !== undefined ? data.role : existing.role,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
    };

    await playerRepository.update(updated);

    revalidatePath('/players');
    revalidatePath('/matches');
    revalidatePath('/stats');
    revalidatePath('/wallet');

    return {
      success: true,
      message: `Jugador ${updated.fullName} actualizado.`,
      data: updated,
    };
  } catch (error) {
    console.error('Error updating player:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo al actualizar jugador.',
    };
  }
}

export async function togglePlayerStatusAction(id: string): Promise<PlayerActionResult<Player>> {
  try {
    const existing = await playerRepository.findById(id);
    if (!existing) {
      return {
        success: false,
        message: 'Jugador inexistente.',
      };
    }

    const updated: Player = {
      ...existing,
      isActive: !existing.isActive,
    };

    await playerRepository.update(updated);

    revalidatePath('/players');
    revalidatePath('/matches');

    return {
      success: true,
      message: `${updated.fullName}: ahora ${updated.isActive ? 'Activo' : 'Inactivo'}.`,
      data: updated,
    };
  } catch (error) {
    console.error('Error toggling player status:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo al cambiar estado.',
    };
  }
}

export interface BulkImportSummary {
  createdCount: number;
  updatedCount: number;
  totalProcessed: number;
  errors: string[];
}

export async function bulkImportPlayersAction(
  rawText: string
): Promise<PlayerActionResult<BulkImportSummary>> {
  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      message: 'Sin datos para procesar.',
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      success: false,
      message: 'Formato sin líneas válidas.',
    };
  }

  let createdCount = 0;
  let updatedCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Skip header line if detected
    if (
      i === 0 &&
      (line.toLowerCase().includes('nombre') || line.toLowerCase().includes('name') || line.toLowerCase().includes('email'))
    ) {
      continue;
    }

    // Split by comma, tab, or semicolon
    const parts = line.split(/[,;\t]+/).map((p) => p.trim());

    if (parts.length === 0 || !parts[0]) {
      continue;
    }

    const fullName = parts[0];
    const phone = parts[1] || '';
    const email = parts[2] || '';
    const alias = parts[3] || fullName.split(' ')[0];
    const roleInput = parts[4]?.toUpperCase();

    let role: UserRole = 'PLAYER';
    if (roleInput === 'ADMIN' || roleInput === 'ADMINISTRADOR') {
      role = 'ADMIN';
    } else if (roleInput === 'CAPTAIN' || roleInput === 'CAPITAN' || roleInput === 'CAPITÁN') {
      role = 'CAPTAIN';
    }

    try {
      // Check existing to distinguish created vs updated
      const all = await playerRepository.findAll();
      const cleanEmail = email.toLowerCase();
      const existing = all.find((p) => {
        if (cleanEmail && p.email?.toLowerCase() === cleanEmail) return true;
        if (phone && p.phone === phone) return true;
        if (p.fullName.toLowerCase() === fullName.toLowerCase()) return true;
        return false;
      });

      await createPlayerUseCase.execute({
        fullName,
        phone,
        email: email || undefined,
        alias,
        role,
        isActive: true,
      });

      if (existing) {
        updatedCount++;
      } else {
        createdCount++;
      }
    } catch (err) {
      errors.push(`Línea ${i + 1} (${fullName}): ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
  }

  revalidatePath('/players');
  revalidatePath('/matches');
  revalidatePath('/stats');
  revalidatePath('/wallet');

  return {
    success: true,
    message: `Importación lista: ${createdCount} nuevos, ${updatedCount} actualizados.${errors.length ? ` (${errors.length} errores)` : ''}`,
    data: {
      createdCount,
      updatedCount,
      totalProcessed: createdCount + updatedCount,
      errors,
    },
  };
}
