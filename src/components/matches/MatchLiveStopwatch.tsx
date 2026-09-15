'use client';

import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  Plus,
  Minus,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/button.tsx';

export type MatchPeriod =
  | 'NOT_STARTED'
  | 'FIRST_HALF'
  | 'HALF_TIME'
  | 'SECOND_HALF'
  | 'EXTRA_TIME'
  | 'FINISHED';

interface MatchLiveStopwatchProps {
  matchId: string;
  matchLocation: string;
  durationHours?: number;
  onPeriodChange?: (period: MatchPeriod) => void;
}

interface SavedTimerState {
  period: MatchPeriod;
  isRunning: boolean;
  secondsElapsed: number;
  lastTimestamp: number;
}

export function MatchLiveStopwatch({
  matchId,
  matchLocation,
  durationHours = 2,
  onPeriodChange,
}: MatchLiveStopwatchProps) {
  const targetTotalMinutes = durationHours * 60;
  const halfDurationMinutes = Math.floor(targetTotalMinutes / 2);

  const storageKey = `mizpa_timer_${matchId}`;

  const [period, setPeriod] = useState<MatchPeriod>('NOT_STARTED');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [seconds, setSeconds] = useState<number>(0);

  // Load initial timer from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: SavedTimerState = JSON.parse(saved);
        let currentSeconds = parsed.secondsElapsed;
        if (parsed.isRunning && parsed.lastTimestamp) {
          const now = Date.now();
          const diffSeconds = Math.floor((now - parsed.lastTimestamp) / 1000);
          currentSeconds += Math.max(0, diffSeconds);
        }
        setPeriod(parsed.period);
        setIsRunning(parsed.isRunning);
        setSeconds(currentSeconds);
      }
    } catch (e) {
      console.warn('Could not load timer state from localStorage', e);
    }
  }, [matchId, storageKey]);

  // Save timer state periodically
  useEffect(() => {
    try {
      const stateToSave: SavedTimerState = {
        period,
        isRunning,
        secondsElapsed: seconds,
        lastTimestamp: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (e) {
      // ignore
    }
  }, [period, isRunning, seconds, storageKey]);

  // Stopwatch interval tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning]);

  const updatePeriod = (newPeriod: MatchPeriod) => {
    setPeriod(newPeriod);
    if (onPeriodChange) onPeriodChange(newPeriod);
  };

  const handleStartFirstHalf = () => {
    updatePeriod('FIRST_HALF');
    setIsRunning(true);
  };

  const handlePauseToggle = () => {
    setIsRunning((prev) => !prev);
  };

  const handleHalfTime = () => {
    setIsRunning(false);
    updatePeriod('HALF_TIME');
  };

  const handleStartSecondHalf = () => {
    if (seconds < halfDurationMinutes * 60) {
      setSeconds(halfDurationMinutes * 60);
    }
    updatePeriod('SECOND_HALF');
    setIsRunning(true);
  };

  const handleFinishMatch = () => {
    setIsRunning(false);
    updatePeriod('FINISHED');
  };

  const handleReset = () => {
    if (window.confirm('¿Deseas reiniciar el cronómetro del partido a 00:00?')) {
      setIsRunning(false);
      setSeconds(0);
      updatePeriod('NOT_STARTED');
      try {
        localStorage.removeItem(storageKey);
      } catch (e) {}
    }
  };

  const addMinutes = (mins: number) => {
    setSeconds((prev) => Math.max(0, prev + mins * 60));
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentMinute = Math.floor(seconds / 60) + (seconds > 0 ? 1 : 0);
  const totalTargetSecs = targetTotalMinutes * 60;
  const progressPercent = Math.min(100, Math.round((seconds / Math.max(1, totalTargetSecs)) * 100));

  const getPeriodBadge = () => {
    switch (period) {
      case 'NOT_STARTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
            ⚪ Por Iniciar
          </span>
        );
      case 'FIRST_HALF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            🔴 1T EN VIVO
          </span>
        );
      case 'HALF_TIME':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950/70 text-amber-300 border border-amber-500/30">
            ⏸️ Entretiempo
          </span>
        );
      case 'SECOND_HALF':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/70 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            🔴 2T EN VIVO
          </span>
        );
      case 'EXTRA_TIME':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-950/70 text-purple-300 border border-purple-500/30">
            ⚡ Tiempo Extra
          </span>
        );
      case 'FINISHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-600">
            🏁 Finalizado
          </span>
        );
    }
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-sm">
      {/* Subtle top indicator bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800">
        <div
          className={`h-full transition-all duration-300 ${
            isRunning ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-zinc-600'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left: Status & Location */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Control de Tiempo en Vivo
              </span>
              {getPeriodBadge()}
            </div>
            <p className="text-xs text-zinc-500 truncate max-w-xs sm:max-w-md">
              {matchLocation} • Meta: {targetTotalMinutes} min ({halfDurationMinutes}m / {halfDurationMinutes}m)
            </p>
          </div>
        </div>

        {/* Center: Digital Clock */}
        <div className="flex items-center gap-4 py-1">
          <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-2xl px-5 py-2.5 shadow-inner flex items-baseline gap-2">
            <span
              className={`font-mono text-3xl sm:text-4xl font-black tracking-tight ${
                isRunning
                  ? 'text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : period === 'FINISHED'
                  ? 'text-zinc-500'
                  : 'text-zinc-200'
              }`}
            >
              {formatTime(seconds)}
            </span>
            {seconds > 0 && (
              <span className="font-mono text-xs font-bold text-zinc-400">
                Min {currentMinute}&apos;
              </span>
            )}
          </div>

          {/* Micro minute adjustment buttons */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => addMinutes(1)}
              title="Sumar 1 minuto"
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors text-[10px] flex items-center justify-center cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => addMinutes(-1)}
              title="Restar 1 minuto"
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors text-[10px] flex items-center justify-center cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-end w-full md:w-auto">
          {period === 'NOT_STARTED' && (
            <Button
              onClick={handleStartFirstHalf}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 shadow-md shadow-emerald-950 text-xs px-3.5 py-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Iniciar Partido
            </Button>
          )}

          {(period === 'FIRST_HALF' || period === 'SECOND_HALF' || period === 'EXTRA_TIME') && (
            <>
              <Button
                onClick={handlePauseToggle}
                size="sm"
                variant={isRunning ? 'outline' : 'default'}
                className={`gap-1.5 text-xs font-semibold px-3 py-2 ${
                  isRunning
                    ? 'border-amber-500/40 text-amber-300 hover:bg-amber-950/40'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" /> Pausar
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" /> Reanudar
                  </>
                )}
              </Button>

              {period === 'FIRST_HALF' && (
                <Button
                  onClick={handleHalfTime}
                  size="sm"
                  variant="outline"
                  className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs px-2.5 py-2"
                  title="Pausar y marcar entretiempo"
                >
                  Entretiempo
                </Button>
              )}

              <Button
                onClick={handleFinishMatch}
                size="sm"
                variant="outline"
                className="border-rose-500/30 text-rose-300 hover:bg-rose-950/30 hover:border-rose-500/60 text-xs px-2.5 py-2"
              >
                <Square className="w-3 h-3 fill-current" /> Finalizar
              </Button>
            </>
          )}

          {period === 'HALF_TIME' && (
            <Button
              onClick={handleStartSecondHalf}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold gap-1.5 text-xs px-3.5 py-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Iniciar 2do Tiempo
            </Button>
          )}

          {period === 'FINISHED' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Concluido
              </span>
            </div>
          )}

          {/* Reset button */}
          {(period !== 'NOT_STARTED' || seconds > 0) && (
            <button
              type="button"
              onClick={handleReset}
              title="Reiniciar cronómetro"
              className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
