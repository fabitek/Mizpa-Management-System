'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import {
  Trophy,
  Target,
  Plus,
  Minus,
  Trash2,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../ui/button.tsx';
import { Badge } from '../ui/badge.tsx';
import {
  recordGoalAction,
  deleteGoalAction,
  getMatchGoalsAction,
  assignMatchMvpAction,
} from '../../app/actions/stats-actions.ts';
import type { GoalEvent, GoalType, Player, ConfirmedRosterEntry, Match } from '../../core/domain/types.ts';

interface MatchGoalsTrackerProps {
  match: Match;
  roster: ConfirmedRosterEntry[];
  allPlayers: Player[];
  onGoalRecorded?: () => void;
}

export function MatchGoalsTracker({
  match,
  roster,
  allPlayers,
  onGoalRecorded,
}: MatchGoalsTrackerProps) {
  const [goals, setGoals] = useState<GoalEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  // Filter roster to only include active players (exclude non-playing companions/spectators)
  const playingRoster = useMemo(() => {
    return roster.filter((entry) => entry.guestType !== 'COMPANION');
  }, [roster]);

  // Custom Goal Dialog State
  const [selectedPlayerForGoal, setSelectedPlayerForGoal] = useState<string | null>(null);
  const [customMinute, setCustomMinute] = useState<string>('');
  const [customGoalType, setCustomGoalType] = useState<GoalType>('OPEN_PLAY');

  // MVP selection state
  const [mvpPlayerId, setMvpPlayerId] = useState<string>(match.mvpPlayerId || '');

  // Fetch initial goals for this match
  const fetchGoals = React.useCallback(async () => {
    try {
      const res = await getMatchGoalsAction(match.id);
      if (res.success && res.data) {
        setGoals(res.data);
      }
    } catch (e) {
      console.warn('Error fetching match goals', e);
    } finally {
      setIsLoading(false);
    }
  }, [match.id]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const getPlayerName = (playerId: string) => {
    const fromRoster = roster.find((r) => r.playerId === playerId);
    if (fromRoster) return fromRoster.fullName;
    const fromAll = allPlayers.find((p) => p.id === playerId);
    return fromAll?.fullName || 'Jugador';
  };

  // Count goals per player in this match
  const playerGoalsCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const g of goals) {
      if (g.type !== 'OWN_GOAL') {
        counts.set(g.playerId, (counts.get(g.playerId) || 0) + 1);
      }
    }
    return counts;
  }, [goals]);

  // Total valid match goals
  const totalMatchGoals = goals.filter((g) => g.type !== 'OWN_GOAL').length;

  // Quick 1-Tap Record Goal
  const handleQuickGoal = (playerId: string) => {
    if (!playerId) {
      setFeedback({ success: false, message: 'ID de jugador inválido.' });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const res = await recordGoalAction(match.id, playerId, undefined, 'OPEN_PLAY');
      if (res.success && res.data) {
        setGoals((prev) => [...prev, res.data as GoalEvent]);
        setFeedback({ success: true, message: `¡GOL de ${getPlayerName(playerId)} anotado! ⚽🔥` });
        if (onGoalRecorded) onGoalRecorded();
      } else {
        setFeedback({ success: false, message: res.message });
      }
    });
  };

  // Undo / Delete Latest Goal of a player
  const handleRemoveLatestPlayerGoal = (playerId: string) => {
    const playerGoalEvents = goals.filter((g) => g.playerId === playerId);
    if (playerGoalEvents.length === 0) return;
    const latestGoal = playerGoalEvents[playerGoalEvents.length - 1];

    setFeedback(null);
    startTransition(async () => {
      const res = await deleteGoalAction(latestGoal.id, match.id);
      if (res.success) {
        setGoals((prev) => prev.filter((g) => g.id !== latestGoal.id));
        setFeedback({ success: true, message: `Gol de ${getPlayerName(playerId)} eliminado.` });
        if (onGoalRecorded) onGoalRecorded();
      } else {
        setFeedback({ success: false, message: res.message });
      }
    });
  };

  // Submit Detailed Goal Dialog
  const handleSaveDetailedGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerForGoal) return;

    const minuteNum = customMinute ? parseInt(customMinute, 10) : undefined;
    setFeedback(null);

    startTransition(async () => {
      const res = await recordGoalAction(
        match.id,
        selectedPlayerForGoal,
        minuteNum,
        customGoalType
      );
      if (res.success && res.data) {
        setGoals((prev) => [...prev, res.data as GoalEvent]);
        setFeedback({ success: true, message: `¡Gol registrado con éxito!` });
        setSelectedPlayerForGoal(null);
        setCustomMinute('');
        setCustomGoalType('OPEN_PLAY');
        if (onGoalRecorded) onGoalRecorded();
      } else {
        setFeedback({ success: false, message: res.message });
      }
    });
  };

  // Delete specific goal from timeline
  const handleDeleteSpecificGoal = (goalId: string) => {
    setFeedback(null);
    startTransition(async () => {
      const res = await deleteGoalAction(goalId, match.id);
      if (res.success) {
        setGoals((prev) => prev.filter((g) => g.id !== goalId));
        setFeedback({ success: true, message: 'Gol eliminado del marcador.' });
        if (onGoalRecorded) onGoalRecorded();
      } else {
        setFeedback({ success: false, message: res.message });
      }
    });
  };

  // Assign MVP
  const handleAssignMvp = (playerId: string) => {
    setMvpPlayerId(playerId);
    setFeedback(null);
    startTransition(async () => {
      const res = await assignMatchMvpAction(match.id, playerId);
      if (res.success) {
        setFeedback({ success: true, message: `⭐ ¡${getPlayerName(playerId)} elegido como MVP!` });
      } else {
        setFeedback({ success: false, message: res.message });
      }
    });
  };

  // Unique players for MVP select
  const uniquePlayingPlayers = useMemo(() => {
    const seen = new Set<string>();
    const list: ConfirmedRosterEntry[] = [];
    for (const p of playingRoster) {
      if (!seen.has(p.playerId)) {
        seen.add(p.playerId);
        list.push(p);
      }
    }
    return list;
  }, [playingRoster]);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 animate-fade-in ${
            feedback.success
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-semibold">{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Header & MVP Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-emerald-400" /> Total Goles del Partido
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono text-white">{totalMatchGoals}</span>
              <span className="text-xs text-zinc-500">anotaciones registradas</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center text-2xl">
            ⚽
          </div>
        </div>

        {/* MVP Selector Card */}
        <div className="bg-zinc-900/90 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between shadow-md md:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> Jugador Más Valioso (MVP ⭐)
            </span>
            {mvpPlayerId && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-300 text-[10px] bg-amber-950/40">
                Seleccionado
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <select
              value={mvpPlayerId}
              onChange={(e) => handleAssignMvp(e.target.value)}
              disabled={isPending}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="">-- Seleccionar MVP del Partido --</option>
              {uniquePlayingPlayers.map((entry) => (
                <option key={`mvp-${entry.playerId}`} value={entry.playerId}>
                  ⭐ {entry.fullName}
                </option>
              ))}
            </select>
            {mvpPlayerId && (
              <div className="shrink-0 flex items-center gap-1 text-xs text-amber-400 font-bold bg-amber-950/80 border border-amber-500/30 px-3 py-2 rounded-xl">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{getPlayerName(mvpPlayerId)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Attending Players Quick Goal Matrix */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-emerald-400" /> Registro de Goles por Jugador en Cancha
            </h3>
            <p className="text-xs text-zinc-400">
              Presiona <span className="text-emerald-400 font-semibold">+ Gol</span> para anotar en vivo.
            </p>
          </div>
          <Badge variant="outline" className="text-xs border-zinc-700 text-zinc-300">
            {playingRoster.length} jugadores en nómina
          </Badge>
        </div>

        {playingRoster.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-500">
            No hay jugadores confirmados en este partido para registrar goles.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {playingRoster.map((entry, idx) => {
              const goalsCount = playerGoalsCount.get(entry.playerId) || 0;
              const isMvp = mvpPlayerId === entry.playerId;
              const uniqueKey = `roster-card-${entry.playerId}-${entry.slotNumber || idx}`;

              return (
                <div
                  key={uniqueKey}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                    goalsCount > 0
                      ? 'bg-emerald-950/30 border-emerald-500/30 shadow-sm'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-zinc-200 truncate">{entry.fullName}</span>
                      {isMvp && <span title="MVP del Partido">⭐</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-zinc-500">
                        {entry.isGuest ? '👤 Invitado' : 'Jugador'}
                      </span>
                      {goalsCount > 0 && (
                        <span className="text-[11px] font-black text-emerald-400 flex items-center gap-0.5 bg-emerald-950/80 px-1.5 py-0.2 rounded border border-emerald-500/40">
                          ⚽ x{goalsCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 1-Tap Goal Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {goalsCount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveLatestPlayerGoal(entry.playerId)}
                        disabled={isPending}
                        title="Restar 1 gol a este jugador"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-900/50 text-zinc-400 hover:text-rose-300 transition-colors border border-zinc-700/60 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <Button
                      size="sm"
                      onClick={() => handleQuickGoal(entry.playerId)}
                      disabled={isPending}
                      className={`text-xs font-bold px-2.5 py-1 gap-1 shadow cursor-pointer ${
                        goalsCount > 0
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-zinc-800 hover:bg-emerald-600 text-zinc-300 hover:text-white border border-zinc-700'
                      }`}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Gol</span>
                    </Button>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlayerForGoal(entry.playerId);
                        setCustomMinute('');
                      }}
                      title="Registrar gol con minuto o tipo (penal/autogol)"
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors border border-zinc-700/60 cursor-pointer text-[10px]"
                    >
                      ⚙️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Match Goal Events Timeline */}
      {goals.length > 0 && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-400" /> Línea de Tiempo del Partido ({goals.length} Goles)
            </h3>
            <span className="text-[11px] text-zinc-500">Orden cronológico</span>
          </div>

          <div className="space-y-2">
            {goals.map((goal, idx) => (
              <div
                key={goal.id || `goal-${idx}`}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-6 text-center font-mono font-bold text-emerald-400 bg-emerald-950/80 px-1 py-0.5 rounded border border-emerald-500/30 text-[11px]">
                    {goal.minute !== undefined && goal.minute !== null ? `${goal.minute}'` : `G${idx + 1}`}
                  </span>
                  <span className="font-bold text-zinc-200">⚽ {getPlayerName(goal.playerId)}</span>
                  <Badge
                    variant="outline"
                    className={`text-[9px] py-0 px-1.5 ${
                      goal.type === 'PENALTY'
                        ? 'border-amber-500/40 text-amber-300'
                        : goal.type === 'OWN_GOAL'
                        ? 'border-rose-500/40 text-rose-300'
                        : 'border-zinc-700 text-zinc-400'
                    }`}
                  >
                    {goal.type === 'PENALTY' ? 'Penal' : goal.type === 'OWN_GOAL' ? 'Autogol' : 'Jugada'}
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteSpecificGoal(goal.id)}
                  disabled={isPending}
                  title="Eliminar este gol"
                  className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal / Dialog for Detailed Goal Customization */}
      {selectedPlayerForGoal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                ⚽ Registrar Gol Detallado
              </h4>
              <button
                type="button"
                onClick={() => setSelectedPlayerForGoal(null)}
                className="text-zinc-400 hover:text-white text-xs cursor-pointer"
              >
                ✕ Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveDetailedGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Jugador Anotador</label>
                <div className="text-xs font-bold text-emerald-400 bg-zinc-950 px-3 py-2 rounded-xl border border-zinc-800">
                  {getPlayerName(selectedPlayerForGoal)}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Minuto del Gol (Opcional)
                </label>
                <input
                  type="number"
                  min="0"
                  max="130"
                  value={customMinute}
                  onChange={(e) => setCustomMinute(e.target.value)}
                  placeholder="Ej: 24 (minuto)"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Tipo de Gol</label>
                <select
                  value={customGoalType}
                  onChange={(e) => setCustomGoalType(e.target.value as GoalType)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="OPEN_PLAY">⚽ Jugada en Vivo (Normal)</option>
                  <option value="PENALTY">🎯 Penal</option>
                  <option value="OWN_GOAL">⚠️ Autogol</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedPlayerForGoal(null)}
                  className="text-xs border-zinc-700 cursor-pointer"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                >
                  Confirmar Gol
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
