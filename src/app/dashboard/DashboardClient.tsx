'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface BrainInfo {
  id: string;
  name: string;
  description: string | null;
  visibility: string;
  role: string;
  activeNodesCount: number;
  updatedAt: string;
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
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const visibleCount = isMobile ? 1 : 2;
  const maxIndex = Math.max(0, brains.length - visibleCount);

  const handlePrev = () => {
    setCarouselIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCarouselIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Sidebar with full height and pinned footer */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-full">
        {/* Navigation scrollable container */}
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Header Brand */}
          <div className="p-6 border-b border-slate-200 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14M6.5 6.5l11 11M17.5 6.5l-11 11" opacity="0.4" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                <circle cx="12" cy="5" r="1.75" fill="currentColor" />
                <circle cx="12" cy="19" r="1.75" fill="currentColor" />
                <circle cx="5" cy="12" r="1.75" fill="currentColor" />
                <circle cx="19" cy="12" r="1.75" fill="currentColor" />
                <circle cx="6.5" cy="6.5" r="1.75" fill="currentColor" />
                <circle cx="17.5" cy="17.5" r="1.75" fill="currentColor" />
                <circle cx="17.5" cy="6.5" r="1.75" fill="currentColor" />
                <circle cx="6.5" cy="17.5" r="1.75" fill="currentColor" />
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


          </nav>
        </div>

        {/* Pinned User Footer Profile */}
        <div className="p-4 border-t border-slate-200 space-y-3 bg-slate-50/50 shrink-0">
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
            className="w-full py-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
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

      {/* Main Content Pane with internal scroll only */}
      <main className="flex-1 overflow-y-auto p-8 h-full">
        {/* Welcome Header & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hola, {user.name} 👋</h1>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Bienvenido de vuelta. Hoy es <span className="capitalize">{todayStr}</span>.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/brains/new')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/10 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              + Nuevo Cerebro
            </button>
            <button
              onClick={() => router.push('/brains')}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Ver mis Cerebros
            </button>
          </div>
        </div>

        {brains.length === 0 ? (
          /* Empty State */
          <div className="max-w-md mx-auto my-16 p-8 bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-100/50 text-center flex flex-col items-center gap-5">
            <div className="p-4 bg-blue-50 text-blue-500 border border-blue-100 rounded-2xl">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14M6.5 6.5l11 11M17.5 6.5l-11 11" opacity="0.4" />
                <circle cx="12" cy="12" r="2.5" fill="currentColor" />
                <circle cx="12" cy="5" r="1.75" fill="currentColor" />
                <circle cx="12" cy="19" r="1.75" fill="currentColor" />
                <circle cx="5" cy="12" r="1.75" fill="currentColor" />
                <circle cx="19" cy="12" r="1.75" fill="currentColor" />
                <circle cx="6.5" cy="6.5" r="1.75" fill="currentColor" />
                <circle cx="17.5" cy="17.5" r="1.75" fill="currentColor" />
                <circle cx="17.5" cy="6.5" r="1.75" fill="currentColor" />
                <circle cx="6.5" cy="17.5" r="1.75" fill="currentColor" />
              </svg>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-800">Aún no tienes cerebros</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Crea tu primer espacio de conocimiento.
              </p>
            </div>
            <button
              onClick={() => router.push('/brains/new')}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-md shadow-blue-500/10 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Crear mi primer Cerebro
            </button>
          </div>
        ) : (
          /* Real Data Dashboard Grid */
          <div className="space-y-8">
            {/* Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Metric 1 */}
              <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cerebros Activos</span>
                  <span className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.totalBrains}</span>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium">Asignados en tu cuenta</span>
                </div>
                <div className="p-3 bg-blue-50 text-blue-500 rounded-xl">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
              </div>

              {/* Metric 2 */}
              <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Documentos Totales</span>
                  <span className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.totalNodes}</span>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium">Nodos de conocimiento</span>
                </div>
                <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>

              {/* Metric 3 */}
              <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes de revisión</span>
                  <span className={`text-3xl font-extrabold mt-1 ${metrics.needsReviewNodes > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                    {metrics.needsReviewNodes}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium">Nodos pendientes de review</span>
                </div>
                <div className={`p-3 rounded-xl ${metrics.needsReviewNodes > 0 ? 'bg-amber-50 text-amber-500' : 'bg-slate-50 text-slate-500'}`}>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              {/* Metric 4 */}
              <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Versiones Guardadas</span>
                  <span className="text-3xl font-extrabold text-slate-900 mt-1">{metrics.totalVersions}</span>
                  <span className="text-[10px] text-slate-400 mt-1 font-medium">Historial registrado</span>
                </div>
                <div className="p-3 bg-slate-50 text-slate-500 rounded-xl">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Split panels layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch lg:h-[500px]">
              {/* Left Column: Tus Cerebros Recientes (Carousel) & Nodos Actualizados */}
              <div className="lg:col-span-2 flex flex-col h-full justify-between gap-6 min-h-0">
                {/* Carousel Card Block (Shrinkable to its contents height) */}
                <div className="shrink-0 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-md font-bold text-slate-800">Tus Cerebros Recientes</h3>
                      <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full font-bold">
                        {brains.length}
                      </span>
                    </div>
                    <button
                      onClick={() => router.push('/brains')}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-0.5"
                    >
                      Ver todos
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Carousel Container */}
                  <div className="relative flex items-center gap-4">
                    {/* Left arrow */}
                    {brains.length > visibleCount && (
                      <button
                        onClick={handlePrev}
                        disabled={carouselIndex === 0}
                        className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                        aria-label="Anterior"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}

                    {/* Cards container */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                      {brains
                        .slice(carouselIndex, carouselIndex + visibleCount)
                        .map((brain) => (
                          <div
                            key={brain.id}
                            className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 hover:shadow-md hover:shadow-slate-100 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <h4 className="font-bold text-slate-900 truncate" title={brain.name}>{brain.name}</h4>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className={`text-[9px] border px-2 py-0.5 rounded-full font-bold uppercase ${
                                    brain.visibility === 'private' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                                    brain.visibility === 'company' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                    'bg-indigo-50 text-indigo-600 border-indigo-200'
                                  }`}>
                                    {getVisibilityLabel(brain.visibility)}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed h-8">
                                {brain.description || 'Sin descripción provista.'}
                              </p>
                            </div>

                            <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                              <div className="flex items-center justify-between text-[10px] text-slate-500">
                                <span className="font-medium">
                                  Rol: <span className="font-semibold text-blue-600">{getRoleLabel(brain.role)}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                  </svg>
                                  {brain.activeNodesCount} {brain.activeNodesCount === 1 ? 'nodo' : 'nodos'}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pt-1 mt-0.5">
                                <span className="text-[9px] text-slate-400 font-medium">
                                  Act. {formatDate(brain.updatedAt)}
                                </span>
                                <button
                                  onClick={() => router.push(`/brains/${brain.id}`)}
                                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-0.5"
                                >
                                  Abrir
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      {/* Placeholder empty card when list only has 1 and we display 2 spots on desktop */}
                      {!isMobile && brains.length - carouselIndex === 1 && (
                        <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2">
                          <span className="text-xl">🧠</span>
                          <p className="text-xs text-slate-400 font-medium">¿Listo para más conocimiento?</p>
                          <button
                            onClick={() => router.push('/brains/new')}
                            className="text-[10px] font-bold text-blue-600 hover:underline"
                          >
                            + Crear otro cerebro
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Right arrow */}
                    {brains.length > visibleCount && (
                      <button
                        onClick={handleNext}
                        disabled={carouselIndex >= maxIndex}
                        className="p-2 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                        aria-label="Siguiente"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Section: Nodos Actualizados (Expands to fill remaining height, aligned at bottom) */}
                <div className="flex-1 flex flex-col space-y-4 min-h-0">
                  <h3 className="text-md font-bold text-slate-800">Nodos Actualizados</h3>
                  <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex flex-col flex-1 min-h-0">
                    <div className="overflow-y-auto flex-1 pr-1 space-y-3">
                      {recentNodes.length === 0 ? (
                        <p className="text-xs text-slate-400 py-6 text-center font-medium">
                          No hay nodos actualizados en tus cerebros.
                        </p>
                      ) : (
                        recentNodes.map((node) => (
                          <div
                            key={node.id}
                            onClick={() => router.push(`/brains/${node.brainId}`)}
                            className="flex justify-between items-center gap-4 py-2.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded-lg px-2 cursor-pointer transition-colors"
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

              {/* Right Column: Actividad Reciente (Fills full height of this column, aligning visually with left col bottom) */}
              <div className="flex flex-col h-full space-y-4 min-h-0">
                <h3 className="text-md font-bold text-slate-800">Actividad Reciente</h3>

                <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex flex-col flex-1 min-h-0">
                  <div className="overflow-y-auto flex-1 pr-1">
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
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
