import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import type { Match, Attendance, Player } from '../src/core/domain/types.ts';
import {
  MatchNotFoundError,
  InvalidAttendanceStateError,
} from '../src/core/domain/exceptions.ts';
import { InMemoryMatchRepository } from '../src/infrastructure/repositories/in-memory/InMemoryMatchRepository.ts';
import { InMemoryAttendanceRepository } from '../src/infrastructure/repositories/in-memory/InMemoryAttendanceRepository.ts';
import { InMemoryFinanceRepository } from '../src/infrastructure/repositories/in-memory/InMemoryFinanceRepository.ts';
import { InMemoryAuthService } from '../src/infrastructure/repositories/in-memory/InMemoryAuthService.ts';
import { InMemoryNotificationService } from '../src/infrastructure/repositories/in-memory/InMemoryNotificationService.ts';
import {
  SendMatchConvocationUseCase,
  SendSettlementAlertsUseCase,
  SendDebtReminderUseCase,
  GetNotificationsLogUseCase,
  SwitchSessionUserUseCase,
} from '../src/core/use-cases/index.ts';

describe('Phase 6: Auth, Roles & Notifications Use Cases', () => {
  let matchRepo: InMemoryMatchRepository;
  let attendanceRepo: InMemoryAttendanceRepository;
  let financeRepo: InMemoryFinanceRepository;
  let authService: InMemoryAuthService;
  let notificationService: InMemoryNotificationService;

  let sendConvocation: SendMatchConvocationUseCase;
  let sendSettlementAlerts: SendSettlementAlertsUseCase;
  let sendDebtReminder: SendDebtReminderUseCase;
  let getNotificationsLog: GetNotificationsLogUseCase;
  let switchUser: SwitchSessionUserUseCase;

  const testPlayers: Player[] = [
    {
      id: 'admin-1',
      fullName: 'Carlos Valderrama',
      email: 'pibe@mizpa.com',
      role: 'ADMIN',
      phone: '+573001234567',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'captain-1',
      fullName: 'Mario Yepes',
      email: 'yepes@mizpa.com',
      role: 'CAPTAIN',
      phone: '+573109876543',
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: 'player-1',
      fullName: 'Radamel Falcao',
      email: 'tigre@mizpa.com',
      role: 'PLAYER',
      phone: '+573187654321',
      isActive: true,
      createdAt: new Date(),
    },
  ];

  const testMatch: Match = {
    id: 'match-notif-1',
    date: new Date('2026-09-20T19:00:00Z'),
    location: 'Cancha Los Sauces',
    pitchRentalCost: 100000,
    extraCosts: 20000,
    maxPlayers: 10,
    settledFeePerPlayer: null,
    status: 'OPEN_REGISTRATION',
    createdAt: new Date('2026-09-10'),
    updatedAt: new Date('2026-09-10'),
  };

  beforeEach(() => {
    matchRepo = new InMemoryMatchRepository([testMatch]);
    attendanceRepo = new InMemoryAttendanceRepository();
    financeRepo = new InMemoryFinanceRepository();
    authService = new InMemoryAuthService(testPlayers);
    notificationService = new InMemoryNotificationService();

    sendConvocation = new SendMatchConvocationUseCase(matchRepo, notificationService);
    sendSettlementAlerts = new SendSettlementAlertsUseCase(
      matchRepo,
      attendanceRepo,
      financeRepo,
      notificationService
    );
    sendDebtReminder = new SendDebtReminderUseCase(financeRepo, notificationService);
    getNotificationsLog = new GetNotificationsLogUseCase(notificationService);
    switchUser = new SwitchSessionUserUseCase(authService);
  });

  describe('AuthService & Role Permissions (RBAC)', () => {
    it('should default to admin session and allow switching users and roles', async () => {
      const initialSession = await authService.getCurrentSession();
      assert.ok(initialSession);
      assert.equal(initialSession.user.role, 'ADMIN');
      assert.equal(initialSession.user.fullName, 'Carlos Valderrama');

      // Switch to captain
      const captainSession = await switchUser.execute('captain-1');
      assert.equal(captainSession.user.role, 'CAPTAIN');
      assert.equal(captainSession.user.fullName, 'Mario Yepes');

      // Switch to regular player
      const playerSession = await switchUser.execute('player-1');
      assert.equal(playerSession.user.role, 'PLAYER');
      assert.equal(playerSession.user.fullName, 'Radamel Falcao');
    });

    it('should enforce role hierarchy: ADMIN > CAPTAIN > PLAYER', () => {
      // ADMIN
      assert.ok(authService.checkPermission('ADMIN', 'ADMIN'));
      assert.ok(authService.checkPermission('ADMIN', 'CAPTAIN'));
      assert.ok(authService.checkPermission('ADMIN', 'PLAYER'));

      // CAPTAIN
      assert.equal(authService.checkPermission('CAPTAIN', 'ADMIN'), false);
      assert.ok(authService.checkPermission('CAPTAIN', 'CAPTAIN'));
      assert.ok(authService.checkPermission('CAPTAIN', 'PLAYER'));

      // PLAYER
      assert.equal(authService.checkPermission('PLAYER', 'ADMIN'), false);
      assert.equal(authService.checkPermission('PLAYER', 'CAPTAIN'), false);
      assert.ok(authService.checkPermission('PLAYER', 'PLAYER'));
    });
  });

  describe('SendMatchConvocationUseCase', () => {
    it('should generate and save a match convocation with WhatsApp format', async () => {
      const notif = await sendConvocation.execute({
        matchId: testMatch.id,
        recipientPlayerId: 'player-1',
        recipientPhone: '+573187654321',
      });

      assert.ok(notif.id);
      assert.equal(notif.channel, 'WHATSAPP');
      assert.equal(notif.type, 'MATCH_CONVOCATION');
      assert.ok(notif.content.includes('Cancha Los Sauces'));
      assert.ok(notif.content.includes('$12.000 COP')); // 120,000 / 10 = 12,000

      const log = await getNotificationsLog.execute();
      assert.equal(log.length, 1);
      assert.equal(log[0].id, notif.id);
    });

    it('should generate a single RSVP link for WhatsApp group broadcast when recipient is omitted', async () => {
      const notif = await sendConvocation.execute({
        matchId: testMatch.id,
        baseUrl: 'https://mizpa.app',
      });

      assert.ok(notif.id);
      assert.equal(notif.recipientPlayerId, 'GROUP');
      assert.equal(notif.channel, 'WHATSAPP');
      assert.equal(notif.type, 'MATCH_CONVOCATION');
      assert.equal(notif.actionUrl, `/rsvp/${testMatch.id}`);
      assert.ok(notif.content.includes('https://mizpa.app/rsvp/match-notif-1'));
      assert.ok(notif.content.includes('Cupos por orden de llegada'));

      // Verify that WhatsApp link without phone has no phone= parameter (opens group picker)
      const waGroupLink = notificationService.generateWhatsAppLink('', notif.content);
      assert.ok(waGroupLink.startsWith('https://api.whatsapp.com/send?text='));
      assert.ok(!waGroupLink.includes('phone='));
    });

    it('should include Google Maps link, address, and Mizpa community rules in convocation text', async () => {
      const matchWithAddress: Match = {
        ...testMatch,
        id: 'match-with-maps',
        location: 'Cancha El Campín 5',
        locationAddress: 'Cra. 30 #57-60, Bogotá',
        googleMapsUrl: 'https://maps.app.goo.gl/Vz5sFySMVhGJFrc3A?g_st=ic',
      };
      await matchRepo.save(matchWithAddress);

      const notif = await sendConvocation.execute({
        matchId: matchWithAddress.id,
        baseUrl: 'https://mizpa.app',
      });

      assert.ok(notif.content.includes('Cra. 30 #57-60, Bogotá'));
      assert.ok(notif.content.includes('https://maps.app.goo.gl/Vz5sFySMVhGJFrc3A?g_st=ic'));
      assert.ok(notif.content.includes('Zapatillas para sintética (sin taches / cero guayos)'));
    });

    it('should throw MatchNotFoundError when match does not exist', async () => {
      await assert.rejects(
        async () =>
          await sendConvocation.execute({
            matchId: 'invalid-id',
            recipientPlayerId: 'player-1',
          }),
        (err: Error) => {
          assert.ok(err instanceof MatchNotFoundError);
          return true;
        }
      );
    });

    it('should throw InvalidAttendanceStateError when match is not open for registration', async () => {
      await matchRepo.save({
        ...testMatch,
        id: 'settled-match',
        status: 'SETTLED',
      });

      await assert.rejects(
        async () =>
          await sendConvocation.execute({
            matchId: 'settled-match',
            recipientPlayerId: 'player-1',
          }),
        (err: Error) => {
          assert.ok(err instanceof InvalidAttendanceStateError);
          return true;
        }
      );
    });
  });

  describe('SendSettlementAlertsUseCase', () => {
    it('should send settlement fee alerts to attended players and charge host for +1 guests', async () => {
      const settledMatch: Match = {
        ...testMatch,
        id: 'match-settled-1',
        status: 'SETTLED',
        settledFeePerPlayer: 15000,
      };
      await matchRepo.save(settledMatch);

      // Player 1 attended
      await attendanceRepo.save({
        id: 'att-1',
        matchId: settledMatch.id,
        playerId: 'player-1',
        status: 'ATTENDED',
        registeredAt: new Date(),
      });

      // Guest of Player 1 attended
      await attendanceRepo.save({
        id: 'att-guest',
        matchId: settledMatch.id,
        playerId: 'guest-temp-id',
        registeredByPlayerId: 'player-1',
        guestName: 'Andrés Amigo',
        status: 'ATTENDED',
        registeredAt: new Date(),
      });

      const sentAlerts = await sendSettlementAlerts.execute(settledMatch.id);

      assert.equal(sentAlerts.length, 2);
      // Both alerts should be addressed to player-1 (one for himself, one for his guest)
      assert.equal(sentAlerts[0].recipientPlayerId, 'player-1');
      assert.equal(sentAlerts[1].recipientPlayerId, 'player-1');
      assert.ok(sentAlerts[0].content.includes('$15.000 COP'));
    });
  });

  describe('SendDebtReminderUseCase', () => {
    it('should generate a debt reminder when player has a negative balance', async () => {
      // Create a DEBIT entry of 30,000 for player-1
      await financeRepo.recordEntry({
        id: 'deb-1',
        playerId: 'player-1',
        type: 'DEBIT',
        amount: 30000,
        referenceDate: new Date(),
        createdAt: new Date(),
      });

      const reminder = await sendDebtReminder.execute('player-1');
      assert.ok(reminder);
      assert.equal(reminder?.type, 'DEBT_REMINDER');
      assert.ok(reminder?.content.includes('$30.000 COP'));
    });

    it('should return null when player is solvent (no debt)', async () => {
      // Create CREDIT entry of 50,000
      await financeRepo.recordEntry({
        id: 'cred-1',
        playerId: 'player-1',
        type: 'CREDIT',
        amount: 50000,
        referenceDate: new Date(),
        createdAt: new Date(),
      });

      const reminder = await sendDebtReminder.execute('player-1');
      assert.equal(reminder, null);
    });
  });

  describe('NotificationService WhatsApp Links', () => {
    it('should generate valid WhatsApp click-to-chat links with sanitized phone and encoded text', () => {
      const link = notificationService.generateWhatsAppLink(
        '+57 (318) 765-4321',
        '¡Hola! Cuota confirmada: $15.000'
      );

      assert.ok(link.startsWith('https://api.whatsapp.com/send?phone=573187654321&text='));
      assert.ok(link.includes('%C2%A1Hola!'));
    });
  });
});
