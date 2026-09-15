'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Clock,
  Plus,
  Minus,
  Volume2,
  VolumeX,
  Bell,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { Button } from '../ui/button.tsx';

export type TimerMode = 'COUNTDOWN' | 'STOPWATCH';

interface MatchLiveStopwatchProps {
  matchId: string;
  matchLocation: string;
  durationHours?: number;
}

interface SavedTimerState {
  mode: TimerMode;
  initialMinutes: number;
  remainingSeconds: number;
  stopwatchSeconds: number;
  isRunning: boolean;
  lastTimestamp: number;
}

// Web Audio API synthesized referee whistle & buzzer alert
function playMatchAlarmSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const playWhistleBlast = (startTime: number, duration: number, pitch = 2850) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(pitch, startTime);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(pitch * 1.15, startTime);

      // LFO for referee trill
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.setValueAtTime(28, startTime); // 28Hz flutter
      lfoGain.gain.setValueAtTime(140, startTime);
      lfo.connect(osc1.frequency);
      lfo.connect(osc2.frequency);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.exponentialRampToValueAtTime(0.7, startTime + 0.04);
      gain.gain.setValueAtTime(0.7, startTime + duration - 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      lfo.start(startTime);
      osc1.start(startTime);
      osc2.start(startTime);

      lfo.stop(startTime + duration);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
    };

    const playBuzzerBeep = (startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, startTime);
      osc.frequency.exponentialRampToValueAtTime(440, startTime + duration);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.exponentialRampToValueAtTime(0.5, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    // 3 referee whistle blows
    playWhistleBlast(now, 0.28, 2800);
    playWhistleBlast(now + 0.38, 0.28, 2800);
    playWhistleBlast(now + 0.78, 0.85, 2950);

    // Accompanying electronic chime
    playBuzzerBeep(now + 1.7, 0.3);
    playBuzzerBeep(now + 2.1, 0.5);
  } catch (e) {
    console.warn('Could not play match alarm sound', e);
  }
}

