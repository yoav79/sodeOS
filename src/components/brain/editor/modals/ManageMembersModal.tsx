'use client';

import React from 'react';

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
  members: MemberWithUser[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  isOwner: boolean;
}

export default function ManageMembersModal({
  isOpen,
  onClose,
  members,
  isLoading,
  error,
  onRefresh,
  isOwner,
}: ManageMembersModalProps) {
  if (!isOpen) return null;

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
              <span>Posees privilegios de Propietario. Puedes visualizar la configuración de membresías.</span>
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

                  {/* Role Badge */}
                  <div className="shrink-0 flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${getRoleBadgeClass(member.role)}`}>
                      {getRoleLabel(member.role)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
