import {
  InMemoryMatchRepository,
  InMemoryPlayerRepository,
  InMemoryAttendanceRepository,
  InMemoryFinanceRepository,
  InMemoryGoalRepository,
  InMemoryNotificationService,
} from '../../infrastructure/repositories/in-memory/index.ts';
import {
  CreateMatchUseCase,
  UpdateMatchUseCase,
  DeleteMatchUseCase,
  RegisterAttendanceUseCase,
  CheckinAttendanceUseCase,
  CancelAttendanceUseCase,
  SettleMatchUseCase,
  CalculateMatchFeeUseCase,
  RecordGoalEventUseCase,
  AssignMatchMvpUseCase,
  GetTopScorersUseCase,
  GetLeaderboardOverviewUseCase,
  RecordPlayerCreditUseCase,
  GetPlayerStatementUseCase,
  SendMatchConvocationUseCase,
} from '../use-cases/index.ts';
import type { Player } from '../domain/types.ts';
import { MatchAlreadySettledError } from '../domain/exceptions.ts';

export interface TestResult {
  step: string;
  passed: boolean;
  details: string;
}

export async function runEndToEndLifecycleAudit(): Promise<{ success: boolean; results: TestResult[] }> {
  const results: TestResult[] = [];

  try {
    // 1. Initialize Isolated In-Memory Repositories
    const matchRepo = new InMemoryMatchRepository([]);
    const playerRepo = new InMemoryPlayerRepository([]);
    const attendanceRepo = new InMemoryAttendanceRepository([]);
    const financeRepo = new InMemoryFinanceRepository([]);
    const goalRepo = new InMemoryGoalRepository([]);
    const notificationService = new InMemoryNotificationService([]);

    // 2. Setup 20 Test Players
    const testPlayers: Player[] = [];
    for (let i = 1; i <= 20; i++) {
      const p: Player = {
        id: `player-uuid-${i}`,
        fullName: `Jugador Oficial ${i}`,
        email: `jugador${i}@gmail.com`,
        phone: `30012345${i < 10 ? '0' + i : i}`,
        alias: i === 1 ? 'Capitán' : `Jugador ${i}`,
        isActive: true,
        createdAt: new Date(),
      };
      await playerRepo.save(p);
      testPlayers.push(p);
    }

    results.push({
      step: '1. Creación de Nómina de Jugadores',
      passed: testPlayers.length === 20,
      details: `Se inicializaron ${testPlayers.length} jugadores en la base de datos de pruebas.`,
    });

    // 3. Create Match Use Case
    const createMatch = new CreateMatchUseCase(matchRepo);
    const matchDate = new Date();
    matchDate.setDate(matchDate.getDate() + 2);
    matchDate.setHours(20, 0, 0, 0);

    const match = await createMatch.execute({
      location: 'Abedules de Santa Fe',
      locationAddress: 'Cra. 20 #185-58, Bogotá',
      googleMapsUrl: 'https://maps.app.goo.gl/sample',
      date: matchDate,
      pitchRentalCost: 100000,
      extraCosts: 0,
      durationHours: 2,
      parkingFeePerHour: 1000,
      maxPlayers: 18,
      openImmediately: true,
    });

    results.push({
      step: '2. Creación de Convocatoria Oficial',
      passed: match.status === 'OPEN_REGISTRATION' && match.maxPlayers === 18,
      details: `Partido creado con ID ${match.id} en ${match.location}, cupo máximo: ${match.maxPlayers}, costo: $${match.pitchRentalCost}.`,
    });

    // 4. WhatsApp Convocation Generator
    const sendConvocation = new SendMatchConvocationUseCase(matchRepo, notificationService);
    const convocationMsg = await sendConvocation.execute({
      matchId: match.id,
      baseUrl: 'https://mizpa-fc.vercel.app',
    });

    const hasRsvpLink = convocationMsg.content.includes(`/rsvp/${match.id}`);
    const isBriefTone = convocationMsg.content.includes('⚽ *CONVOCATORIA • MIZPA FC* ⚽');

    results.push({
      step: '3. Generación de Mensaje WhatsApp de Convocatoria',
      passed: hasRsvpLink && isBriefTone,
      details: `Mensaje generado con tono directo y enlace RSVP único: ${convocationMsg.actionUrl}`,
    });

    // 5. Player Registrations (RSVP) & Capacity/Waitlist Testing
    const registerAttendance = new RegisterAttendanceUseCase(matchRepo, attendanceRepo);

    // Register 18 players -> All should be CONFIRMED
    for (let i = 0; i < 18; i++) {
      const reg = await registerAttendance.execute({
        matchId: match.id,
        playerId: testPlayers[i].id,
        hasVehicle: i === 0,
        vehiclePlate: i === 0 ? 'ABC123' : undefined,
      });
      if (reg.attendance.status !== 'CONFIRMED') {
        throw new Error(`Player ${i + 1} should be CONFIRMED, got ${reg.attendance.status}`);
      }
    }

    // Register 19th player -> Should be WAITLIST
    const reg19 = await registerAttendance.execute({
      matchId: match.id,
      playerId: testPlayers[18].id,
    });

    const is19Waitlist = reg19.attendance.status === 'WAITLIST';

    results.push({
      step: '4. Inscripción RSVP & Control de Cupo / Lista de Espera',
      passed: is19Waitlist,
      details: `18 jugadores titulares confirmados. El jugador 19 pasó automáticamente a lista de espera (${reg19.attendance.status}).`,
    });

    // 6. Game Day Check-in (Attendance Verification)
    const checkin = new CheckinAttendanceUseCase(matchRepo, attendanceRepo);
    const cancelAtt = new CancelAttendanceUseCase(matchRepo, attendanceRepo);

    const initialMatchAttendances = await attendanceRepo.findByMatchId(match.id);

    // 16 players attended
    for (let i = 0; i < 16; i++) {
      const att = initialMatchAttendances.find((a) => a.playerId === testPlayers[i].id);
      if (att) {
        await checkin.execute({
          attendanceId: att.id,
          status: 'ATTENDED',
        });
      }
    }

    // 2 players cancelled / did not attend
    for (let i = 16; i < 18; i++) {
      const att = initialMatchAttendances.find((a) => a.playerId === testPlayers[i].id);
      if (att) {
        await cancelAtt.execute({
          attendanceId: att.id,
        });
      }
    }

    const matchAttendances = await attendanceRepo.findByMatchId(match.id);
    const attendedCount = matchAttendances.filter((a) => a.status === 'ATTENDED').length;

    results.push({
      step: '5. Check-in de Asistencia en el Terreno de Juego',
      passed: attendedCount === 16,
      details: `16 jugadores marcados como ATTENDED, 2 marcados como CANCELLED.`,
    });

    // 7. Goals & MVP Assignment
    const recordGoal = new RecordGoalEventUseCase(matchRepo, goalRepo);
    const assignMvp = new AssignMatchMvpUseCase(matchRepo, attendanceRepo);

    await recordGoal.execute({
      matchId: match.id,
      playerId: testPlayers[0].id, // Capitán
      type: 'OPEN_PLAY',
      minute: 15,
    });
    await recordGoal.execute({
      matchId: match.id,
      playerId: testPlayers[0].id,
      type: 'PENALTY',
      minute: 44,
    });
    await recordGoal.execute({
      matchId: match.id,
      playerId: testPlayers[1].id,
      type: 'OPEN_PLAY',
      minute: 78,
    });

    await assignMvp.execute({
      matchId: match.id,
      playerId: testPlayers[0].id,
    });

    const topScorersUseCase = new GetTopScorersUseCase(goalRepo, attendanceRepo);
    const topScorers = await topScorersUseCase.execute();
    const leaderIsCapitan = topScorers[0]?.playerId === testPlayers[0].id && topScorers[0]?.goals === 2;

    results.push({
      step: '6. Registro de Goles & Elección del MVP',
      passed: leaderIsCapitan,
      details: `Goleador líder: ${topScorers[0]?.playerId} con 2 goles. MVP asignado al partido.`,
    });

    // 8. Financial Settlement & Immutable Ledger Debits
    const settleMatch = new SettleMatchUseCase(matchRepo, attendanceRepo, financeRepo);
    const settlementResult = await settleMatch.execute({ matchId: match.id });

    // Total cost = $100.000 / 16 attendees = $6.250 COP per player
    const expectedFee = Math.ceil(100000 / 16); // 6250
    const feeMatches = settlementResult.settledFeePerPlayer === expectedFee;
    const entriesCreated = settlementResult.entries.length === 16;
    const matchStatusSettled = settlementResult.match.status === 'SETTLED';

    // Verify trying to settle again throws MatchAlreadySettledError
    let reSettleThrew = false;
    try {
      await settleMatch.execute({ matchId: match.id });
    } catch (err) {
      if (err instanceof MatchAlreadySettledError) {
        reSettleThrew = true;
      }
    }

    results.push({
      step: '7. Liquidación Financiera Automática & Congelación de Cuota',
      passed: feeMatches && entriesCreated && matchStatusSettled && reSettleThrew,
      details: `Cuota congelada: $${settlementResult.settledFeePerPlayer.toLocaleString('es-CO')} COP por jugador. ${settlementResult.entries.length} débitos registrados en el libro inmutable. Protección contra doble liquidación activa.`,
    });

    // 9. Digital Wallet & Player Credit Payments
    const recordCredit = new RecordPlayerCreditUseCase(financeRepo);
    const getStatement = new GetPlayerStatementUseCase(financeRepo);

    // Initial statement for player 1 -> balance is -6250
    const stmtBefore = await getStatement.execute(testPlayers[0].id);
    const hasInitialDebt = stmtBefore.netBalance === -6250;

    // Player 1 pays $50.000 COP
    await recordCredit.execute({
      playerId: testPlayers[0].id,
      amount: 50000,
      note: 'Transferencia Nequi Pago 8 partidos',
      receiptUrl: 'https://storage.supabase.com/receipts/nequi-123.jpg',
    });

    // Balance should now be -6250 + 50000 = +43750
    const stmtAfter = await getStatement.execute(testPlayers[0].id);
    const hasPositiveBalance = stmtAfter.netBalance === 43750;

    results.push({
      step: '8. Billetera Digital & Registro de Comprobantes de Pago',
      passed: hasInitialDebt && hasPositiveBalance,
      details: `Saldo inicial: -$${Math.abs(stmtBefore.netBalance).toLocaleString('es-CO')}. Pago registrado: $50.000 COP. Saldo a favor: +$${stmtAfter.netBalance.toLocaleString('es-CO')} COP.`,
    });

    // 10. Protection: Cannot delete or update settled match
    const updateMatch = new UpdateMatchUseCase(matchRepo);
    const deleteMatch = new DeleteMatchUseCase(matchRepo, attendanceRepo);

    let updateBlocked = false;
    let deleteBlocked = false;

    try {
      await updateMatch.execute({ id: match.id, pitchRentalCost: 80000 });
    } catch {
      updateBlocked = true;
    }

    try {
      await deleteMatch.execute({ matchId: match.id });
    } catch {
      deleteBlocked = true;
    }

    results.push({
      step: '9. Integridad de Auditoría (Protección de Partidos Liquidados)',
      passed: updateBlocked && deleteBlocked,
      details: `El sistema bloquea modificaciones y eliminaciones de partidos con liquidación contable consolidada.`,
    });

    return {
      success: results.every((r) => r.passed),
      results,
    };
  } catch (err) {
    results.push({
      step: 'Fallo General en Ejecución E2E',
      passed: false,
      details: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      results,
    };
  }
}
