'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table.tsx';
import { ReceiptUploader } from './ReceiptUploader.tsx';
import { OperatingExpensesCard } from './OperatingExpensesCard.tsx';
import {
  recordPlayerCreditAction,
  getPlayerStatementAction,
  deleteFinancialEntryAction,
} from '../../app/actions/finance-actions.ts';
import type { Player } from '../../core/domain/index.ts';
import type {
  TreasuryOverview,
  PlayerFinancialStatement,
  OperatingExpensesSummary,
} from '../../core/use-cases/index.ts';
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
  ShoppingBag,
  Building2,
  Eye,
  X,
  Sparkles,
  Share2,
  Trash2,
} from 'lucide-react';

interface PlayerWalletViewProps {
  players: Player[];
  initialOverview: TreasuryOverview;
  initialSelectedPlayerId: string;
  initialStatement: PlayerFinancialStatement;
  initialExpensesSummary: OperatingExpensesSummary;
}

export function PlayerWalletView({
  players,
  initialOverview,
  initialSelectedPlayerId,
  initialStatement,
  initialExpensesSummary,
}: PlayerWalletViewProps) {
  const [activeTab, setActiveTab] = useState<'players' | 'expenses' | 'treasury'>('players');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>(initialSelectedPlayerId);
  const [statement, setStatement] = useState<PlayerFinancialStatement>(initialStatement);
  const [overview, setOverview] = useState<TreasuryOverview>(initialOverview);

  // Credit top-up form state
  const [creditAmount, setCreditAmount] = useState<string>('');
  const [creditNote, setCreditNote] = useState<string>('');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [ocrDetectedBadge, setOcrDetectedBadge] = useState<string | null>(null);

  // Receipt Modal viewer
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

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
          netPettyCashBalance: prev.netPettyCashBalance + amountNum,
        }));

        setCreditAmount('');
        setCreditNote('');
        setReceiptUrl('');
        setOcrDetectedBadge(null);
      }
    });
  };

  const handleDeleteEntry = (entryId: string) => {
    startTransition(async () => {
      const res = await deleteFinancialEntryAction(entryId);
      setFeedback(res);
      if (res.success) {
        const stmtRes = await getPlayerStatementAction(selectedPlayerId);
        if (stmtRes.success && stmtRes.data) {
          setStatement(stmtRes.data as any);
        }
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
              💳 Tesorería & Finanzas
            </h1>
          </div>
          <p className="text-zinc-400 mt-1 text-sm">
            Control de abonos con OCR, comprobantes bancarios, caja menor de gastos y estados de cuenta.
          </p>
        </div>

        {/* Tab Navigation Pill Selector */}
        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-2xl p-1 gap-1 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('players')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'players'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <User className="w-4 h-4" /> Billetera de Jugadores
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('expenses')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'expenses'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <ShoppingBag className="w-4 h-4" /> Caja Menor & Gastos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('treasury')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'treasury'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
            }`}
          >
            <Building2 className="w-4 h-4" /> Tesorería 360°
          </button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: PLAYERS WALLET & MOVEMENTS LEDGER */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'players' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
                  <DollarSign className="w-4 h-4 text-emerald-400" /> Saldo Neto en Caja
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-emerald-400">
                  ${overview.totalTreasuryBalance.toLocaleString('es-CO')} COP
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400">
                Total abonos menos liquidaciones de cancha.
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
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

            <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
                  <TrendingUp className="w-4 h-4 text-blue-400" /> Total Abonos Recibidos
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-white">
                  ${overview.totalCreditsCollected.toLocaleString('es-CO')} COP
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400">
                Ingresos históricos por transferencias Nequi/Bancolombia.
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
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
              className={`p-4 rounded-xl flex items-start gap-3 border animate-in fade-in ${
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
                <p className="font-semibold text-xs">{feedback.success ? 'Operación Exitosa' : 'Aviso'}</p>
                <p className="text-xs opacity-90">{feedback.message}</p>
              </div>
            </div>
          )}

          {/* Main Grid: Player Selector & Top-Up Form + Statement */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Player Selector & Record Credit Form */}
            <div className="space-y-6">
              {/* Select Player Card */}
              <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
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
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} {p.documentId ? `(CC: ${p.documentId})` : ''}
                      </option>
                    ))}
                  </select>

                  {/* Current Player Status Summary */}
                  <div className="mt-4 p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-400">Estado de Cuenta:</span>
                      <Badge
                        variant={isSolvent ? 'success' : 'destructive'}
                        className="text-xs font-semibold px-2 py-0.5"
                      >
                        {isSolvent ? 'AL DÍA ✓' : 'DEUDA PENDIENTE'}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-xs text-zinc-400">Saldo Actual:</span>
                      <span
                        className={`font-mono text-2xl font-bold ${
                          isSolvent ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        ${statement.netBalance.toLocaleString('es-CO')} COP
                      </span>
                    </div>
                    {!isSolvent && (
                      <p className="text-xs text-red-400 flex items-center gap-1 pt-1 border-t border-zinc-800/80">
                        <AlertCircle className="w-3.5 h-3.5" /> Monto adeudado: ${statement.debtAmount.toLocaleString('es-CO')} COP
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Record Credit (Top-up) Form with Receipt Uploader & OCR */}
              <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-emerald-400" /> Registrar Abono / Recarga
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Asigna saldo a favor a {selectedPlayer.fullName} respaldado por transferencia.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRecordCredit} className="space-y-4">
                    {/* Integrated Receipt Uploader with OCR */}
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1.5 font-medium flex items-center justify-between">
                        <span>Foto / Captura de Comprobante:</span>
                        <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                          <Sparkles className="w-3 h-3 text-amber-400" /> OCR Inteligente
                        </span>
                      </label>
                      <ReceiptUploader
                        currentReceiptUrl={receiptUrl}
                        onReceiptLoaded={({ receiptUrl: url, suggestedAmount, suggestedNote, ocrResult }) => {
                          setReceiptUrl(url);
                          if (suggestedAmount) {
                            setCreditAmount(suggestedAmount.toString());
                          }
                          if (suggestedNote) {
                            setCreditNote(suggestedNote);
                          }
                          if (ocrResult) {
                            setOcrDetectedBadge(ocrResult.detectedBank);
                          }
                        }}
                        onClearReceipt={() => {
                          setReceiptUrl('');
                          setOcrDetectedBadge(null);
                        }}
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1 font-medium">
                        Monto del Abono ($ COP):
                      </label>
                      <input
                        type="number"
                        min="1000"
                        step="1000"
                        placeholder="Ej: 50000"
                        value={creditAmount}
                        onChange={(e) => setCreditAmount(e.target.value)}
                        required
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1 font-medium">
                        Concepto / Referencia Bancaria:
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Transferencia Nequi #M87234"
                        value={creditNote}
                        onChange={(e) => setCreditNote(e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isPending || !creditAmount}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                    >
                      {isPending ? 'Registrando en Libro Contable...' : 'Registrar Abono en Libro Contable 💳'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right Column: Statement Movements Ledger */}
            <div className="lg:col-span-2">
              <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <History className="w-5 h-5 text-emerald-400" /> Libro Mayor de Movimientos
                    </span>
                    <span className="text-xs font-normal text-zinc-400 font-mono">
                      {statement.entries.length} movimientos
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
                          <TableHead className="text-center">Comprobante</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                          <TableHead className="text-right">Acción</TableHead>
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
                                  className="text-[10px] font-mono tracking-wider px-1.5 py-0.5"
                                >
                                  {entry.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs text-zinc-200">
                                <div>{entry.note || (isCredit ? 'Abono a favor' : 'Cobro por partido')}</div>
                              </TableCell>
                              <TableCell className="text-center">
                                {entry.receiptUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => setPreviewModalUrl(entry.receiptUrl!)}
                                    className="text-xs text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-1"
                                  >
                                    <Receipt className="w-3.5 h-3.5" /> Ver
                                  </button>
                                ) : (
                                  <span className="text-[10px] text-zinc-600">—</span>
                                )}
                              </TableCell>
                              <TableCell
                                className={`text-right font-mono font-bold text-xs ${
                                  isCredit ? 'text-emerald-400' : 'text-red-400'
                                }`}
                              >
                                {isCredit ? '+' : '-'}${entry.amount.toLocaleString('es-CO')}
                              </TableCell>
                              <TableCell className="text-right">
                                {isCredit && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                    disabled={isPending}
                                    className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors"
                                    title="Anular / Eliminar abono erróneo"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 inline" />
                                  </button>
                                )}
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
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: OPERATING EXPENSES & PETTY CASH */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'expenses' && (
        <div className="animate-in fade-in duration-300">
          <OperatingExpensesCard
            initialSummary={initialExpensesSummary}
            players={players}
            totalCreditsCollected={overview.totalCreditsCollected}
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: CONSOLIDATED 360° TREASURY */}
      {/* ------------------------------------------------------------- */}
      {activeTab === 'treasury' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Detailed Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs text-zinc-400">
                  Balance Real en Caja Menor
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-emerald-400">
                  ${(overview.totalCreditsCollected - initialExpensesSummary.totalAmount).toLocaleString('es-CO')} COP
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400">
                Abonos Recaudados (${overview.totalCreditsCollected.toLocaleString('es-CO')}) menos Gastos Operativos (${initialExpensesSummary.totalAmount.toLocaleString('es-CO')}).
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs text-zinc-400">
                  Cartera Pendiente por Cobrar
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-red-400">
                  ${overview.totalOutstandingDebt.toLocaleString('es-CO')} COP
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400">
                {overview.playerBalances.filter((p) => p.status === 'DEBTOR').length} jugadores con saldo negativo por cuotas.
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs text-zinc-400">
                  Eficiencia de Recaudo
                </CardDescription>
                <CardTitle className="text-2xl font-mono text-blue-400">
                  {overview.totalDebitsIssued > 0
                    ? `${Math.round((overview.totalCreditsCollected / overview.totalDebitsIssued) * 100)}%`
                    : '100%'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-zinc-400">
                Ratio entre abonos históricos y total liquidado en cancha.
              </CardContent>
            </Card>
          </div>

          {/* Full Player Balances Ledger Table */}
          <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-400" /> Cartera de Jugadores & Saldos Individuales
                </span>
                <span className="text-xs font-normal text-zinc-400 font-mono">
                  {overview.playerBalances.length} jugadores auditados
                </span>
              </CardTitle>
              <CardDescription className="text-xs">
                Resumen consolidado de solvencia de toda la nómina de Mizpa FC.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Total Abonos (+)</TableHead>
                    <TableHead className="text-right">Total Cuotas (-)</TableHead>
                    <TableHead className="text-right">Saldo Neto</TableHead>
                    <TableHead className="text-center">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overview.playerBalances.map((pb) => {
                    const playerObj = players.find((p) => p.id === pb.playerId);
                    const isPbSolvent = pb.status === 'SOLVENT';
                    return (
                      <TableRow key={pb.playerId}>
                        <TableCell className="text-xs text-zinc-100 font-medium">
                          {playerObj?.fullName || pb.playerId}
                          {playerObj?.documentId && (
                            <span className="text-[10px] text-zinc-400 block font-mono">
                              CC: {playerObj.documentId}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isPbSolvent ? 'success' : 'destructive'}
                            className="text-[10px] font-semibold px-2 py-0.5"
                          >
                            {isPbSolvent ? 'AL DÍA' : 'DEUDA'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-emerald-400 text-xs">
                          ${pb.totalCredits.toLocaleString('es-CO')}
                        </TableCell>
                        <TableCell className="text-right font-mono text-zinc-300 text-xs">
                          ${pb.totalDebits.toLocaleString('es-CO')}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-bold text-xs ${
                            isPbSolvent ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          ${pb.balance.toLocaleString('es-CO')} COP
                        </TableCell>
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedPlayerId(pb.playerId);
                              handlePlayerChange(pb.playerId);
                              setActiveTab('players');
                            }}
                            className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium"
                          >
                            Ver extracto ➔
                          </button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Global Fullscreen Receipt Modal Viewer */}
      {previewModalUrl && (
        <div
          onClick={() => setPreviewModalUrl(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative"
          >
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-emerald-400" /> Comprobante de Transferencia
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-zinc-950 flex items-center justify-center max-h-[70vh] overflow-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewModalUrl}
                alt="Comprobante bancario"
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
            <div className="p-3 border-t border-zinc-800 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewModalUrl(null)}
                className="text-xs"
              >
                Cerrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
