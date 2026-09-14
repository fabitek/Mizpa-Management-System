'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table.tsx';
import { ReceiptUploader } from './ReceiptUploader.tsx';
import {
  recordOperatingExpenseAction,
  deleteOperatingExpenseAction,
} from '../../app/actions/finance-actions.ts';
import type { ExpenseCategory, OperatingExpense, Player } from '../../core/domain/types.ts';
import type { OperatingExpensesSummary } from '../../core/use-cases/GetAllOperatingExpenses.ts';
import {
  ShoppingBag,
  PlusCircle,
  Trash2,
  Receipt,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  DollarSign,
  TrendingDown,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';

interface OperatingExpensesCardProps {
  initialSummary: OperatingExpensesSummary;
  players: Player[];
  totalCreditsCollected: number;
}

const CATEGORY_META: Record<ExpenseCategory, { label: string; icon: string; color: string; bg: string }> = {
  BALLS_EQUIPMENT: { label: 'Balones y Equipamiento', icon: '⚽', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-500/30' },
  BIBS_VESTS: { label: 'Petos y Chalecos', icon: '🎽', color: 'text-orange-400', bg: 'bg-orange-950/40 border-orange-500/30' },
  HYDRATION: { label: 'Hidratación y Bebidas', icon: '💧', color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-500/30' },
  REFEREE_STAFF: { label: 'Arbitraje y Planillero', icon: '👨‍⚖️', color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-500/30' },
  FIRST_AID: { label: 'Botiquín y Primeros Auxilios', icon: '🩹', color: 'text-red-400', bg: 'bg-red-950/40 border-red-500/30' },
  AWARDS_CAPTAIN: { label: 'Cinta Capitán / Premiación', icon: '🎖️', color: 'text-yellow-400', bg: 'bg-yellow-950/40 border-yellow-500/30' },
  FIELD_MAINTENANCE: { label: 'Mantenimiento y Logística', icon: '🏟️', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-500/30' },
  OTHER: { label: 'Otros Gastos Varios', icon: '📦', color: 'text-zinc-400', bg: 'bg-zinc-800 border-zinc-700' },
};

export function OperatingExpensesCard({
  initialSummary,
  players,
  totalCreditsCollected,
}: OperatingExpensesCardProps) {
  const [expenses, setExpenses] = useState<OperatingExpense[]>(initialSummary.expenses);
  const [totalExpensesAmount, setTotalExpensesAmount] = useState<number>(initialSummary.totalAmount);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<ExpenseCategory, number>>(
    initialSummary.categoryBreakdown
  );

  // Form State
  const [category, setCategory] = useState<ExpenseCategory>('BALLS_EQUIPMENT');
  const [description, setDescription] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [recordedByPlayerId, setRecordedByPlayerId] = useState<string>(players[0]?.id || '');

  // Filter State
  const [selectedFilterCategory, setSelectedFilterCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const netPettyCash = totalCreditsCollected - totalExpensesAmount;

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setFeedback({ success: false, message: 'Por favor ingresa un monto válido mayor a cero.' });
      return;
    }
    if (!description.trim()) {
      setFeedback({ success: false, message: 'Por favor ingresa el concepto o detalle del gasto.' });
      return;
    }

    startTransition(async () => {
      const res = await recordOperatingExpenseAction({
        category,
        description: description.trim(),
        amount: amountNum,
        expenseDate,
        receiptUrl: receiptUrl.trim() || undefined,
        recordedByPlayerId: recordedByPlayerId || undefined,
      });

      setFeedback(res);

      if (res.success && res.data) {
        const newExp = res.data as any;
        setExpenses((prev) => [newExp, ...prev]);
        setTotalExpensesAmount((prev) => prev + amountNum);
        setCategoryBreakdown((prev) => ({
          ...prev,
          [category]: (prev[category] || 0) + amountNum,
        }));

        // Reset form
        setDescription('');
        setAmount('');
        setReceiptUrl('');
      }
    });
  };

  const handleDeleteExpense = (id: string, expAmount: number, expCat: ExpenseCategory) => {
    if (!confirm('¿Estás seguro de eliminar este registro de gasto operativo?')) return;

    startTransition(async () => {
      const res = await deleteOperatingExpenseAction(id);
      setFeedback(res);
      if (res.success) {
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        setTotalExpensesAmount((prev) => Math.max(0, prev - expAmount));
        setCategoryBreakdown((prev) => ({
          ...prev,
          [expCat]: Math.max(0, (prev[expCat] || 0) - expAmount),
        }));
      }
    });
  };

  const filteredExpenses = expenses.filter((e) => {
    const matchesCategory = selectedFilterCategory === 'ALL' || e.category === selectedFilterCategory;
    const matchesSearch =
      !searchTerm.trim() ||
      e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      CATEGORY_META[e.category]?.label.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Metrics Cards: Petty Cash & Operational Outflow */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-800 bg-zinc-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Saldo Disponible en Caja Menor
            </CardDescription>
            <CardTitle
              className={`text-2xl font-mono ${
                netPettyCash >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              ${netPettyCash.toLocaleString('es-CO')} COP
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            Total abonos recaudados menos gastos operativos ejecutados.
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <TrendingDown className="w-4 h-4 text-amber-400" /> Total Gastos Operativos
            </CardDescription>
            <CardTitle className="text-2xl font-mono text-amber-400">
              ${totalExpensesAmount.toLocaleString('es-CO')} COP
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            {expenses.length} egresos registrados (balones, petos, hidratación, arbitraje).
          </CardContent>
        </Card>

        <Card className="border-zinc-800 bg-zinc-900/70 shadow-lg">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs flex items-center gap-1.5 text-zinc-400">
              <ShoppingBag className="w-4 h-4 text-cyan-400" /> Categoría con Mayor Gasto
            </CardDescription>
            <CardTitle className="text-base font-bold text-zinc-100 flex items-center gap-2">
              {(() => {
                const entries = Object.entries(categoryBreakdown) as [ExpenseCategory, number][];
                const top = entries.sort((a, b) => b[1] - a[1])[0];
                if (!top || top[1] === 0) return <span className="text-zinc-500 text-sm">Sin egresos aún</span>;
                const meta = CATEGORY_META[top[0]];
                return (
                  <span>
                    {meta.icon} {meta.label} (${top[1].toLocaleString('es-CO')})
                  </span>
                );
              })()}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-zinc-400">
            Distribución controlada de egresos del equipo.
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

      {/* Main Grid: Form to Log Expense & Ledger Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form */}
        <div className="space-y-6">
          <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" /> Registrar Egreso / Gasto
              </CardTitle>
              <CardDescription className="text-xs">
                Registra compras de materiales, arbitraje o logística con comprobante.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateExpense} className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-medium">Categoría del Gasto:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {Object.entries(CATEGORY_META).map(([key, meta]) => (
                      <option key={key} value={key}>
                        {meta.icon} {meta.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-medium">Concepto / Detalle:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Compra de 2 Balones Golty Sintética #5"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1 font-medium">Monto ($ COP):</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      step="500"
                      placeholder="Ej: 80000"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 font-mono placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 block mb-1 font-medium">Fecha:</label>
                    <input
                      type="date"
                      value={expenseDate}
                      onChange={(e) => setExpenseDate(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1 font-medium">Responsable / Pagado por:</label>
                  <select
                    value={recordedByPlayerId}
                    onChange={(e) => setRecordedByPlayerId(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    {players.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.role || 'Jugador'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Receipt Uploader for Expenses */}
                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-medium">
                    Foto de Factura / Comprobante (Opcional):
                  </label>
                  <ReceiptUploader
                    currentReceiptUrl={receiptUrl}
                    onReceiptLoaded={({ receiptUrl: url, suggestedAmount, suggestedNote }) => {
                      setReceiptUrl(url);
                      if (suggestedAmount && !amount) setAmount(suggestedAmount.toString());
                      if (suggestedNote && !description) setDescription(suggestedNote);
                    }}
                    onClearReceipt={() => setReceiptUrl('')}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isPending || !amount || !description}
                  className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all"
                >
                  {isPending ? 'Guardando...' : 'Registrar Egreso en Caja Menor'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Ledger Table & Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Badges Summary Bar */}
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4 shadow-lg space-y-3">
            <span className="text-xs font-semibold text-zinc-300 block">
              Distribución por Categoría de Gastos:
            </span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(CATEGORY_META).map(([catKey, meta]) => {
                const catSpent = categoryBreakdown[catKey as ExpenseCategory] || 0;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() =>
                      setSelectedFilterCategory((prev) => (prev === catKey ? 'ALL' : catKey))
                    }
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1.5 transition-all ${
                      selectedFilterCategory === catKey
                        ? 'bg-amber-950/80 border-amber-500 text-amber-200'
                        : meta.bg + ' ' + meta.color + ' hover:border-zinc-600'
                    }`}
                  >
                    <span>{meta.icon}</span>
                    <span>{meta.label}:</span>
                    <strong className="font-mono">${catSpent.toLocaleString('es-CO')}</strong>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ledger Table */}
          <Card className="border-zinc-800 bg-zinc-900/60 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-amber-400" /> Libro de Egresos Operativos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Historial de gastos ejecutados para el funcionamiento del club.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Buscar gasto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {selectedFilterCategory !== 'ALL' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFilterCategory('ALL')}
                      className="h-8 px-2 text-xs text-zinc-400 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Quitar filtro
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredExpenses.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-sm">
                  No se encontraron egresos operativos registrados para este criterio.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Concepto / Detalle</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                      <TableHead className="text-center">Comprobante</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((exp) => {
                      const meta = CATEGORY_META[exp.category] || CATEGORY_META.OTHER;
                      return (
                        <TableRow key={exp.id}>
                          <TableCell className="text-xs text-zinc-400 whitespace-nowrap font-mono">
                            {new Date(exp.expenseDate).toLocaleDateString('es-CO', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${meta.bg} ${meta.color}`}
                            >
                              <span>{meta.icon}</span>
                              <span className="hidden sm:inline">{meta.label}</span>
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-zinc-200">
                            <div>{exp.description}</div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-amber-400 text-xs">
                            -${exp.amount.toLocaleString('es-CO')}
                          </TableCell>
                          <TableCell className="text-center">
                            {exp.receiptUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewModalUrl(exp.receiptUrl!)}
                                className="text-xs text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-1"
                              >
                                <Receipt className="w-3.5 h-3.5" /> Ver
                              </button>
                            ) : (
                              <span className="text-[10px] text-zinc-600">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isPending}
                              onClick={() => handleDeleteExpense(exp.id, exp.amount, exp.category)}
                              className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
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

      {/* Fullscreen Receipt Modal Viewer */}
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
                <Receipt className="w-4 h-4 text-emerald-400" /> Comprobante de Gasto Operativo
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
                alt="Comprobante de gasto"
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
