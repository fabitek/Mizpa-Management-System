import { notFound } from 'next/navigation';
import { matchRepository, attendanceRepository, playerRepository } from '../../../infrastructure/container.ts';
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

  // If match not found, render friendly message with redirect button
  if (!match) {
    if (initialMatch && id === initialMatch.id) {
      match = initialMatch;
    } else {
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
                Ver Lista de Partidos Oficiales
              </a>
            </div>
          </div>
        </main>
      );
    }
  }

  let attendances: any[] = [];
  try {
    attendances = await attendanceRepository.findByMatchId(match.id);
  } catch (err) {
    console.warn('RsvpPage attendances warning:', err);
  }

  let playersList = initialPlayers;
  try {
    const dbPlayers = await playerRepository.findAll();
    if (dbPlayers.length > 0) playersList = dbPlayers;
  } catch (err) {
    console.warn('RsvpPage players warning:', err);
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
