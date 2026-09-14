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

  // If match not in repo but matches initialMatch id or fallback
  if (!match) {
    if (initialMatch && id === initialMatch.id) {
      match = initialMatch;
    } else {
      notFound();
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
