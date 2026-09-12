'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table.tsx';
import { recordPlayerCreditAction, getPlayerStatementAction } from '../../app/actions/finance-actions.ts';
import type { Player, FinancialEntry } from '../../core/domain/index.ts';
import type { TreasuryOverview, PlayerFinancialStatement } from '../../core/use-cases/index.ts';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  History,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  ArrowLeft,
  Receipt,
  User,
  Trophy,
} from 'lucide-react';

interface PlayerWalletViewProps {
  players: Player[];
  initialOverview: TreasuryOverview;
  initialSelectedPlayerId: string;
  initialStatement: PlayerFinancialStatement;
}

export function PlayerWalletView({
  players,
  initialOverview,
  initialSelectedPlayerId,
  initialStatement,
}: PlayerWalletViewProps) {
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialSelectedPlayerId);
  const [statement, setStatement] = useState<PlayerFinancialStatement>(initialStatement);
  const [overview, setOverview] = useState<TreasuryOverview>(initialOverview);

  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditNote, setCreditNote] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');

  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId) || players[0];

  const handlePlayerChange = (newPlayerId: string) => {
    setSelectedPlayerId(newPlayerId);
    startTransition(async () => {
      const res = await getPlayerStatementAction(newPlayerId);
      if (res.success && res.data) {
        setStatement(res.data as any);
      }
    });
  };

  const handleRecordCredit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(creditAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFeedback({ success: false, message: 'Ingresa un monto válido mayor a cero.' });
      return;
    }

    startTransition(async () => {
      const res = await recordPlayerCreditAction(
        selectedPlayerId,
        amountNum,
        creditNote.trim() || undefined,
        receiptUrl.trim() || undefined
      );

      setFeedback(res);

      if (res.success) {
        // Refresh statement
        const stmtRes = await getPlayerStatementAction(selectedPlayerId);
        if (stmtRes.success && stmtRes.data) {
          setStatement(stmtRes.data as any);
        }

        // Update local overview
        setOverview((prev) => ({
          ...prev,
          totalCreditsCollected: prev.totalCreditsCollected + amountNum,
          totalTreasuryBalance: prev.totalTreasuryBalance + amountNum,
        }));

        setCreditAmount('');
        setCreditNote('');
        setReceiptUrl('');
      }
    });
  };

  const isSolvent = statement.netBalance >= 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/matches">
              <Button variant="ghost" size="sm" className="gap-1 text-zinc-400 hover:text-white">
                <ArrowLeft className="w-4 h-4" /> Partidos
              </Button>
            </Link>
            <Link href="/stats">
              <Button variant="ghost" size="sm" className="gap-1 text-zinc-400 hover:text-white">
                <Trophy className="w-4 h-4 text-amber-400" /> Estadísticas & Ranking
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
              💳 Billetera del Jugador & Tesorería
            </h1>
          </div>
          <p className="text-zinc-400 mt-1 text-sm">
            Control de abonos, recargas y estados de cuenta individuales con libro contable inmutable.
          </p>
        </div>
      </div>

      {/* Global Treasury Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Saldo Neto en Caja
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-emerald-400">
              ${overview.totalTreasuryBalance.toLocaleString('es-CO')} COP
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            Total abonos menos liquidaciones ejecutadas.
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <TrendingDown className="w-4 h-4 text-red-400" /> Cartera por Cobrar
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-red-400">
              ${overview.totalOutstandingDebt.toLocaleString('es-CO')} COP
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            Suma de saldos pendientes de jugadores en mora.
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <TrendingUp className="w-4 h-4 text-blue-400" /> Total Abonos Recibidos
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-white">
              ${overview.totalCreditsCollected.toLocaleString('es-CO')} COP
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            Ingresos históricos registrados por transferencias.
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/60">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <CreditCard className="w-4 h-4 text-amber-400" /> Total Liquidado
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-white">
              ${overview.totalDebitsIssued.toLocaleString('es-CO')} COP
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            Cuotas cobradas por partidos e invitados jugados.
          </CardContent>
        </Card>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-lg flex items-start gap-3 border ${
            feedback.success
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-red-950/40 border-red-500/40 text-red-200'
          }`}
        >
          {feedback.success ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{feedback.success ? 'Operación Exitosa' : 'Aviso'}</p>
            <p className="text-sm opacity-90">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Main Content Grid: Player Selector & Top-Up Form + Statement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Player Selector & Record Credit Form */}
        <div className="space-y-6">
          {/* Select Player Card */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" /> Seleccionar Jugador
              </CardTitle>
              <CardDescription className="text-xs">
                Consulta el estado de cuenta y realiza abonos a la billetera.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={selectedPlayerId}
                onChange={(e) => handlePlayerChange(e.target.value)}
                disabled={isPending}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} ({p.alias || 'Jugador'})
                  </option>
                ))}
              </select>

              {/* Current Player Status Summary */}
              <div className="mt-4 p-4 rounded-lg border border-zinc-800 bg-zinc-950/50 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-400">Estado de Cuenta:</span>
                  <Badge variant={isSolvent ? 'success' : 'destructive'} className="text-xs font-semibold">
                    {isSolvent ? 'AL DÍA' : 'DEUDA PENDIENTE'}
                  </Badge>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-zinc-400">Saldo Actual:</span>
                  <span
                    className={`font-mono text-xl font-bold ${
                      isSolvent ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    ${statement.netBalance.toLocaleString('es-CO')} COP
                  </span>
                </div>
                {!isSolvent && (
                  <p className="text-xs text-red-400">
                    Monto adeudado por cuotas: ${statement.debtAmount.toLocaleString('es-CO')} COP
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Record Credit (Top-up) Form */}
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Registrar Abono / Recarga (CREDIT)
              </CardTitle>
              <CardDescription className="text-xs">
                Asigna saldo a favor a {selectedPlayer.fullName} respaldado por transferencia.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecordCredit} className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Monto del Abono ($ COP):</label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    placeholder="Ej: 50000"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(e.target.value)}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Concepto / Referencia:</label>
                  <input
                    type="text"
                    placeholder="Ej: Transferencia Nequi #87234"
                    value={creditNote}
                    onChange={(e) => setCreditNote(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">URL del Comprobante (Opcional):</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={receiptUrl}
                    onChange={(e) => setReceiptUrl(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isPending || !creditAmount}
                  variant="default"
                  className="w-full font-medium"
                >
                  {isPending ? 'Registrando...' : 'Registrar Abono en Libro Contable'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Statement Movements Ledger */}
        <div className="lg:col-span-2">
          <Card className="border-zinc-800 bg-zinc-900/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <History className="w-5 h-5 text-emerald-400" /> Libro Mayor de Movimientos
                </span>
                <span className="text-xs font-normal text-zinc-400">
                  {statement.entries.length} movimientos registrados
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Asientos inmutables de débito (partidos e invitados) y crédito (abonos) para {selectedPlayer.fullName}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statement.entries.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No hay movimientos contables registrados para este jugador.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Concepto / Detalle</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {statement.entries.map((entry) => {
                      const isCredit = entry.type === 'CREDIT';
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="text-xs text-zinc-400 whitespace-nowrap font-mono">
                            {new Date(entry.referenceDate).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={isCredit ? 'success' : 'destructive'}
                              className="text-xs font-mono tracking-wider"
                            >
                              {entry.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-zinc-200">
                            <div>{entry.note || (isCredit ? 'Abono a favor' : 'Cobro por partido')}</div>
                            {entry.receiptUrl && (
                              <a
                                href={entry.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <Receipt className="w-3 h-3" /> Ver comprobante
                              </a>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-semibold ${
                              isCredit ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {isCredit ? '+' : '-'}${entry.amount.toLocaleString('es-CO')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
