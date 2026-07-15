'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface MemberWithUser {
  id: string;
  brainId: string;
  userId: string;
  role: 'owner' | 'editor' | 'reader';
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  };
}

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  brainId: string;
  members: MemberWithUser[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  isOwner: boolean;
}

type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

interface InvitationItem {
  id: string;
  email: string;
  role: 'owner' | 'editor' | 'reader';
  status: InvitationStatus;
  expiresAt: string;
  invitedAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  invitedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  acceptedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export default function ManageMembersModal({
  isOpen,
  onClose,
  brainId,
  members,
  isLoading,
  error,
  onRefresh,
  isOwner,
}: ManageMembersModalProps) {
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);

  // Invitations States
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState(false);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  const [invitationsTrigger, setInvitationsTrigger] = useState(0);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'reader'>('reader');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);

  const [cancelingInvitationId, setCancelingInvitationId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !isOwner || !brainId) return;

    let active = true;
    const loadInvitations = async () => {
      try {
        setInvitationsLoading(true);
        setInvitationsError(null);
        const res = await fetch(`/api/brains/${brainId}/invitations`);
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Error al cargar invitaciones.');
        }
        if (active) {
          setInvitations(data.invitations || []);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Error al cargar las invitaciones.';
          setInvitationsError(msg);
        }
      } finally {
        if (active) {
          setInvitationsLoading(false);
        }
      }
    };

    loadInvitations();

    return () => {
      active = false;
    };
  }, [isOpen, isOwner, brainId, invitationsTrigger, router]);

  const fetchInvitations = () => {
    setInvitationsTrigger((prev) => prev + 1);
  };

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (invitationsLoading || cancelingInvitationId || isAdding) return;

    setInviteError(null);
    setInviteSuccess(null);

    const email = inviteEmail.trim().toLowerCase();
    if (!email) {
      setInviteError('El correo electrónico es requerido.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || !email.includes('@') || !email.includes('.')) {
      setInviteError('Por favor introduce un correo electrónico válido.');
      return;
    }

    try {
      setIsAdding(true);
      const res = await fetch(`/api/brains/${brainId}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role: inviteRole }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar la invitación.');
      }

      setInviteSuccess(`Invitación enviada exitosamente a ${email}.`);
      setInviteEmail('');
      setInviteRole('reader');
      fetchInvitations();
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar la invitación.';
      setInviteError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (invitationsLoading || cancelingInvitationId || isAdding) return;

    const confirmCancel = window.confirm(
      `¿Estás seguro de que deseas cancelar la invitación para ${email}?`
    );
    if (!confirmCancel) return;

    try {
      setCancelingInvitationId(invitationId);
      const res = await fetch(`/api/brains/${brainId}/invitations/${invitationId}`, {
        method: 'DELETE',
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al cancelar la invitación.');
      }

      fetchInvitations();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cancelar la invitación.';
      alert(msg);
    } finally {
      setCancelingInvitationId(null);
    }
  };

  const getInvitationStatusBadgeClass = (status: InvitationStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'accepted':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'expired':
        return 'bg-slate-100 text-slate-500 border border-slate-200';
      case 'revoked':
        return 'bg-red-50 text-red-700 border border-red-100';
      default:
        return 'bg-slate-50 text-slate-500 border border-slate-100';
    }
  };

  const getInvitationStatusLabel = (status: InvitationStatus) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'accepted':
        return 'Aceptada';
      case 'expired':
        return 'Expirada';
      case 'revoked':
        return 'Cancelada';
      default:
        return status;
    }
  };


  // Mutation States
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  if (!isOpen) return null;



  const handleChangeMemberRole = async (member: MemberWithUser, newRole: 'owner' | 'editor' | 'reader') => {
    if (newRole === member.role) return;
    if (updatingMemberId || removingMemberId || isAdding) return;

    setActionError(null);
    setActionSuccess(null);

    if (member.role === 'owner' && newRole !== 'owner') {
      const confirmDegrade = window.confirm(
        `Vas a degradar a un propietario (${member.user.name}). Si es el último propietario, el servidor bloqueará la acción. ¿Continuar?`
      );
      if (!confirmDegrade) return;
    }

    try {
      setUpdatingMemberId(member.id);
      const res = await fetch(`/api/brains/${brainId}/members/${member.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al cambiar de rol.');
      }

      setActionSuccess(`Rol de ${member.user.name} cambiado a ${getRoleLabel(newRole)}.`);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cambiar el rol.';
      setActionError(msg);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (member: MemberWithUser) => {
    if (updatingMemberId || removingMemberId || isAdding) return;

    setActionError(null);
    setActionSuccess(null);

    const confirmRemove = window.confirm(
      `Vas a quitar el acceso de ${member.user.name} (${member.user.email}) a este cerebro. Si es el último propietario, el servidor bloqueará la acción. ¿Continuar?`
    );
    if (!confirmRemove) return;

    try {
      setRemovingMemberId(member.id);
      const res = await fetch(`/api/brains/${brainId}/members/${member.id}`, {
        method: 'DELETE',
      });

      if (res.status === 401) {
        router.push('/login');
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar miembro.');
      }

      setActionSuccess(`Acceso revocado para ${member.user.name}.`);
      if (onRefresh) {
        onRefresh();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar miembro.';
      setActionError(msg);
    } finally {
      setRemovingMemberId(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleBadgeClass = (role: 'owner' | 'editor' | 'reader') => {
    switch (role) {
      case 'owner':
        return 'bg-purple-50 text-purple-700 border border-purple-100';
      case 'editor':
        return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'reader':
        return 'bg-slate-100 text-slate-700 border border-slate-200';
      default:
        return 'bg-slate-50 text-slate-500 border border-slate-100';
    }
  };

  const getRoleLabel = (role: 'owner' | 'editor' | 'reader') => {
    switch (role) {
      case 'owner':
        return 'Propietario';
      case 'editor':
        return 'Editor';
      case 'reader':
        return 'Lector';
      default:
        return role;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[80vh] text-slate-900">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>Miembros del Cerebro</span>
              <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Configuración
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Administra quién tiene acceso y qué permisos posee en este espacio de trabajo.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex flex-col gap-2">
              <span className="font-semibold flex items-center gap-1">⚠️ Error al cargar miembros:</span>
              <span>{error}</span>
            </div>
          )}

          {isOwner && !isLoading && !error && (
            <div className="text-[11px] text-blue-700 bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 font-medium flex items-center gap-1.5">
              <span>🛡️</span>
              <span>Posees privilegios de Propietario. Puedes visualizar y gestionar la configuración de membresías.</span>
            </div>
          )}

          {isOwner && (
            <form onSubmit={handleSendInvitation} className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Invitar por email
              </h4>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                      if (inviteError) setInviteError(null);
                      if (inviteSuccess) setInviteSuccess(null);
                    }}
                    disabled={isAdding}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 disabled:opacity-60 transition-colors placeholder-slate-400 font-medium"
                  />
                </div>
                <div className="shrink-0 flex gap-2">
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'editor' | 'reader')}
                    disabled={isAdding}
                    className="bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 disabled:opacity-60 transition-colors"
                  >
                    <option value="reader">Lector</option>
                    <option value="editor">Editor</option>
                  </select>
                  <button
                    type="submit"
                    disabled={isAdding}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-center gap-1 shrink-0 shadow-sm shadow-blue-500/10"
                  >
                    {isAdding ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>Enviar invitación</span>
                    )}
                  </button>
                </div>
              </div>

              {inviteError && (
                <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                  ⚠️ {inviteError}
                </p>
              )}
              {inviteSuccess && (
                <p className="text-[11px] text-green-600 font-semibold mt-1 flex items-center gap-1 animate-fade-in">
                  ✅ {inviteSuccess}
                </p>
              )}
            </form>
          )}

          {actionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <span>⚠️ {actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <span>✅ {actionSuccess}</span>
            </div>
          )}

          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-xs font-semibold text-slate-500">Cargando lista de miembros...</span>
            </div>
          )}

          {!isLoading && !error && members.length === 0 && (
            <div className="text-center py-12 text-slate-400 text-xs font-medium">
              No hay miembros registrados en este cerebro.
            </div>
          )}

          {!isLoading && !error && members.length > 0 && (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden bg-white">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Avatar */}
                    {member.user.avatarUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={member.user.avatarUrl}
                        alt={member.user.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-100"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-200 shadow-sm shadow-blue-500/5">
                        {getInitials(member.user.name)}
                      </div>
                    )}

                    {/* Member Details */}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">
                        {member.user.name}
                      </h4>
                      <p className="text-xs text-slate-500 truncate font-medium mt-0.5">
                        {member.user.email}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        Unido el {new Date(member.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Role and Actions */}
                  <div className="shrink-0 flex items-center gap-3">
                    {/* Loading indicators */}
                    {updatingMemberId === member.id && (
                      <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                    )}
                    {removingMemberId === member.id && (
                      <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin shrink-0"></div>
                    )}

                    {isOwner ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={member.role}
                          onChange={(e) => handleChangeMemberRole(member, e.target.value as 'owner' | 'editor' | 'reader')}
                          disabled={
                            updatingMemberId !== null ||
                            removingMemberId !== null ||
                            isAdding
                          }
                          className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 disabled:opacity-60 transition-colors"
                        >
                          <option value="reader">Lector</option>
                          <option value="editor">Editor</option>
                          <option value="owner">Propietario</option>
                        </select>

                        <button
                          onClick={() => handleRemoveMember(member)}
                          disabled={
                            updatingMemberId !== null ||
                            removingMemberId !== null ||
                            isAdding
                          }
                          title="Eliminar miembro"
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 transition-colors disabled:opacity-50 disabled:hover:bg-red-50 flex items-center justify-center shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${getRoleBadgeClass(member.role)}`}>
                        {getRoleLabel(member.role)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
           {/* Invitaciones Section (Solo Propietarios) */}
          {isOwner && (
            <div className="mt-4 flex flex-col gap-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Invitaciones enviadas
              </h4>

              {invitationsError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
                  ⚠️ Error al cargar invitaciones: {invitationsError}
                </div>
              )}

              {invitationsLoading && (
                <div className="flex items-center justify-center py-4 gap-2 text-slate-400">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs font-medium text-slate-500">Cargando invitaciones...</span>
                </div>
              )}

              {!invitationsLoading && !invitationsError && invitations.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/30">
                  No hay invitaciones enviadas.
                </div>
              )}

              {!invitationsLoading && !invitationsError && invitations.length > 0 && (
                <div className="divide-y divide-slate-100 border border-slate-150 rounded-xl overflow-hidden bg-white">
                  {invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 truncate">
                            {inv.email}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${getRoleBadgeClass(inv.role)}`}>
                            {getRoleLabel(inv.role)}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1 font-medium flex items-center gap-1.5">
                          <span>Invitado el {new Date(inv.invitedAt).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>Expira {new Date(inv.expiresAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {/* Status Badge */}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${getInvitationStatusBadgeClass(inv.status)}`}>
                          {getInvitationStatusLabel(inv.status)}
                        </span>

                        {/* Revoke Action */}
                        {inv.status === 'pending' && (
                          <button
                            onClick={() => handleCancelInvitation(inv.id, inv.email)}
                            disabled={cancelingInvitationId === inv.id}
                            title="Cancelar invitación"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                          >
                            {cancelingInvitationId === inv.id ? (
                              <div className="w-3 h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              if (onRefresh) onRefresh();
              if (isOwner) fetchInvitations();
            }}
            disabled={isLoading || invitationsLoading}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${isLoading || invitationsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m-3-3v12" />
            </svg>
            <span>Actualizar</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
