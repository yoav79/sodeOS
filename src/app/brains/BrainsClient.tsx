'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BrainItem {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  role: string;
  activeNodesCount: number;
  updatedAt: string;
}

interface BrainsClientProps {
  user: {
    name: string;
    email: string;
  };
  brains: BrainItem[];
}

export default function BrainsClient({ user, brains }: BrainsClientProps) {
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);

  const [localBrains, setLocalBrains] = useState<BrainItem[]>(brains);
  const [brainToDelete, setBrainToDelete] = useState<BrainItem | null>(null);
  const [confirmName, setConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const closeDeleteModal = () => {
    setBrainToDelete(null);
    setConfirmName('');
    setDeleteError(null);
    setDeleting(false);
  };

  const handleDeleteConfirm = async () => {
    if (!brainToDelete || confirmName !== brainToDelete.name) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/brains/${brainToDelete.id}`, {
        method: 'DELETE',
      });

      if (res.status === 401) {
        router.push('/login');
        router.refresh();
        return;
      }

      if (res.status === 403) {
        setDeleteError('No tienes permisos para eliminar este cerebro.');
        setDeleting(false);
        return;
      }

      if (res.status === 404) {
        setLocalBrains((prev) => prev.filter((b) => b.id !== brainToDelete.id));
        closeDeleteModal();
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error || 'Ocurrió un error inesperado al eliminar el cerebro.');
        setDeleting(false);
        return;
      }

      setLocalBrains((prev) => prev.filter((b) => b.id !== brainToDelete.id));
      closeDeleteModal();
    } catch (err) {
      console.error('Error al eliminar cerebro:', err);
      setDeleteError('Ocurrió un error de red al intentar eliminar el cerebro.');
      setDeleting(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (res.ok) {
        router.push('/login');
        router.refresh();
      }
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    } finally {
      setLogoutLoading(false);
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return 'Privado';
      case 'invited_only':
        return 'Solo invitados';
      case 'company':
        return 'Empresa';
      default:
        return visibility;
    }
  };

  const getVisibilityClass = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'invited_only':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'company':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'Owner';
      case 'editor':
        return 'Editor';
      case 'reader':
        return 'Reader';
      default:
        return role;
    }
  };

  const getRoleClass = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'editor':
        return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'reader':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0">
        <div className="flex flex-col">
          {/* Header Brand */}
          <div className="p-6 border-b border-slate-200 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-md">Cerebro</span>
              <span className="text-xs text-slate-400 block font-semibold -mt-1 uppercase tracking-wider">Empresarial</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <span className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Navegación
            </span>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors text-left"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Dashboard
            </button>

            <button
              onClick={() => router.push('/brains')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm transition-colors text-left"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Cerebros
            </button>


          </nav>
        </div>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50">
          <Link
            href="/profile"
            className="flex items-center gap-3 px-1.5 py-1 rounded-xl hover:bg-slate-100 transition-colors group cursor-pointer"
            title="Ver perfil"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 group-hover:border-blue-300 group-hover:bg-blue-200/50 transition-colors">
              {user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden flex-1">
              <span className="font-semibold text-sm text-slate-800 block truncate group-hover:text-blue-700 transition-colors">{user.name}</span>
              <span className="text-[10px] text-slate-500 block truncate">{user.email}</span>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            disabled={logoutLoading}
            className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {logoutLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar sesión
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 mb-2">
          <button onClick={() => router.push('/dashboard')} className="hover:text-blue-600 transition-colors">
            Dashboard
          </button>
          <span>/</span>
          <span className="text-slate-600">Cerebros</span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mis Cerebros Autorizados</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Visualiza y gestiona los espacios de conocimiento a los que tienes acceso.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/brains/new')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Cerebro
            </button>
          </div>
        </div>

        {localBrains.length === 0 ? (
          /* Empty State */
          <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100/50 text-center flex flex-col items-center gap-4">
            <div className="p-4 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800">Aún no tienes cerebros</h2>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Organiza el conocimiento de tu empresa creando tu primer cerebro.
            </p>
            <button
              onClick={() => router.push('/brains/new')}
              className="mt-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/10 transition-colors flex items-center gap-2"
            >
              Crear mi primer Cerebro
            </button>
          </div>
        ) : (
          /* Grid of Brain Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {localBrains.map((brain) => (
              <div
                key={brain.id}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Badges row */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getVisibilityClass(brain.visibility)}`}>
                        {getVisibilityLabel(brain.visibility)}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getRoleClass(brain.role)}`}>
                        {getRoleLabel(brain.role)}
                      </span>
                    </div>
                    {brain.role === 'owner' && (
                      <button
                        onClick={() => setBrainToDelete(brain)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Eliminar cerebro"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* Brain Name & Description */}
                  <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2 truncate" title={brain.name}>
                    {brain.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mb-6">
                    {brain.description || 'Sin descripción asignada para este cerebro.'}
                  </p>
                </div>

                {/* Footer Metadata & CTA */}
                <div className="border-t border-slate-100 pt-4 mt-auto">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {brain.activeNodesCount} {brain.activeNodesCount === 1 ? 'nodo' : 'nodos'}
                    </span>
                    <span>Act. {formatDate(brain.updatedAt)}</span>
                  </div>

                  <button
                    onClick={() => router.push(`/brains/${brain.id}`)}
                    className="w-full py-2 bg-slate-50 hover:bg-blue-600 hover:text-white border border-slate-200 hover:border-blue-600 text-slate-700 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1"
                  >
                    <span>Abrir</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de confirmación de eliminación */}
      {brainToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="p-6 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-50 text-red-600 rounded-xl border border-red-100">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Eliminar Cerebro</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Esta acción es permanente e irreversible</p>
                </div>
              </div>
              <button
                onClick={closeDeleteModal}
                disabled={deleting}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                title="Cerrar modal"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Estás a punto de eliminar el cerebro <strong className="text-slate-900">{brainToDelete.name}</strong>.
              </p>
              
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Se eliminará permanentemente:</h4>
                <ul className="text-[11px] text-amber-700 space-y-1 list-disc pl-4 font-medium">
                  <li>Todos los documentos y nodos del árbol</li>
                  <li>Todas las versiones históricas de los documentos</li>
                  <li>Todas las plantillas asociadas (páginas y estructuras)</li>
                  <li>Todos los accesos de miembros de este cerebro</li>
                  <li>Todas las etiquetas asociadas</li>
                </ul>
              </div>

              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
                  ⚠️ {deleteError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Escribe el nombre del cerebro para confirmar:
                </label>
                <input
                  type="text"
                  placeholder={brainToDelete.name}
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  disabled={deleting}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 disabled:opacity-50 transition-all font-medium"
                />
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="px-4 py-2 border border-slate-200 text-slate-600 font-semibold rounded-xl text-xs bg-white hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting || confirmName !== brainToDelete.name}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-red-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {deleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Eliminando...
                  </>
                ) : (
                  'Eliminar permanentemente'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
