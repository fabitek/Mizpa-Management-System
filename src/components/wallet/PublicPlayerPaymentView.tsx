'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import { ReceiptUploader } from './ReceiptUploader.tsx';
import { recordPlayerCreditAction, getPlayerStatementAction } from '../../app/actions/finance-actions.ts';
import type { Player, ReceiptOcrResult } from '../../core/domain/types.ts';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Search,
  Copy,
  Check,
  User,
  DollarSign,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Building,
  QrCode,
  RefreshCw,
  X,
} from 'lucide-react';

interface PublicPlayerPaymentViewProps {
  players: Player[];
  defaultPlayerId?: string;
}

const CLUB_PAYMENT_CHANNELS = [
  {
    id: 'nequi',
    name: 'Nequi',
    number: '312 357 8415',
    rawNumber: '3123578415',
    owner: 'Cesar Tellez',
    badge: '🟣 Nequi',
    color: 'border-fuchsia-500/40 bg-fuchsia-950/20 text-fuchsia-300',
  },
  {
    id: 'daviplata',
    name: 'Daviplata',
    number: '312 357 8415',
    rawNumber: '3123578415',
    owner: 'Cesar Tellez',
    badge: '🔴 Daviplata',
    color: 'border-red-500/40 bg-red-950/20 text-red-300',
  },
  {
    id: 'breb_qr',
    name: 'Llave Bre-B / QR',
    number: '@3123578415',
    rawNumber: '@3123578415',
    owner: 'Cesar Tellez (Bre-B / QR)',
    badge: '⚡ Llave @ Bre-B / QR',
    color: 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300',
    isQr: true,
  },
];

