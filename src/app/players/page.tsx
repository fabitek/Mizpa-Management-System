import { playerRepository, authService } from '../../infrastructure/container.ts';
import { initialPlayers } from '../../infrastructure/seed-data.ts';
import { PlayerRosterView } from '../../components/players/PlayerRosterView.tsx';

export const dynamic = 'force-dynamic';

export default async function PlayersPage() {
  let dbPlayers: any[] = [];
  let currentRole: any = 'ADMIN';

  try {
    dbPlayers = await playerRepository.findAll();
  } catch (err) {
    console.warn('PlayersPage playerRepository.findAll warning:', err);
  }

  try {
    const session = await authService.getCurrentSession();
    if (session?.user?.role) {
      currentRole = session.user.role;
    }
  } catch (err) {
    console.warn('PlayersPage authService.getCurrentSession warning:', err);
  }

  const playersList = dbPlayers.length > 0 ? dbPlayers : initialPlayers;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <PlayerRosterView
        initialPlayers={playersList}
        currentUserRole={currentRole}
      />
    </main>
  );
}
