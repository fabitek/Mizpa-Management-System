import {
  getNotificationsLogUseCase,
  matchRepository,
  playerRepository,
  attendanceRepository,
  financeRepository,
} from '../../infrastructure/container.ts';
import { initialPlayers } from '../../infrastructure/seed-data.ts';
import { NotificationsView } from '../../components/notifications/NotificationsView.tsx';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage() {
  const [notifsRes, matchesRes, playersRes, attendancesRes, financeRes] = await Promise.allSettled([
    getNotificationsLogUseCase.execute(),
    matchRepository.findAll(),
    playerRepository.findAll(),
    attendanceRepository.findAll(),
    financeRepository.getAllEntries(),
  ]);

  const notifications = notifsRes.status === 'fulfilled' ? notifsRes.value : [];
  const allMatches = matchesRes.status === 'fulfilled' ? matchesRes.value : [];
  const dbPlayers = playersRes.status === 'fulfilled' ? playersRes.value : [];
  const players = dbPlayers && dbPlayers.length > 0 ? dbPlayers : initialPlayers;
  const attendances = attendancesRes.status === 'fulfilled' ? attendancesRes.value : [];
  const financialEntries = financeRes.status === 'fulfilled' ? financeRes.value : [];
  
  // Sort matches by createdAt descending (newest first)
  const sortedMatches = [...allMatches].sort(
    (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  );
  
  // Try to find the most recent open/draft match, or the latest created match
  const activeMatch = sortedMatches.find(m => m.status === 'OPEN_REGISTRATION' || m.status === 'DRAFT') || sortedMatches[0] || null;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <NotificationsView
        players={players}
        matches={sortedMatches}
        activeMatch={activeMatch}
        initialNotifications={notifications}
        initialAttendances={attendances}
        initialFinancialEntries={financialEntries}
      />
    </main>
  );
}
