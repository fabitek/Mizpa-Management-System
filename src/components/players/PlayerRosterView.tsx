'use client';

import * as React from 'react';
import { useState, useTransition } from 'react';
import {
  Users,
  UserPlus,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Phone,
  Mail,
  Shield,
  Crown,
  User,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.tsx';
import { Badge } from '../ui/badge.tsx';
import { Button } from '../ui/button.tsx';
import type { Player, UserRole } from '../../core/domain/types.ts';
import {
  createPlayerAction,
  updatePlayerAction,
  togglePlayerStatusAction,
  bulkImportPlayersAction,
} from '../../app/actions/player-actions.ts';

interface PlayerRosterViewProps {
  initialPlayers: Player[];
  currentUserRole?: UserRole;
}

export function PlayerRosterView({ initialPlayers, currentUserRole = 'ADMIN' }: PlayerRosterViewProps) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Form states
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState<{
    fullName: string;
    phone: string;
    email: string;
    alias: string;
    documentId: string;
    role: UserRole;
    isActive: boolean;
  }>({
    fullName: '',
    phone: '',
    email: '',
    alias: '',
    documentId: '',
    role: 'PLAYER',
    isActive: true,
  });

  const [bulkInput, setBulkInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const isAdmin = currentUserRole === 'ADMIN';

  // Sync state if initialPlayers update
  React.useEffect(() => {
    setPlayers(initialPlayers);
  }, [initialPlayers]);

  // Filtering
  const filteredPlayers = players.filter((p) => {
    const matchesSearch =
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.alias && p.alias.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.phone && p.phone.includes(searchTerm));

    const matchesRole = roleFilter === 'ALL' || p.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && p.isActive) ||
      (statusFilter === 'INACTIVE' && !p.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  // KPI calculations
  const totalPlayers = players.length;
  const activePlayers = players.filter((p) => p.isActive).length;
  const captainPlayers = players.filter((p) => p.role === 'CAPTAIN').length;
  const adminPlayers = players.filter((p) => p.role === 'ADMIN').length;

  const handleOpenCreate = () => {
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      alias: '',
      documentId: '',
      role: 'PLAYER',
      isActive: true,
    });
    setFeedback(null);
    setShowCreateModal(true);
  };

  const handleOpenEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      fullName: player.fullName,
      phone: player.phone || '',
      email: player.email || '',
      alias: player.alias || '',
      documentId: player.documentId || '',
      role: player.role || 'PLAYER',
      isActive: player.isActive,
    });
    setFeedback(null);
    setShowEditModal(true);
  };

  const handleSavePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!formData.fullName.trim()) {
      setFeedback({ type: 'error', message: 'El nombre completo es requerido.' });
      return;
    }

    startTransition(async () => {
      if (editingPlayer) {
        const res = await updatePlayerAction(editingPlayer.id, {
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          alias: formData.alias,
          documentId: formData.documentId,
          role: formData.role,
          isActive: formData.isActive,
        });

        if (res.success && res.data) {
          setPlayers((prev) => prev.map((p) => (p.id === editingPlayer.id ? res.data! : p)));
          setShowEditModal(false);
          setFeedback({ type: 'success', message: res.message });
        } else {
          setFeedback({ type: 'error', message: res.message });
        }
      } else {
        const res = await createPlayerAction({
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          alias: formData.alias,
          documentId: formData.documentId,
          role: formData.role,
          isActive: formData.isActive,
        });

        if (res.success && res.data) {
          setPlayers((prev) => [res.data!, ...prev.filter((p) => p.id !== res.data!.id)]);
          setShowCreateModal(false);
          setFeedback({ type: 'success', message: res.message });
        } else {
          setFeedback({ type: 'error', message: res.message });
        }
      }
    });
  };

  const handleToggleStatus = (player: Player) => {
    startTransition(async () => {
      const res = await togglePlayerStatusAction(player.id);
      if (res.success && res.data) {
        setPlayers((prev) => prev.map((p) => (p.id === player.id ? res.data! : p)));
      }
    });
  };

  const handleBulkImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim()) {
      setFeedback({ type: 'error', message: 'Pega los datos de la nómina antes de procesar.' });
      return;
    }

    startTransition(async () => {
      const res = await bulkImportPlayersAction(bulkInput);
      if (res.success) {
        setShowBulkModal(false);
        setBulkInput('');
        setFeedback({ type: 'success', message: res.message });
        // Trigger soft refresh
        window.location.reload();
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    });
  };

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="w-3.5 h-3.5 text-amber-400" />;
      case 'CAPTAIN':
        return <Shield className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <User className="w-3.5 h-3.5 text-zinc-400" />;
    }
  };

  const getRoleBadgeVariant = (role?: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return 'warning';
      case 'CAPTAIN':
        return 'default';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 p-6 rounded-2xl border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Nómina de Jugadores
            </h1>
          </div>
          <p className="text-zinc-400 text-sm">
            Control de plantilla real, roles de capitán/admin y registro masivo para convocatorias.
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => setShowBulkModal(true)}
              variant="outline"
              className="bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border-zinc-700 gap-2 text-xs sm:text-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Carga Masiva</span>
            </Button>

            <Button
              onClick={handleOpenCreate}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2 text-xs sm:text-sm shadow-lg shadow-emerald-950/50"
            >
              <UserPlus className="w-4 h-4" />
              <span>Nuevo Jugador</span>
            </Button>
          </div>
        )}
      </div>

      {/* Global Feedback Alert */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl text-sm font-medium border animate-in fade-in duration-200 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-zinc-400 hover:text-zinc-200 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-zinc-900/60 border-zinc-800/80">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Plantilla</p>
              <p className="text-2xl font-black text-white mt-1">{totalPlayers}</p>
            </div>
            <div className="p-3 bg-zinc-800 rounded-xl text-zinc-300">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/80">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Activos / Habilitados</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">{activePlayers}</p>
            </div>
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/80">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-400 uppercase tracking-wider">Capitanes</p>
              <p className="text-2xl font-black text-blue-400 mt-1">{captainPlayers}</p>
            </div>
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-zinc-900/60 border-zinc-800/80">
          <CardContent className="p-4 sm:p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">Admins</p>
              <p className="text-2xl font-black text-amber-400 mt-1">{adminPlayers}</p>
            </div>
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <Crown className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="bg-zinc-900/80 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, apodo, email o cel..."
                className="w-full bg-zinc-950 border border-zinc-700/80 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Role & Status Filter Selectors */}
            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setRoleFilter('ALL')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    roleFilter === 'ALL' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setRoleFilter('PLAYER')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    roleFilter === 'PLAYER' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Jugadores
                </button>
                <button
                  onClick={() => setRoleFilter('CAPTAIN')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    roleFilter === 'CAPTAIN' ? 'bg-blue-900/60 text-blue-300 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Capitanes
                </button>
                <button
                  onClick={() => setRoleFilter('ADMIN')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    roleFilter === 'ADMIN' ? 'bg-amber-900/60 text-amber-300 shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Admins
                </button>
              </div>

              <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === 'ALL' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Estado
                </button>
                <button
                  onClick={() => setStatusFilter('ACTIVE')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === 'ACTIVE' ? 'bg-emerald-950/80 text-emerald-300' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Activos
                </button>
                <button
                  onClick={() => setStatusFilter('INACTIVE')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    statusFilter === 'INACTIVE' ? 'bg-red-950/80 text-red-300' : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Inactivos
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players List Table */}
      <Card className="bg-zinc-900/80 border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <th className="py-3.5 px-4">Jugador</th>
                <th className="py-3.5 px-4 hidden sm:table-cell">Contacto</th>
                <th className="py-3.5 px-4">Rol</th>
                <th className="py-3.5 px-4 text-center">Estado</th>
                {isAdmin && <th className="py-3.5 px-4 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-zinc-600" />
                      <p className="text-base font-medium text-zinc-300">No se encontraron jugadores</p>
                      <p className="text-xs text-zinc-500">
                        {searchTerm ? 'Prueba con otro término de búsqueda.' : 'Carga la nómina o añade un nuevo jugador.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => {
                  const initials = player.fullName
                    .split(' ')
                    .filter(Boolean)
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr
                      key={player.id}
                      className="hover:bg-zinc-800/40 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-zinc-600/50 flex items-center justify-center text-xs font-bold text-emerald-400 flex-shrink-0 shadow-inner">
                            {initials || '⚽'}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{player.fullName}</span>
                              {player.alias && (
                                <span className="text-xs text-zinc-400 font-normal">
                                  "{player.alias}"
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-zinc-400 sm:hidden flex flex-col gap-0.5 mt-0.5">
                              {player.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-zinc-500" /> {player.phone}
                                </span>
                              )}
                              {player.email && !player.email.endsWith('@mizpafc.internal') && (
                                <span className="flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-zinc-500" /> {player.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact (Desktop) */}
                      <td className="py-3.5 px-4 hidden sm:table-cell">
                        <div className="space-y-1">
                          {player.phone ? (
                            <a
                              href={`https://wa.me/${player.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 text-xs text-zinc-300 hover:text-emerald-400 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5 text-emerald-500" />
                              <span>{player.phone}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-500 italic">Sin teléfono</span>
                          )}

                          {player.email && !player.email.endsWith('@mizpafc.internal') ? (
                            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                              <Mail className="w-3.5 h-3.5 text-zinc-500" />
                              <span className="truncate max-w-[180px]">{player.email}</span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-zinc-600 block">ID Interno Mizpa</span>
                          )}
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={getRoleBadgeVariant(player.role)}
                          className="flex items-center gap-1 w-fit text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5"
                        >
                          {getRoleIcon(player.role)}
                          <span>{player.role || 'PLAYER'}</span>
                        </Badge>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleToggleStatus(player)}
                          disabled={!isAdmin || isPending}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            player.isActive
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-900/60'
                              : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:bg-zinc-700'
                          } ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                          title={isAdmin ? 'Haz clic para cambiar estado' : undefined}
                        >
                          {player.isActive ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Inactivo</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td className="py-3.5 px-4 text-right">
                          <Button
                            onClick={() => handleOpenEdit(player)}
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1 text-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">Editar</span>
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Crear / Editar Jugador */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  {showEditModal ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </span>
                <h3 className="font-bold text-lg text-white">
                  {showEditModal ? 'Editar Jugador' : 'Nuevo Jugador'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                }}
                className="text-zinc-400 hover:text-zinc-200 p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePlayer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Apodo / Alias
                  </label>
                  <input
                    type="text"
                    value={formData.alias}
                    onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                    placeholder="Ej. El Capi, Pelusa..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Ej. 3123578415"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Cédula / Documento de Identidad
                  </label>
                  <input
                    type="text"
                    value={formData.documentId}
                    onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                    placeholder="Ej. CC 1020304050"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                    Correo Electrónico (Gmail)
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jugador@gmail.com"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Rol en el Sistema
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="PLAYER">Jugador</option>
                  <option value="CAPTAIN">Capitán</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              {showEditModal && (
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded border-zinc-700 bg-zinc-950 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span>Jugador Activo / Habilitado para convocatorias</span>
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  {isPending ? 'Guardando...' : showEditModal ? 'Guardar Cambios' : 'Crear Jugador'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Carga Masiva (Bulk Import) */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <FileSpreadsheet className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-lg text-white">Carga Masiva de Jugadores</h3>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-zinc-400 hover:text-zinc-200 p-1 text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleBulkImport} className="space-y-4">
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1">
                <p className="font-semibold text-zinc-200">Formato por línea (separado por comas o tabulaciones):</p>
                <p className="font-mono text-emerald-400">Nombre Completo, Teléfono, Correo/Gmail, Apodo, Rol</p>
                <p className="text-[11px] text-zinc-500">
                  Ejemplo:<br />
                  Carlos Pérez, 3001234567, carlos@gmail.com, Pelusa, CAPTAIN<br />
                  Andrés Gómez, 3109876543, andres@gmail.com, El Mago, PLAYER
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                  Pega aquí la lista de jugadores:
                </label>
                <textarea
                  rows={8}
                  required
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  placeholder="Carlos Pérez, 3001234567, carlos@gmail.com, Pelusa, CAPTAIN&#10;Mateo Suarez, 3204567890, mateo@gmail.com, Teo, PLAYER"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowBulkModal(false)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isPending ? 'Procesando nómina...' : 'Importar Nómina'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
