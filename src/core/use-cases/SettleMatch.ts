import type {
  Match,
  FinancialEntry,
  IMatchRepository,
  IAttendanceRepository,
  IFinanceRepository,
} from '../domain/index.ts';
import {
  MatchAlreadySettledError,
  InvalidAttendanceStateError,
} from '../domain/index.ts';
import { calculateMatchFee } from './CalculateMatchFee.ts';

export interface SettleMatchInput {
  matchId: string;
  referenceDate?: Date;
}

export interface SettleMatchResult {
  match: Match;
  settledFeePerPlayer: number;
  entries: FinancialEntry[];
}

export class SettleMatchUseCase {
  private readonly matchRepository: IMatchRepository;
  private readonly attendanceRepository: IAttendanceRepository;
  private readonly financeRepository: IFinanceRepository;
  private readonly idGenerator?: () => string;

  constructor(
    matchRepository: IMatchRepository,
    attendanceRepository: IAttendanceRepository,
    financeRepository: IFinanceRepository,
    idGenerator?: () => string
  ) {
    this.matchRepository = matchRepository;
    this.attendanceRepository = attendanceRepository;
    this.financeRepository = financeRepository;
    this.idGenerator = idGenerator;
  }

  async execute(input: SettleMatchInput): Promise<SettleMatchResult> {
    const { matchId, referenceDate = new Date() } = input;

    // 1. Carga el partido por ID. Si no existe, lanza error.
    const match = await this.matchRepository.findById(matchId);
    if (!match) {
      throw new Error(`Match with ID '${matchId}' not found.`);
    }

    // 2. Si el partido ya está en status 'SETTLED', lanza MatchAlreadySettledError.
    if (match.status === 'SETTLED') {
      throw new MatchAlreadySettledError(
        `Match '${matchId}' is already settled.`
      );
    }

    // 2.1. Idempotencia contable: comprobar si ya existen asientos DEBIT para este partido
    const existingEntries = await this.financeRepository.getEntriesByMatchId(matchId);
    const hasExistingDebits = existingEntries.some((e) => e.type === 'DEBIT');
    if (hasExistingDebits) {
      const updatedMatch: Match = {
        ...match,
        status: 'SETTLED',
        updatedAt: new Date(),
      };
      await this.matchRepository.update(updatedMatch);
      throw new MatchAlreadySettledError(
        `El partido '${matchId}' ya fue liquidado previamente y cuenta con débitos registrados en el libro contable.`
      );
    }

    // 3. Carga las asistencias del partido y filtra por jugadores con status 'ATTENDED' (excluye acompañantes que no juegan)
    const attendances = await this.attendanceRepository.findByMatchId(matchId);
    const attendees = attendances.filter(
      (attendance) => attendance.status === 'ATTENDED' && attendance.guestType !== 'COMPANION'
    );

    // 4. Si no hay asistentes válidos, lanza InvalidAttendanceStateError.
    if (attendees.length === 0) {
      throw new InvalidAttendanceStateError(
        `Cannot settle match '${matchId}': No attendees with 'ATTENDED' status found.`
      );
    }

    // 5. Calcula la cuota base de la cancha por asistente (Costo de cancha / total de asistentes)
    const baseFeePerPlayer = calculateMatchFee(match.pitchRentalCost, attendees.length);
    const durationHours = match.durationHours ?? 2;
    const parkingFeePerHour = match.parkingFeePerHour ?? 1000;
    const vehicleParkingFee = durationHours * parkingFeePerHour;

    // 6. Genera un FinancialEntry tipo 'DEBIT' para cada jugador asistente aplicando recargo de parqueadero solo si lleva vehículo
    const entries: FinancialEntry[] = attendees.map((attendee, index) => {
      const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      let entryId = crypto.randomUUID();
      if (this.idGenerator) {
        const gen = this.idGenerator();
        if (UUID_REGEX.test(gen)) {
          entryId = gen;
        }
      }

      const targetPlayerId = attendee.registeredByPlayerId ?? attendee.playerId;
      const isVehicleDriver = !!(attendee.hasVehicle || attendee.vehiclePlate);
      const feeForThisPlayer = baseFeePerPlayer + (isVehicleDriver ? vehicleParkingFee : 0);

      const guestPrefix = attendee.guestName ? ` (Invitado +1: ${attendee.guestName})` : '';
      const vehicleSuffix = isVehicleDriver
        ? ` + Parqueadero ${durationHours}h ($${vehicleParkingFee.toLocaleString('es-CO')} COP)`
        : '';
      const note = `Liquidación partido ${match.location}${guestPrefix} - Cancha ($${baseFeePerPlayer.toLocaleString('es-CO')} COP)${vehicleSuffix}`;

      return {
        id: entryId,
        playerId: targetPlayerId,
        matchId: match.id,
        type: 'DEBIT',
        amount: feeForThisPlayer,
        referenceDate,
        note,
        createdAt: new Date(),
      };
    });

    // 7. Persiste los débitos vía recordBatchEntries.
    await this.financeRepository.recordBatchEntries(entries);

    // 8. Actualiza el partido: status = 'SETTLED', settledFeePerPlayer = cuota base, updatedAt = new Date().
    const updatedMatch: Match = {
      ...match,
      status: 'SETTLED',
      settledFeePerPlayer: baseFeePerPlayer,
      updatedAt: new Date(),
    };

    // 9. Guarda el partido actualizado mediante update.
    await this.matchRepository.update(updatedMatch);

    // 10. Retorna el partido liquidado y el monto asignado.
    return {
      match: updatedMatch,
      settledFeePerPlayer: baseFeePerPlayer,
      entries,
    };
  }
}
