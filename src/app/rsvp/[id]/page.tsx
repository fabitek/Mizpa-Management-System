import { notFound } from 'next/navigation';
import {
  matchRepository,
  attendanceRepository,
  playerRepository,
  reconcileMatchAttendancesUseCase,
} from '../../../infrastructure/container.ts';
import { initialPlayers, initialMatch } from '../../../infrastructure/seed-data.ts';
import { PublicRsvpView } from '../../../components/rsvp/PublicRsvpView.tsx';

export const dynamic = 'force-dynamic';

interface RsvpPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RsvpPage({ params }: RsvpPageProps) {
  const { id } = await params;

  let match = await matchRepository.findById(id);

  // Fallback 1: Si es el ID inicial estático
  if (!match && initialMatch && id === initialMatch.id) {
    match = initialMatch;
  }

  // Fallback 2: Si el ID no existe (p. ej. compartido en WhatsApp con ID viejo o no sincronizado),
  // intentar resolver automáticamente el partido abierto más reciente para no romper la experiencia
  if (!match) {
    try {
      const allMatches = await matchRepository.findAll();
      const openMatch = allMatches
        .filter((m) => m.status === 'OPEN_REGISTRATION' || m.status === 'DRAFT')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      if (openMatch) {
        match = openMatch;
      } else if (initialMatch) {
        match = initialMatch;
      }
    } catch (err) {
      console.warn('Fallback match lookup failed:', err);
    }
  }

  // If match still not found, render friendly message with redirect button
  if (!match) {
    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl">
              ⚽
            </div>
            <h1 className="text-xl font-bold text-white">Convocatoria no encontrada</h1>
            <p className="text-sm text-zinc-400">
              El partido solicitado (ID: <span className="font-mono text-xs text-amber-300">{id}</span>) no existe o fue eliminado.
            </p>
            <div className="pt-2">
              <a
                href="/matches"
                className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg transition-colors text-sm"
              >
                Ver Partidos Disponibles
              </a>
            </div>
          </div>
        </main>
      );
  }

  let attendances: any[] = [];
  let playersList = initialPlayers;

  const [attendancesRes, playersRes] = await Promise.allSettled([
    reconcileMatchAttendancesUseCase.execute(match.id).catch(() => attendanceRepository.findByMatchId(match.id)),
    playerRepository.findAll(),
  ]);

  if (attendancesRes.status === 'fulfilled') {
    const val = attendancesRes.value as any;
    attendances = val?.allAttendances ?? (Array.isArray(val) ? val : []);
  }

  if (playersRes.status === 'fulfilled' && playersRes.value && playersRes.value.length > 0) {
    playersList = playersRes.value;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <PublicRsvpView
        match={match}
        initialAttendances={attendances}
        players={playersList}
      />
    </main>
  );
}
