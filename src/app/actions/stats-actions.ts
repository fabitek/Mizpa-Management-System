'use server';

import { revalidatePath } from 'next/cache';
import {
  recordGoalEventUseCase,
  deleteGoalUseCase,
  getMatchGoalsUseCase,
  getTopScorersUseCase,
  getPlayerStatsUseCase,
  assignMatchMvpUseCase,
  getLeaderboardOverviewUseCase,
} from '../../infrastructure/container.ts';
import type { GoalType, GoalEvent } from '../../core/domain/types.ts';

export interface StatsActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export async function recordGoalAction(
  matchId: string,
  playerId: string,
  minute?: number,
  type: GoalType = 'OPEN_PLAY'
): Promise<StatsActionResult<GoalEvent>> {
  try {
    const goal = await recordGoalEventUseCase.execute({
      matchId,
      playerId,
      minute,
      type,
    });

    revalidatePath('/stats');
    revalidatePath('/matches');

    return {
      success: true,
      message: 'Gol registrado exitosamente.',
      data: goal,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al registrar el gol.',
    };
  }
}

export async function deleteGoalAction(
  goalId: string,
  matchId?: string
): Promise<StatsActionResult> {
  try {
    await deleteGoalUseCase.execute({ goalId });

    revalidatePath('/stats');
    revalidatePath('/matches');

    return {
      success: true,
      message: 'Gol eliminado exitosamente.',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al eliminar el gol.',
    };
  }
}

export async function getMatchGoalsAction(
  matchId: string
): Promise<StatsActionResult<GoalEvent[]>> {
  try {
    const goals = await getMatchGoalsUseCase.execute(matchId);
    return {
      success: true,
      message: 'Goles del partido obtenidos.',
      data: goals,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener goles del partido.',
    };
  }
}

export async function getTopScorersAction(): Promise<StatsActionResult> {
  try {
    const scorers = await getTopScorersUseCase.execute();
    return {
      success: true,
      message: 'Tabla de goleadores obtenida exitosamente.',
      data: scorers,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener la tabla de goleadores.',
    };
  }
}

export async function getPlayerStatsAction(playerId: string): Promise<StatsActionResult> {
  try {
    const stats = await getPlayerStatsUseCase.execute(playerId);
    return {
      success: true,
      message: 'Estadísticas del jugador obtenidas exitosamente.',
      data: stats,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener estadísticas del jugador.',
    };
  }
}

export async function assignMatchMvpAction(
  matchId: string,
  playerId: string
): Promise<StatsActionResult> {
  try {
    const updatedMatch = await assignMatchMvpUseCase.execute({ matchId, playerId });

    revalidatePath('/stats');
    revalidatePath('/matches');

    return {
      success: true,
      message: 'Jugador del partido (MVP) asignado exitosamente.',
      data: updatedMatch,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al asignar MVP del partido.',
    };
  }
}

export async function getLeaderboardOverviewAction(
  playerIds: string[]
): Promise<StatsActionResult> {
  try {
    const overview = await getLeaderboardOverviewUseCase.execute(playerIds);
    return {
      success: true,
      message: 'Cuadro de honor general obtenido exitosamente.',
      data: overview,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error al obtener cuadro general de honor.',
    };
  }
}
