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
  let notifications: any[] = [];
  let allMatches: any[] = [];
  let players: any[] = [];
  let attendances: any[] = [];
  let financialEntries: any[] = [];

  try {
    notifications = await getNotificationsLogUseCase.execute();
  } catch (err) {
    console.warn('NotificationsPage notifications warning:', err);
  }

  try {
    allMatches = await matchRepository.findAll();
  } catch (err) {
    console.warn('NotificationsPage matches warning:', err);
  }

  try {
    const dbPlayers = await playerRepository.findAll();
    if (dbPlayers && dbPlayers.length > 0) {
      players = dbPlayers;
    } else {
      players = initialPlayers;
    }
  } catch (err) {
    console.warn('NotificationsPage players warning:', err);
    players = initialPlayers;
  }

  try {
    attendances = await attendanceRepository.findAll();
  } catch (err) {
    console.warn('NotificationsPage attendances warning:', err);
  }

  try {
    financialEntries = await financeRepository.getAllEntries();
  } catch (err) {
    console.warn('NotificationsPage financialEntries warning:', err);
  }
  
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