export function MatchLiveStopwatch({
  matchId,
  matchLocation,
  durationHours = 2,
}: MatchLiveStopwatchProps) {
  const storageKey = `mizpa_timer_v2_${matchId}`;

  // Mode: COUNTDOWN (Cuenta Regresiva con Alarma) or STOPWATCH (Ascendente)
  const [mode, setMode] = useState<TimerMode>('COUNTDOWN');
  const [initialMinutes, setInitialMinutes] = useState<number>(5);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(5 * 60);
  const [stopwatchSeconds, setStopwatchSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [customMinInput, setCustomMinInput] = useState<string>('5');

  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger Alarm when time hits 0
  const triggerAlarm = useCallback(() => {
    setIsRunning(false);
    setIsAlarmActive(true);
    if (soundEnabled) {
      playMatchAlarmSound();
      // Repeat sound twice more for notice
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      let count = 0;
      alarmIntervalRef.current = setInterval(() => {
        count++;
        if (count >= 2) {
          if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
        } else {
          playMatchAlarmSound();
        }
      }, 2500);
    }
  }, [soundEnabled]);

  const dismissAlarm = () => {
    setIsAlarmActive(false);
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
  };

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: SavedTimerState = JSON.parse(saved);
        setMode(parsed.mode || 'COUNTDOWN');
        setInitialMinutes(parsed.initialMinutes || 5);
        setCustomMinInput(String(parsed.initialMinutes || 5));

        let currentRemaining = parsed.remainingSeconds;
        let currentStopwatch = parsed.stopwatchSeconds;

        if (parsed.isRunning && parsed.lastTimestamp) {
          const now = Date.now();
          const elapsed = Math.floor((now - parsed.lastTimestamp) / 1000);
          if (parsed.mode === 'COUNTDOWN') {
            currentRemaining = Math.max(0, currentRemaining - elapsed);
          } else {
            currentStopwatch += elapsed;
          }
        }

        setRemainingSeconds(currentRemaining);
        setStopwatchSeconds(currentStopwatch);
        setIsRunning(parsed.isRunning && (parsed.mode === 'STOPWATCH' || currentRemaining > 0));

        if (parsed.isRunning && parsed.mode === 'COUNTDOWN' && currentRemaining === 0) {
          triggerAlarm();
        }
      }
    } catch (e) {
      console.warn('Could not load timer state from localStorage', e);
    }
  }, [matchId, storageKey, triggerAlarm]);

  // Save to localStorage
  useEffect(() => {
    try {
      const stateToSave: SavedTimerState = {
        mode,
        initialMinutes,
        remainingSeconds,
        stopwatchSeconds,
        isRunning,
        lastTimestamp: Date.now(),
      };
      localStorage.setItem(storageKey, JSON.stringify(stateToSave));
    } catch (e) {
      // ignore
    }
  }, [mode, initialMinutes, remainingSeconds, stopwatchSeconds, isRunning, storageKey]);

  // Main Ticker
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning) {
      interval = setInterval(() => {
        if (mode === 'COUNTDOWN') {
          setRemainingSeconds((prev) => {
            if (prev <= 1) {
              triggerAlarm();
              return 0;
            }
            return prev - 1;
          });
        } else {
          setStopwatchSeconds((prev) => prev + 1);
        }
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, mode, triggerAlarm]);

  // Quick Preset Handlers
  const handleSelectPreset = (mins: number) => {
    dismissAlarm();
    setIsRunning(false);
    setMode('COUNTDOWN');
    setInitialMinutes(mins);
    setCustomMinInput(String(mins));
    setRemainingSeconds(mins * 60);
    setShowConfig(false);
  };

  const handleApplyCustomMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseFloat(customMinInput);
    if (!isNaN(mins) && mins > 0) {
      dismissAlarm();
      setIsRunning(false);
      setMode('COUNTDOWN');
      setInitialMinutes(mins);
      setRemainingSeconds(Math.round(mins * 60));
      setShowConfig(false);
    }
  };

  const handleTogglePlay = () => {
    dismissAlarm();
    // Warm up AudioContext on user click so mobile browsers don't block alert sound
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') ctx.resume();
      }
    } catch (e) {}

    if (mode === 'COUNTDOWN' && remainingSeconds === 0) {
      setRemainingSeconds(initialMinutes * 60);
    }
    setIsRunning((prev) => !prev);
  };

  const handleReset = () => {
    dismissAlarm();
    setIsRunning(false);
    if (mode === 'COUNTDOWN') {
      setRemainingSeconds(initialMinutes * 60);
    } else {
      setStopwatchSeconds(0);
    }
  };

  const addSeconds = (secs: number) => {
    dismissAlarm();
    if (mode === 'COUNTDOWN') {
      setRemainingSeconds((prev) => Math.max(0, prev + secs));
    } else {
      setStopwatchSeconds((prev) => Math.max(0, prev + secs));
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const currentDisplaySeconds = mode === 'COUNTDOWN' ? remainingSeconds : stopwatchSeconds;
  const totalTargetSecs = initialMinutes * 60;
  const progressPercent =
    mode === 'COUNTDOWN'
      ? Math.min(100, Math.max(0, ((totalTargetSecs - remainingSeconds) / Math.max(1, totalTargetSecs)) * 100))
      : Math.min(100, (stopwatchSeconds / (durationHours * 3600)) * 100);

  const presets = [
    { label: '5 min (Rápido)', mins: 5 },
    { label: '7 min (Rotación)', mins: 7 },
    { label: '10 min (Futsal)', mins: 10 },
    { label: '15 min (Caimán)', mins: 15 },
    { label: '20 min (Medio)', mins: 20 },
    { label: '45 min (Oficial)', mins: 45 },
  ];

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border transition-all duration-300 shadow-xl backdrop-blur-sm ${
        isAlarmActive
          ? 'bg-rose-950/95 border-rose-500 ring-4 ring-rose-500/50 animate-pulse'
          : isRunning
          ? 'bg-zinc-900/95 border-emerald-500/40 shadow-emerald-950/20'
          : 'bg-zinc-900/90 border-zinc-800'
      } p-4 sm:p-5`}
    >
      {/* Top progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-zinc-800/80">
        <div
          className={`h-full transition-all duration-300 ${
            isAlarmActive
              ? 'bg-rose-500'
              : isRunning
              ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
              : 'bg-zinc-600'
          }`}
          style={{ width: `${isAlarmActive ? 100 : progressPercent}%` }}
        />
      </div>

      {/* Alarm Banner if active */}
      {isAlarmActive && (
        <div className="mb-4 rounded-xl bg-rose-500/20 border border-rose-500/50 p-3.5 flex items-center justify-between gap-3 text-rose-200 animate-bounce">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-rose-400 animate-spin" />
            <div>
              <p className="text-sm font-black text-white tracking-wide">¡TIEMPO CUMPLIDO! ⏰⚽</p>
              <p className="text-xs text-rose-300">Cambio de equipo o fin del periodo ({initialMinutes} min).</p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={dismissAlarm}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3 py-1.5 shadow-lg shadow-rose-950"
          >
            Detener Alarma
          </Button>
        </div>
      )}

      {/* Main Grid */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: Mode Title & Fast Presets */}
        <div className="w-full lg:w-auto flex flex-col gap-2">
          <div className="flex items-center justify-between lg:justify-start gap-2.5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                {mode === 'COUNTDOWN' ? 'Temporizador de Partido' : 'Cronómetro Libre'}
              </span>
              {mode === 'COUNTDOWN' && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  {initialMinutes} min
                </span>
              )}
            </div>

            {/* Sound Mute & Config Toggles */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  if (!soundEnabled) playMatchAlarmSound();
                }}
                title={soundEnabled ? 'Silenciar alarma' : 'Activar alarma sonora'}
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                  soundEnabled
                    ? 'bg-zinc-800 border-zinc-700 text-emerald-400 hover:bg-zinc-700'
                    : 'bg-zinc-800/50 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span className="text-[10px] hidden sm:inline">{soundEnabled ? 'Alarma ON' : 'Mute'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                title="Configurar tiempo personalizado"
                className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                  showConfig
                    ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Ajustar</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-500 truncate max-w-sm">
            {matchLocation} • Sonará silbato y alarma al llegar a 00:00.
          </p>

          {/* Quick Presets Bar */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase mr-1 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-400" /> Presets:
            </span>
            {presets.map((p) => (
              <button
                key={p.mins}
                type="button"
                onClick={() => handleSelectPreset(p.mins)}
                className={`px-2 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                  mode === 'COUNTDOWN' && initialMinutes === p.mins
                    ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20 font-bold'
                    : 'bg-zinc-800/90 text-zinc-300 hover:bg-zinc-700 hover:text-white border border-zinc-700/60'
                }`}
              >
                {p.mins}m
              </button>
            ))}
          </div>
        </div>

        {/* Center: Big Digital Clock & Micro-adjustments */}
        <div className="flex items-center gap-3 py-1">
          <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-2xl px-6 py-3 shadow-inner flex items-baseline gap-2.5">
            <span
              className={`font-mono text-4xl sm:text-5xl font-black tracking-tight ${
                isAlarmActive
                  ? 'text-rose-400 drop-shadow-[0_0_16px_rgba(244,63,94,0.6)]'
                  : isRunning
                  ? 'text-emerald-400 drop-shadow-[0_0_14px_rgba(52,211,153,0.35)]'
                  : remainingSeconds === 0 && mode === 'COUNTDOWN'
                  ? 'text-rose-500'
                  : 'text-zinc-200'
              }`}
            >
              {formatTime(currentDisplaySeconds)}
            </span>
            <span className="font-mono text-xs font-bold text-zinc-500 uppercase">
              {mode === 'COUNTDOWN' ? 'Restante' : 'Total'}
            </span>
          </div>

          {/* Micro buttons (+1m, -1m, +30s) */}
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => addSeconds(60)}
              title="Sumar 1 minuto (+60s)"
              className="px-1.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-[10px] font-bold flex items-center justify-center cursor-pointer border border-zinc-700"
            >
              +1m
            </button>
            <button
              type="button"
              onClick={() => addSeconds(-60)}
              title="Restar 1 minuto (-60s)"
              className="px-1.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors text-[10px] font-bold flex items-center justify-center cursor-pointer border border-zinc-700"
            >
              -1m
            </button>
          </div>
        </div>

        {/* Right: Primary Action Controls */}
        <div className="flex items-center gap-2 flex-wrap justify-center lg:justify-end w-full lg:w-auto">
          <Button
            onClick={handleTogglePlay}
            size="sm"
            className={`font-bold gap-2 text-xs px-4 py-2.5 shadow-lg cursor-pointer transition-all ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4 fill-current" /> Pausar
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                {currentDisplaySeconds === 0 && mode === 'COUNTDOWN' ? 'Reiniciar & Iniciar' : 'Iniciar'}
              </>
            )}
          </Button>

          <Button
            onClick={handleReset}
            size="sm"
            variant="outline"
            className="border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs px-3 py-2.5 gap-1.5 cursor-pointer"
            title="Reiniciar tiempo inicial"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reiniciar
          </Button>

          {/* Test Sound Button */}
          <button
            type="button"
            onClick={playMatchAlarmSound}
            title="Probar sonido de alarma / silbato"
            className="p-2.5 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 transition-colors border border-zinc-700/80 cursor-pointer"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible Custom Minutes Configuration Form */}
      {showConfig && (
        <form
          onSubmit={handleApplyCustomMinutes}
          className="mt-4 pt-3 border-t border-zinc-800 flex flex-wrap items-center gap-3 bg-zinc-950/50 p-3 rounded-xl"
        >
          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <Settings2 className="w-3.5 h-3.5 text-emerald-400" /> Tiempo exacto por periodo:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="120"
              value={customMinInput}
              onChange={(e) => setCustomMinInput(e.target.value)}
              className="w-20 px-2.5 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs font-mono text-center focus:outline-none focus:border-emerald-500"
              placeholder="Minutos"
            />
            <span className="text-xs text-zinc-400">minutos</span>
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1"
            >
              Establecer
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="text-zinc-500">Modo:</span>
            <button
              type="button"
              onClick={() => {
                setMode('COUNTDOWN');
                setIsRunning(false);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                mode === 'COUNTDOWN'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Cuenta Regresiva
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('STOPWATCH');
                setIsRunning(false);
              }}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                mode === 'STOPWATCH'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              Ascendente
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
