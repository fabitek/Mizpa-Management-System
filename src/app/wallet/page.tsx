import {
  getAllPlayersFinancialOverviewUseCase,
  getPlayerStatementUseCase,
  playerRepository,
} from '../../infrastructure/container.ts';
import { initialPlayers } from '../../infrastructure/seed-data.ts';
import { PlayerWalletView } from '../../components/wallet/PlayerWalletView.tsx';

import type { TreasuryOverview, PlayerFinancialStatement } from '../../core/use-cases/index.ts';

export const dynamic = 'force-dynamic';

export default async function WalletPage() {
  let players = initialPlayers;
  try {
    const dbPlayers = await playerRepository.findAll();
    if (dbPlayers && dbPlayers.length > 0) {
      players = dbPlayers;
    }
  } catch (err) {
    console.warn('WalletPage players warning:', err);
  }

  const playerIds = players.map((p) => p.id);
  let overview: TreasuryOverview = {
    totalTreasuryBalance: 0,
    totalOutstandingDebt: 0,
    totalCreditsCollected: 0,
    totalDebitsIssued: 0,
    playerBalances: [],
  };

  try {
    overview = await getAllPlayersFinancialOverviewUseCase.execute(playerIds);
  } catch (err) {
    console.warn('WalletPage overview warning:', err);
  }

  const firstPlayerId = players[0]?.id ?? '';
  let initialStatement: PlayerFinancialStatement = {
    playerId: firstPlayerId,
    entries: [],
    totalCredits: 0,
    totalDebits: 0,
    netBalance: 0,
    status: 'SOLVENT',
    debtAmount: 0,
  };

  if (firstPlayerId) {
    try {
      initialStatement = await getPlayerStatementUseCase.execute(firstPlayerId);
    } catch (err) {
      console.warn('WalletPage initialStatement warning:', err);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 py-10 px-4 sm:px-6 lg:px-8">
      <PlayerWalletView
        players={players}
        initialOverview={overview}
        initialSelectedPlayerId={firstPlayerId}
        initialStatement={initialStatement}
      />
    </main>
  );
}
