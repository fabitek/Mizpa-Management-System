import type { FinancialEntry, IFinanceRepository } from '../domain/index.ts';
import { InvalidFinancialAmountError } from '../domain/index.ts';

export interface RecordPlayerCreditInput {
  playerId: string;
  amount: number;
  note?: string;
  receiptUrl?: string;
  referenceDate?: Date;
  matchId?: string | null;
}

export interface RecordPlayerCreditResult {
  entry: FinancialEntry;
  newBalance: number;
}

export class RecordPlayerCreditUseCase {
  private readonly financeRepository: IFinanceRepository;
  private readonly idGenerator?: () => string;

  constructor(
    financeRepository: IFinanceRepository,
    idGenerator?: () => string
  ) {
    this.financeRepository = financeRepository;
    this.idGenerator = idGenerator;
  }

  async execute(input: RecordPlayerCreditInput): Promise<RecordPlayerCreditResult> {
    const { playerId, amount, note, receiptUrl, referenceDate = new Date(), matchId } = input;

    if (!amount || amount <= 0 || !Number.isFinite(amount)) {
      throw new InvalidFinancialAmountError(
        'Credit amount must be a finite number greater than zero.'
      );
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    let entryId = crypto.randomUUID();
    if (this.idGenerator) {
      const gen = this.idGenerator();
      if (UUID_REGEX.test(gen)) {
        entryId = gen;
      }
    }

    const entry: FinancialEntry = {
      id: entryId,
      playerId,
      matchId: matchId || null,
      type: 'CREDIT',
      amount,
      referenceDate,
      receiptUrl,
      note: note || 'Abono / Recarga a favor',
      createdAt: new Date(),
    };

    await this.financeRepository.recordEntry(entry);
    const newBalance = await this.financeRepository.getPlayerBalance(playerId);

    return {
      entry,
      newBalance,
    };
  }
}
