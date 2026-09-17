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
      message: 'Gol anotado en la planilla.',
      data: goal,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No pudimos registrar el gol.',
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
      message: 'Gol eliminado de la planilla.',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No pudimos borrar el gol.',
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
      message: 'Goles del partido listos.',
      data: goals,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No pudimos cargar los goles.',
    };
  }
}

export async function getTopScorersAction(): Promise<StatsActionResult> {
  try {
    const scorers = await getTopScorersUseCase.execute();
    return {
      success: true,
      message: 'Tabla de goleadores al día.',
      data: scorers,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No pudimos consultar los goleadores.',
    };
  }
}

export async function getPlayerStatsAction(playerId: string): Promise<StatsActionResult> {
  try {
    const stats = await getPlayerStatsUseCase.execute(playerId);
    return {
      success: true,
      message: 'Estadísticas del jugador cargadas.',
      data: stats,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No pudimos consultar las estadísticas.',
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
      message: 'Figura del partido elegida.',
      data: updatedMatch,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No pudimos asignar la figura del partido.',
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
      message: 'Cuadro de honor al día.',
      data: overview,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'No pudimos cargar el cuadro de honor.',
    };
  }
}
