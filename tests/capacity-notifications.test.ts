import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import type { Match, Attendance, Player } from '../src/core/domain/types.ts';
import { MatchNotFoundError } from '../src/core/domain/exceptions.ts';
import {
  formatWhatsAppGroupCapacityMessage,
  formatSecurityGateRosterMessage,
  formatMatchDateTime,
} from '../src/core/utils/capacity-formatters.ts';
import { CheckAndNotifyCapacityReachedUseCase } from '../src/core/use-cases/CheckAndNotifyCapacityReached.ts';
import { InMemoryMatchRepository } from '../src/infrastructure/repositories/in-memory/InMemoryMatchRepository.ts';
import { InMemoryAttendanceRepository } from '../src/infrastructure/repositories/in-memory/InMemoryAttendanceRepository.ts';
import { InMemoryPlayerRepository } from '../src/infrastructure/repositories/in-memory/InMemoryPlayerRepository.ts';
import { InMemoryNotificationService } from '../src/infrastructure/repositories/in-memory/InMemoryNotificationService.ts';
import { InMemoryNotificationGateway } from '../src/infrastructure/adapters/whatsapp/InMemoryNotificationGateway.ts';
import { WhatsAppNotificationGateway } from '../src/infrastructure/adapters/whatsapp/WhatsAppNotificationGateway.ts';

