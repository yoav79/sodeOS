'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface BrainInfo {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  role: string;
}

interface DashboardClientProps {
  user: {
    name: string;
    email: string;
  };
  brains: BrainInfo[];
  metrics: {
    totalBrains: number;
    totalNodes: number;
    needsReviewNodes: number;
    totalVersions: number;
  };
  recentNodes: Array<{
    id: string;
    title: string;
    status: string;
    updatedAt: string;
    updaterName: string;
    brainName: string;
    brainId: string;
  }>;
  recentActivity: Array<{
    id: string;
    nodeId: string;
    nodeTitle: string;
    brainId: string;
    changeNote: string;
    createdAt: string;
    saverName: string;
  }>;
}

export default function DashboardClient({
  user,
  brains,
  metrics,
  recentNodes,
  recentActivity,
}: DashboardClientProps) {
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);

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

  const getVisibilityBadge = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return 'Privado';
      case 'company':
        return 'Corporativo';
      case 'invited_only':
        return 'Solo Invitados';
      default:
        return visibility;
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const todayStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

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
            <a
              href="#dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Dashboard
            </a>

            <button
              onClick={() => router.push('/brains')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors text-left"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Cerebros
            </button>

            <span className="px-3 pt-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Gestión (Próximamente)
            </span>

            <div className="space-y-0.5">
              <span
                className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-400 font-medium text-sm cursor-not-allowed select-none"
                title="Próximamente"
              >
                <span className="flex items-center gap-3">
                  <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Miembros
                </span>
                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-200">Soon</span>
              </span>

              <span
                className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-400 font-medium text-sm cursor-not-allowed select-none"
                title="Próximamente"
              >
                <span className="flex items-center gap-3">
                  <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 01.757-.97l10-2.5A1 1 0 0116 3v3h1.243a1 1 0 01.97.757l2.5 10A1 1 0 0120 18v1a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" />
                  </svg>
                  Plantillas
                </span>
                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-200">Soon</span>
              </span>

              <span
                className="flex items-center justify-between px-3 py-2 rounded-xl text-slate-400 font-medium text-sm cursor-not-allowed select-none"
                title="Próximamente"
              >
                <span className="flex items-center gap-3">
                  <svg className="w-4 h-4 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Papelera
                </span>
                <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase font-bold border border-slate-200">0</span>
              </span>
            </div>
          </nav>
        </div>

        {/* User Footer Profile */}
        <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50">
          <div className="flex items-center gap-3 px-1">
            <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
              {user.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <span className="font-semibold text-sm text-slate-800 block truncate">{user.name}</span>
              <span className="text-[10px] text-slate-500 block truncate">{user.email}</span>
            </div>
          </div>
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

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto p-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hola, {user.name} 👋</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Bienvenido de vuelta. Hoy es <span className="capitalize">{todayStr}</span>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/brains')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Ver mis Cerebros
            </button>
          </div>
        </div>

        {brains.length === 0 ? (
          /* Empty State */
          <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100/50 text-center flex flex-col items-center gap-4">
            <div className="p-4 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800">No tienes cerebros asignados</h2>
            <p className="text-sm text-slate-500 leading-relaxed">
              Actualmente no eres miembro de ningún cerebro corporativo. Por favor contacta al administrador del sistema para que te asigne roles de acceso.
            </p>
          </div>
        ) : (
          /* Real Data Dashboard Grid */
          <div className="space-y-8">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cerebros Activos</span>
                <span className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.totalBrains}</span>
                <span className="text-[10px] text-slate-400 mt-1 font-medium">Asignados en tu cuenta</span>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documentos Totales</span>
                <span className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.totalNodes}</span>
                <span className="text-[10px] text-slate-400 mt-1 font-medium">Nodos de conocimiento</span>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes de Revisión</span>
                <span className={`text-3xl font-extrabold mt-1 ${metrics.needsReviewNodes > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                  {metrics.needsReviewNodes}
                </span>
                <span className="text-[10px] text-slate-400 mt-1 font-medium">Nodos con status needs_review</span>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Versiones Guardadas</span>
                <span className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.totalVersions}</span>
                <span className="text-[10px] text-slate-400 mt-1 font-medium">Versiones históricas registradas</span>
              </div>
            </div>

            {/* Split panels grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Cerebros Recientes */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-md font-bold text-slate-800">Tus Cerebros Autorizados</h3>
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                    Total: {brains.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {brains.map((brain) => (
                    <div
                      key={brain.id}
                      className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 hover:shadow-md hover:shadow-slate-100 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-slate-900 truncate">{brain.name}</h4>
                          <span className="text-[9px] bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full font-bold uppercase shrink-0">
                            {getVisibilityBadge(brain.visibility)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {brain.description || 'Sin descripción provista.'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
                        <div className="text-[10px] text-slate-500 font-medium">
                          Rol: <span className="font-semibold text-blue-600 capitalize">{brain.role}</span>
                        </div>
                        <button
                          onClick={() => router.push(`/brains/${brain.id}`)}
                          className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1"
                        >
                          Abrir estructura →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Acciones Rápidas */}
                <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-6">
                  <h4 className="font-bold text-slate-800 mb-3 text-sm">Accesos Rápidos</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      onClick={() => router.push('/brains')}
                      className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-center transition-colors"
                    >
                      <span className="block text-lg mb-1">🌲</span>
                      <span className="text-xs font-semibold text-slate-700">Explorador de Árbol</span>
                    </button>
                    <span
                      className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-center cursor-not-allowed select-none opacity-60 flex flex-col items-center justify-center"
                      title="Próximamente"
                    >
                      <span className="block text-lg mb-1">📝</span>
                      <span className="text-xs font-semibold text-slate-400">Crear Nuevo Nodo</span>
                    </span>
                    <span
                      className="p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-center cursor-not-allowed select-none opacity-60 flex flex-col items-center justify-center"
                      title="Próximamente"
                    >
                      <span className="block text-lg mb-1">⚙️</span>
                      <span className="text-xs font-semibold text-slate-400">Configuración</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Column: Actividad Reciente */}
              <div className="space-y-6">
                <h3 className="text-md font-bold text-slate-800">Actividad Reciente</h3>

                <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5">
                  {recentActivity.length === 0 ? (
                    <p className="text-xs text-slate-400 py-8 text-center font-medium">
                      No hay actividad de cambios registrada en tus cerebros.
                    </p>
                  ) : (
                    <div className="relative border-l border-slate-100 pl-4 space-y-6">
                      {recentActivity.map((act) => (
                        <div key={act.id} className="relative space-y-1">
                          {/* Dot indicator */}
                          <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-600 border-2 border-white ring-4 ring-blue-50"></div>
                          
                          <div className="flex justify-between items-start gap-4">
                            <span className="text-xs font-bold text-slate-800 hover:text-blue-600 cursor-pointer" onClick={() => router.push(`/brains/${act.brainId}`)}>
                              {act.nodeTitle}
                            </span>
                            <span className="text-[9px] text-slate-400 shrink-0 font-medium">
                              {formatDate(act.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 italic leading-relaxed">
                            &ldquo;{act.changeNote}&rdquo;
                          </p>
                          <span className="text-[10px] text-slate-400 block font-medium">
                            Por <span className="font-semibold text-slate-600">{act.saverName}</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recientemente Actualizados (Metadatos de Nodos) */}
                <h3 className="text-md font-bold text-slate-800 pt-2">Nodos Actualizados</h3>
                <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 space-y-3">
                  {recentNodes.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center font-medium">
                      No hay nodos actualizados en tus cerebros.
                    </p>
                  ) : (
                    recentNodes.map((node) => (
                      <div
                        key={node.id}
                        onClick={() => router.push(`/brains/${node.brainId}`)}
                        className="flex justify-between items-center gap-4 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition-colors"
                      >
                        <div className="overflow-hidden">
                          <span className="text-xs font-semibold text-slate-800 block truncate">
                            {node.title}
                          </span>
                          <span className="text-[9px] text-slate-400 block truncate font-medium">
                            {node.brainName} • Modificado por {node.updaterName}
                          </span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          node.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          node.status === 'draft' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                          node.status === 'needs_review' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {node.status === 'active' ? 'Vigente' :
                           node.status === 'draft' ? 'Borrador' :
                           node.status === 'needs_review' ? 'Revisar' :
                           'Archivado'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
