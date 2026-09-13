import { getNotificationsLogUseCase, matchRepository } from '../../infrastructure/container.ts';
import { initialPlayers, initialMatch } from '../../infrastructure/seed-data.ts';
import { NotificationsView } from '../../components/notifications/NotificationsView.tsx';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const notifications = await getNotificationsLogUseCase.execute();
  const allMatches = await matchRepository.findAll();
  
  // Try to find the most recent open/draft match, or just the last created match
  const activeMatch = allMatches.length > 0 
    ? [...allMatches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] 
    : initialMatch;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <NotificationsView
        players={initialPlayers}
        activeMatch={activeMatch}
        initialNotifications={notifications}
      />
    </main>
  );
}