describe('Phase 7: 10-Player Capacity Notification Automation', () => {
  let matchRepo: InMemoryMatchRepository;
  let attendanceRepo: InMemoryAttendanceRepository;
  let playerRepo: InMemoryPlayerRepository;
  let notifService: InMemoryNotificationService;
  let notifGateway: InMemoryNotificationGateway;
  let checkAndNotifyUseCase: CheckAndNotifyCapacityReachedUseCase;

  const mockPlayers: Player[] = [
    {
      id: 'p-01',
      fullName: 'Fabian Tellez',
      email: 'fabian@mizpa.com',
      documentId: 'CC 1020304050',
      phone: '+573001112233',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'p-02',
      fullName: 'Mario Yepes',
      email: 'mario@mizpa.com',
      documentId: 'CC 1030405060',
      phone: '+573002223344',
      role: 'CAPTAIN',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'p-03',
      fullName: 'Radamel Falcao',
      email: 'falcao@mizpa.com',
      documentId: 'CC 1040506070',
      phone: '+573003334455',
      role: 'PLAYER',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'p-04',
      fullName: 'James Rodriguez',
      email: 'james@mizpa.com',
      documentId: 'CC 1050607080',
      phone: '+573004445566',
      role: 'PLAYER',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'p-05',
      fullName: 'Juan Cuadrado',
      email: 'cuadrado@mizpa.com',
      documentId: 'CC 1060708090',
      phone: '+573005556677',
      role: 'PLAYER',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'p-06',
      fullName: 'David Ospina',
      email: 'ospina@mizpa.com',
      documentId: 'CC 1070809010',
      phone: '+573006667788',
      role: 'PLAYER',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'p-07',
      fullName: 'Luis Diaz',
      email: 'lucho@mizpa.com',
      documentId: 'CC 1080901020',
      phone: '+573007778899',
      role: 'PLAYER',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'p-08',
      fullName: 'Carlos Valderrama',
      email: 'pibe@mizpa.com',
      documentId: 'CC 1090102030',
      phone: '+573008889900',
      role: 'ADMIN',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'p-09',
      fullName: 'Faustino Asprilla',
      email: 'tino@mizpa.com',
      documentId: 'CC 1100203040',
      phone: '+573009990011',
      role: 'PLAYER',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'p-10',
      fullName: 'Freddy Rincon',
      email: 'freddy@mizpa.com',
      documentId: 'CC 1110304050',
      phone: '+573000001122',
      role: 'PLAYER',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
    {
      id: 'p-11',
      fullName: 'Ivan Cordoba',
      email: 'ivan@mizpa.com',
      documentId: 'CC 1120405060',
      phone: '+573001113344',
      role: 'PLAYER',
      isActive: true,
      createdAt: new Date('2026-01-01'),
    },
  ];

  const testMatch: Match = {
    id: 'match-quorum-10',
    date: new Date('2026-09-26T18:00:00Z'),
    location: 'Cancha Los Sauces - Sintética 1',
    locationAddress: 'Cra 30 #57-60, Bogotá',
    googleMapsUrl: 'https://maps.app.goo.gl/sample123',
    pitchRentalCost: 180000,
    extraCosts: 20000,
    durationHours: 2,
    maxPlayers: 18,
    settledFeePerPlayer: null,
    status: 'OPEN_REGISTRATION',
    notificationSent10Players: false,
    createdAt: new Date('2026-09-14'),
    updatedAt: new Date('2026-09-14'),
  };

  beforeEach(async () => {
    matchRepo = new InMemoryMatchRepository();
    await matchRepo.save({ ...testMatch, notificationSent10Players: false });
    attendanceRepo = new InMemoryAttendanceRepository();
    await attendanceRepo.deleteByMatchId(testMatch.id);
    playerRepo = new InMemoryPlayerRepository(mockPlayers);
    notifService = new InMemoryNotificationService();
    notifGateway = new InMemoryNotificationGateway();

    checkAndNotifyUseCase = new CheckAndNotifyCapacityReachedUseCase(
      matchRepo,
      attendanceRepo,
      playerRepo,
      notifGateway,
      notifService
    );
  });

  describe('Pure Formatters Unit Tests', () => {
    it('should format WhatsApp group message with sporty tone, roster 1-10, and remaining spots', () => {
      const formatted = formatWhatsAppGroupCapacityMessage({
        matchId: testMatch.id,
        matchLocation: testMatch.location,
        matchLocationAddress: testMatch.locationAddress,
        matchDate: testMatch.date,
        googleMapsUrl: testMatch.googleMapsUrl,
        confirmedCount: 10,
        totalCapacity: 18,
        remainingSpots: 8,
        rsvpUrl: 'https://mizpa.app/rsvp/match-quorum-10',
        roster: Array.from({ length: 10 }, (_, i) => ({
          slotNumber: i + 1,
          playerId: `p-${String(i + 1).padStart(2, '0')}`,
          fullName: i === 2 ? 'Carlos Sanchez' : mockPlayers[i].fullName,
          isGuest: i === 2,
          guestName: i === 2 ? 'Carlos Sanchez' : undefined,
          hostPlayerName: i === 2 ? 'Mario Yepes' : undefined,
          guestType: 'PLAYER',
          registeredAt: new Date(),
        })),
      });

      assert.ok(formatted.includes('🔥 *¡QUÓRUM ALCANZADO (10/18)! PARTIDO CONFIRMADO* ⚽'));
      assert.ok(formatted.includes('Cancha Los Sauces - Sintética 1 (Cra 30 #57-60, Bogotá)'));
      assert.ok(formatted.includes('01. ⚽ Fabian Tellez'));
      assert.ok(formatted.includes('02. ⚽ Mario Yepes'));
      assert.ok(formatted.includes('03. ⚽ Carlos Sanchez (+1 Invitado Jugador de Mario Yepes)'));
      assert.ok(formatted.includes('⚡ *Cupos Restantes:* ¡Quedan *8* cupos disponibles en cancha!'));
      assert.ok(formatted.includes('https://mizpa.app/rsvp/match-quorum-10'));
      assert.ok(formatted.includes('_Mizpa FC • Fútbol, Integración y Disciplina_'));
    });

    it('should format Security Gate access roster with formal structure, ID documents, and vehicle plates', () => {
      const formatted = formatSecurityGateRosterMessage({
        matchId: testMatch.id,
        matchLocation: testMatch.location,
        matchLocationAddress: testMatch.locationAddress,
        matchDate: testMatch.date,
        durationHours: 2,
        confirmedCount: 3,
        roster: [
          {
            slotNumber: 1,
            playerId: 'p-01',
            fullName: 'Fabian Tellez',
            documentId: 'CC 1020304050',
            hasVehicle: true,
            vehiclePlate: 'ABC123',
            isGuest: false,
            registeredAt: new Date(),
          },
          {
            slotNumber: 2,
            playerId: 'p-02',
            fullName: 'Mario Yepes',
            documentId: 'CC 1030405060',
            hasVehicle: false,
            isGuest: false,
            registeredAt: new Date(),
          },
          {
            slotNumber: 3,
            playerId: 'guest-01',
            fullName: 'Carlos Sanchez',
            hasVehicle: true,
            vehiclePlate: 'XYZ789',
            isGuest: true,
            guestName: 'Carlos Sanchez',
            hostPlayerName: 'Mario Yepes',
            registeredAt: new Date(),
          },
        ],
      });

      assert.ok(formatted.includes('PLANILLA DE INGRESO Y PORTERÍA - MIZPA FC'));
      assert.ok(formatted.includes('• *Tiempo Reservado:* 2 Horas'));
      assert.ok(formatted.includes('01. Fabian Tellez (Jugador en cancha)'));
      assert.ok(formatted.includes('📄 Doc: CC 1020304050 | 🚗 Placa: ABC123'));
      assert.ok(formatted.includes('02. Mario Yepes (Jugador en cancha)'));
      assert.ok(formatted.includes('📄 Doc: CC 1030405060 | 🚗 Placa: Peatonal'));
      assert.ok(formatted.includes('03. Carlos Sanchez (Invitado Jugador de Mario Yepes)'));
      assert.ok(formatted.includes('📄 Doc: Sin documento registrado | 🚗 Placa: XYZ789'));
      assert.ok(formatted.includes('• *Total Personas Autorizadas:* 3'));
      assert.ok(formatted.includes('• *Total Vehículos Autorizados:* 2'));
    });
  });

  describe('CheckAndNotifyCapacityReachedUseCase', () => {
    beforeEach(async () => {
      await matchRepo.save({ ...testMatch, notificationSent10Players: false });
      await attendanceRepo.deleteByMatchId(testMatch.id);
      playerRepo = new InMemoryPlayerRepository();
      for (const p of mockPlayers) {
        await playerRepo.save(p);
      }
      notifGateway = new InMemoryNotificationGateway();
      notifService = new InMemoryNotificationService();
      checkAndNotifyUseCase = new CheckAndNotifyCapacityReachedUseCase(
        matchRepo,
        attendanceRepo,
        playerRepo,
        notifGateway,
        notifService
      );
    });

    it('should NOT trigger notification when confirmed count is less than 10 (e.g. 9 players)', async () => {
      // Register 9 players
      for (let i = 0; i < 9; i++) {
        await attendanceRepo.save({
          id: `att-0${i + 1}`,
          matchId: testMatch.id,
          playerId: mockPlayers[i].id,
          status: 'CONFIRMED',
          registeredAt: new Date(Date.now() + i * 1000),
        });
      }

      const result = await checkAndNotifyUseCase.execute({ matchId: testMatch.id });

      assert.equal(result.triggered, false);
      assert.equal(result.reason, 'CAPACITY_NOT_10');
      assert.equal(result.confirmedCount, 9);
      assert.equal(notifGateway.getSentGroupMessages().length, 0);
      assert.equal(notifGateway.getSentGateMessages().length, 0);

      const match = await matchRepo.findById(testMatch.id);
      assert.equal(match?.notificationSent10Players, false);
    });

    it('should trigger both WhatsApp Group and Security Gate notifications when exactly 10 players confirm', async () => {
      // Register 10 players
      for (let i = 0; i < 10; i++) {
        await attendanceRepo.save({
          id: `att-10-${i + 1}`,
          matchId: testMatch.id,
          playerId: mockPlayers[i].id,
          status: 'CONFIRMED',
          hasVehicle: i % 2 === 0,
          vehiclePlate: i % 2 === 0 ? `MIZ00${i + 1}` : undefined,
          registeredAt: new Date(Date.now() + i * 1000),
        });
      }

      const result = await checkAndNotifyUseCase.execute({
        matchId: testMatch.id,
        baseUrl: 'https://mizpa-fc.vercel.app',
      });

      assert.equal(result.triggered, true);
      assert.equal(result.reason, 'NOTIFICATION_SENT');
      assert.equal(result.confirmedCount, 10);
      assert.ok(result.groupMessage);
      assert.ok(result.gateMessage);

      // Verify Gateway received both dispatches
      const groupDispatches = notifGateway.getSentGroupMessages();
      const gateDispatches = notifGateway.getSentGateMessages();
      assert.equal(groupDispatches.length, 1);
      assert.equal(gateDispatches.length, 1);

      assert.ok(groupDispatches[0].formattedText.includes('🔥 *¡QUÓRUM ALCANZADO (10/18)! PARTIDO CONFIRMADO* ⚽'));
      assert.ok(groupDispatches[0].formattedText.includes('Fabian Tellez'));
      assert.ok(groupDispatches[0].formattedText.includes('Freddy Rincon'));
      assert.ok(groupDispatches[0].formattedText.includes('Quedan *8* cupos disponibles'));

      assert.ok(gateDispatches[0].formattedText.includes('PLANILLA DE INGRESO Y PORTERÍA - MIZPA FC'));
      assert.ok(gateDispatches[0].formattedText.includes('CC 1020304050'));
      assert.ok(gateDispatches[0].formattedText.includes('MIZ001'));

      // Verify Idempotency flag persisted on match
      const updatedMatch = await matchRepo.findById(testMatch.id);
      assert.equal(updatedMatch?.notificationSent10Players, true);

      // Verify Notification Service logged the audit event
      const logs = await notifService.getAll();
      assert.equal(logs.length, 1);
      assert.equal(logs[0].type, 'CAPACITY_REACHED_10');
    });

    it('should enforce idempotency: second call when already sent does NOT re-dispatch', async () => {
      // Setup match with flag already true
      await matchRepo.save({
        ...testMatch,
        notificationSent10Players: true,
      });

      // Register 10 players
      for (let i = 0; i < 10; i++) {
        await attendanceRepo.save({
          id: `att-idem-${i + 1}`,
          matchId: testMatch.id,
          playerId: mockPlayers[i].id,
          status: 'CONFIRMED',
          registeredAt: new Date(Date.now() + i * 1000),
        });
      }

      const result = await checkAndNotifyUseCase.execute({ matchId: testMatch.id });

      assert.equal(result.triggered, false);
      assert.equal(result.reason, 'ALREADY_SENT');
      assert.equal(notifGateway.getSentGroupMessages().length, 0);
      assert.equal(notifGateway.getSentGateMessages().length, 0);

      // When force: true is passed, allows admin re-dispatch
      const forcedResult = await checkAndNotifyUseCase.execute({
        matchId: testMatch.id,
        force: true,
      });
      assert.equal(forcedResult.triggered, true);
      assert.equal(notifGateway.getSentGroupMessages().length, 1);
    });

    it('should count both registered players and guests towards 10 confirmed attendees', async () => {
      // 7 regular players
      for (let i = 0; i < 7; i++) {
        await attendanceRepo.save({
          id: `att-p-${i + 1}`,
          matchId: testMatch.id,
          playerId: mockPlayers[i].id,
          status: 'CONFIRMED',
          registeredAt: new Date(Date.now() + i * 1000),
        });
      }

      // 3 guest players (+1s) registered by player 1, 2, and 3
      await attendanceRepo.save({
        id: 'att-g-1',
        matchId: testMatch.id,
        playerId: 'p-01',
        registeredByPlayerId: 'p-01',
        guestName: 'Andres Amigo',
        guestType: 'PLAYER',
        hasVehicle: true,
        vehiclePlate: 'AND123',
        status: 'CONFIRMED',
        registeredAt: new Date(Date.now() + 7000),
      });

      await attendanceRepo.save({
        id: 'att-g-2',
        matchId: testMatch.id,
        playerId: 'p-02',
        registeredByPlayerId: 'p-02',
        guestName: 'Carlos Cuñado',
        guestType: 'PLAYER',
        hasVehicle: false,
        status: 'CONFIRMED',
        registeredAt: new Date(Date.now() + 8000),
      });

      await attendanceRepo.save({
        id: 'att-g-3',
        matchId: testMatch.id,
        playerId: 'p-03',
        registeredByPlayerId: 'p-03',
        guestName: 'Santiago Primo',
        guestType: 'COMPANION',
        hasVehicle: true,
        vehiclePlate: 'SAN456',
        status: 'CONFIRMED',
        registeredAt: new Date(Date.now() + 9000),
      });

      const result = await checkAndNotifyUseCase.execute({ matchId: testMatch.id });

      assert.equal(result.triggered, true);
      assert.equal(result.confirmedCount, 10);
      assert.ok(result.groupMessage?.includes('Andres Amigo (+1 Invitado Jugador de Fabian Tellez)'));
      assert.ok(result.groupMessage?.includes('Carlos Cuñado (+1 Invitado Jugador de Mario Yepes)'));
      assert.ok(result.groupMessage?.includes('Santiago Primo (Acompañante de Radamel Falcao)'));

      assert.ok(result.gateMessage?.includes('Andres Amigo (Invitado Jugador de Fabian Tellez)'));
      assert.ok(result.gateMessage?.includes('🚗 Placa: AND123'));
    });

    it('should throw MatchNotFoundError when match ID does not exist', async () => {
      await assert.rejects(
        async () => await checkAndNotifyUseCase.execute({ matchId: 'non-existent-id' }),
        (err: Error) => {
          assert.ok(err instanceof MatchNotFoundError);
          return true;
        }
      );
    });
  });

  describe('Infrastructure Adapters', () => {
    it('should dispatch cleanly using production WhatsAppNotificationGateway in simulation mode', async () => {
      const prodGateway = new WhatsAppNotificationGateway({ provider: 'simulation' });

      const groupRes = await prodGateway.sendWhatsAppGroupMessage(
        {
          matchId: testMatch.id,
          matchLocation: testMatch.location,
          matchDate: testMatch.date,
          confirmedCount: 10,
          totalCapacity: 18,
          remainingSpots: 8,
          roster: [],
        },
        'Simulated Group Message'
      );

      const gateRes = await prodGateway.sendSecurityGateRoster(
        {
          matchId: testMatch.id,
          matchLocation: testMatch.location,
          matchDate: testMatch.date,
          confirmedCount: 10,
          roster: [],
        },
        'Simulated Gate Message'
      );

      assert.equal(groupRes.success, true);
      assert.equal(groupRes.provider, 'simulation');
      assert.equal(gateRes.success, true);
      assert.equal(gateRes.provider, 'simulation');
    });
  });
});
