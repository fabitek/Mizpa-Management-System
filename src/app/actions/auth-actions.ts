'use server';

import { revalidatePath } from 'next/cache';
import {
  authService,
  switchSessionUserUseCase,
} from '../../infrastructure/container.ts';
import type { AuthSession } from '../../core/domain/types.ts';

export interface AuthActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export async function getCurrentSessionAction(): Promise<AuthActionResult<AuthSession>> {
  try {
    const session = await authService.getCurrentSession();
    if (!session) {
      return { success: false, message: 'Sin sesión activa.' };
    }
    return {
      success: true,
      message: 'Sesión cargada.',
      data: session,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No fue posible cargar la sesión.',
    };
  }
}

export async function switchUserAction(playerId: string): Promise<AuthActionResult<AuthSession>> {
  try {
    const newSession = await switchSessionUserUseCase.execute(playerId);

    revalidatePath('/', 'layout');

    return {
      success: true,
      message: `Perfil activo: ${newSession.user.fullName} (${newSession.user.role}).`,
      data: newSession,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Fallo al cambiar usuario.',
    };
  }
}