export function PublicPlayerPaymentView({
  players,
  defaultPlayerId = '',
}: PublicPlayerPaymentViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(
    players.find((p) => p.id === defaultPlayerId) || null
  );

  const [amount, setAmount] = useState<number>(20000);
  const [note, setNote] = useState<string>('Abono cuota fútbol');
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [ocrData, setOcrData] = useState<ReceiptOcrResult | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState<boolean>(false);
  const [updatedBalance, setUpdatedBalance] = useState<number | null>(null);

  // Filter players by name, alias, email or document
  const filteredPlayers = searchQuery.trim()
    ? players.filter((p) => {
        const query = searchQuery.toLowerCase();
        return (
          p.fullName.toLowerCase().includes(query) ||
          (p.alias && p.alias.toLowerCase().includes(query)) ||
          (p.documentId && p.documentId.toLowerCase().includes(query)) ||
          (p.email && p.email.toLowerCase().includes(query))
        );
      })
    : [];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleReceiptLoaded = (data: {
    receiptUrl: string;
    ocrResult?: ReceiptOcrResult;
    suggestedAmount?: number;
    suggestedNote?: string;
  }) => {
    setReceiptUrl(data.receiptUrl);
    if (data.ocrResult) {
      setOcrData(data.ocrResult);
    }
    if (data.suggestedAmount && data.suggestedAmount > 0) {
      setAmount(data.suggestedAmount);
    }
    if (data.suggestedNote) {
      setNote(data.suggestedNote);
    }
  };

  const handleSubmitPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayer) {
      setFeedback({ success: false, message: 'Por favor selecciona tu nombre de jugador.' });
      return;
    }
    if (amount <= 0) {
      setFeedback({ success: false, message: 'El monto a abonar debe ser mayor a cero.' });
      return;
    }

    startTransition(async () => {
      try {
        const res = await recordPlayerCreditAction(
          selectedPlayer.id,
          amount,
          note.trim() || 'Abono por transferencia',
          receiptUrl || undefined
        );

        if (res.success && res.data) {
          setFeedback(res);
          setPaymentSuccess(true);
          setUpdatedBalance((res.data as any).newBalance);
        } else {
          setFeedback(res);
        }
      } catch (err) {
        setFeedback({ success: false, message: 'Error de conexión al procesar el pago.' });
      }
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full text-emerald-400 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" /> Portal de Autogestión de Pagos
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Abonar a mi Cuenta de Jugador ⚽
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Transfiere tu cuota de partido o saldo anticipado y adjunta tu comprobante aquí para registrar tu abono automáticamente.
        </p>
      </div>

      {/* SUCCESS CONFIRMATION SCREEN */}
      {paymentSuccess ? (
        <div className="bg-gradient-to-b from-emerald-950/90 to-zinc-900 border border-emerald-500/50 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400/40 rounded-full flex items-center justify-center mx-auto text-3xl shadow-inner">
            ✅
          </div>
          <div>
            <Badge variant="success" className="text-xs px-3 py-1 font-mono uppercase mb-2">
              Pago Acreditado
            </Badge>
            <h2 className="text-2xl font-bold text-white">¡Abono Registrado con Éxito!</h2>
            <p className="text-sm text-emerald-300 mt-1">
              Tu transferencia de <strong className="font-mono text-white">${amount.toLocaleString('es-CO')} COP</strong> ha sido procesada y registrada en tu cuenta.
            </p>
          </div>

          <div className="bg-zinc-950/70 border border-zinc-800 rounded-2xl p-4 text-left text-xs space-y-2.5 max-w-md mx-auto">
            <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Jugador:</span>
              <strong className="text-white text-sm font-semibold">{selectedPlayer?.fullName}</strong>
            </div>
            <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
              <span className="text-zinc-400">Monto Abonado:</span>
              <span className="text-emerald-400 font-mono font-bold text-sm">
                ${amount.toLocaleString('es-CO')} COP
              </span>
            </div>
            {updatedBalance !== null && (
              <div className="flex justify-between items-center text-zinc-300 border-b border-zinc-800 pb-2">
                <span className="text-zinc-400">Nuevo Saldo en Billetera:</span>
                <span className={`font-mono font-bold text-sm ${updatedBalance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ${updatedBalance.toLocaleString('es-CO')} COP
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-zinc-300 pt-1">
              <span className="text-zinc-400">Detalle / Referencia:</span>
              <span className="text-zinc-200">{note}</span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={() => {
                setPaymentSuccess(false);
                setReceiptUrl('');
                setOcrData(null);
              }}
              variant="outline"
              className="border-zinc-700 text-zinc-300 hover:text-white rounded-xl text-xs py-2.5"
            >
              Registrar otro comprobante
            </Button>
            <a
              href="/"
              className="inline-flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-lg transition-all"
            >
              Ir al Inicio / Convocatorias ⚽
            </a>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* STEP 1: SELECT PLAYER */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-400" />
                1. ¿A nombre de quién es el abono?
              </label>
              {selectedPlayer && (
                <button
                  type="button"
                  onClick={() => setSelectedPlayer(null)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 underline"
                >
                  Cambiar jugador
                </button>
              )}
            </div>

            {selectedPlayer ? (
              <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                    ⚽
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedPlayer.fullName}</h3>
                    <p className="text-xs text-zinc-400">
                      {selectedPlayer.documentId ? `CC: ${selectedPlayer.documentId}` : ''}{' '}
                      {selectedPlayer.phone ? `• Tel: ${selectedPlayer.phone}` : ''}
                    </p>
                  </div>
                </div>
                <Badge variant="success" className="text-[10px]">
                  Seleccionado ✓
                </Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Escribe tu nombre, cédula o alias..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                {searchQuery.trim() && (
                  <div className="max-h-48 overflow-y-auto border border-zinc-800 rounded-xl divide-y divide-zinc-800/60 bg-zinc-950">
                    {filteredPlayers.length > 0 ? (
                      filteredPlayers.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedPlayer(p);
                            setSearchQuery('');
                          }}
                          className="w-full text-left p-2.5 hover:bg-zinc-800/70 transition-all flex items-center justify-between"
                        >
                          <div>
                            <span className="text-sm font-medium text-zinc-100">{p.fullName}</span>
                            <span className="text-xs text-zinc-400 block">
                              {p.documentId ? `CC: ${p.documentId}` : ''} {p.alias ? `(${p.alias})` : ''}
                            </span>
                          </div>
                          <span className="text-xs text-emerald-400 font-medium">Seleccionar →</span>
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-center text-xs text-zinc-500">
                        No se encontró ningún jugador con ese criterio.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: BANK COORDINATES WITH 1-CLICK COPY */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                2. Cuentas Oficiales para Transferir
              </label>
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 font-semibold bg-cyan-950/60 hover:bg-cyan-900/60 px-2.5 py-1 rounded-lg border border-cyan-500/40 transition-all"
              >
                <QrCode className="w-3.5 h-3.5" /> Ver Código QR 📷
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CLUB_PAYMENT_CHANNELS.map((ch) => {
                const isCopied = copiedId === ch.id;
                return (
                  <div
                    key={ch.id}
                    onClick={() => handleCopy(ch.rawNumber, ch.id)}
                    className={`border rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${ch.color}`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold">{ch.badge}</span>
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 opacity-60" />
                      )}
                    </div>
                    <div className="font-mono font-bold text-sm text-white tracking-wider">
                      {ch.number}
                    </div>
                    <span className="text-[10px] text-zinc-400 mt-1 truncate block">
                      {isCopied ? '¡Copiado al portapapeles!' : ch.owner}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* QR Code Modal */}
          {showQrModal && (
            <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-zinc-900 border border-cyan-500/40 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-full bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest block">
                    ⚡ Bre-B • Nequi
                  </span>
                  <h3 className="text-lg font-black text-white">Cesar Tellez</h3>
                  <p className="text-xs font-mono text-zinc-300">Llave: <strong className="text-cyan-400">@3123578415</strong></p>
                </div>

                <div className="bg-white p-3 rounded-2xl inline-block shadow-inner mx-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/images/qr-payment.jpg"
                    alt="Código QR Bre-B Nequi Cesar Tellez @3123578415"
                    className="w-56 h-auto rounded-xl object-contain mx-auto"
                  />
                </div>

                <div className="pt-1 flex justify-center gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      handleCopy('@3123578415', 'modal_llave');
                    }}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2 px-4 rounded-xl gap-1.5 shadow"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copiar Llave @3123578415
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowQrModal(false)}
                    variant="outline"
                    className="border-zinc-700 text-zinc-300 hover:text-white text-xs py-2 px-4 rounded-xl"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: RECEIPT UPLOADER WITH OCR */}
          <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-400" />
              3. Adjuntar Comprobante de Transferencia
            </label>

            <ReceiptUploader
              onReceiptLoaded={handleReceiptLoaded}
              currentReceiptUrl={receiptUrl}
              onClearReceipt={() => {
                setReceiptUrl('');
                setOcrData(null);
              }}
            />
          </div>

          {/* STEP 4: AMOUNT & NOTE CONFIRMATION */}
          <form onSubmit={handleSubmitPayment} className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              4. Confirmar Monto y Detalle del Abono
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Monto a Transferir ($ COP):</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-400 font-bold">$</span>
                  <input
                    type="number"
                    required
                    min={1000}
                    step={1000}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-zinc-100 focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-400 block mb-1">Concepto / Nota:</label>
                <input
                  type="text"
                  placeholder="Ej: Abono partido viernes o cuota mensual"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {feedback && !paymentSuccess && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                  feedback.success
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/60 border-red-500/40 text-red-200'
                }`}
              >
                {feedback.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isPending || !selectedPlayer}
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all gap-2"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Procesando comprobante...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Registrar Abono de ${amount.toLocaleString('es-CO')} COP ⚽
                </>
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
