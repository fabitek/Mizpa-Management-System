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
      return { success: false, message: 'No active session.' };
    }
    return {
      success: true,
      message: 'Sesión activa obtenida.',
      data: session,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener sesión.',
    };
  }
}

export async function switchUserAction(playerId: string): Promise<AuthActionResult<AuthSession>> {
  try {
    const newSession = await switchSessionUserUseCase.execute(playerId);

    revalidatePath('/', 'layout');

    return {
      success: true,
      message: `Sesión cambiada a ${newSession.user.fullName} (${newSession.user.role}).`,
      data: newSession,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al cambiar de usuario.',
    };
  }
}
