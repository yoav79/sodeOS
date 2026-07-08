'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  createdAt: string;
  _count: {
    memberships: number;
    brains: number;
  };
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface OrganizationsResponse {
  items: OrganizationItem[];
  pagination: PaginationInfo;
}

export default function OrganizationsClient() {
  const [data, setData] = useState<OrganizationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de paginación
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Estados de filtros
  const [searchQ, setSearchQ] = useState('');
  const [selectPlan, setSelectPlan] = useState('');
  const [selectIsActive, setSelectIsActive] = useState('');

  // Filtros aplicados para el fetch
  const [appliedQ, setAppliedQ] = useState('');
  const [appliedPlan, setAppliedPlan] = useState('');
  const [appliedIsActive, setAppliedIsActive] = useState('');

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (appliedQ.trim()) {
        queryParams.append('q', appliedQ.trim());
      }
      if (appliedPlan) {
        queryParams.append('plan', appliedPlan);
      }
      if (appliedIsActive) {
        queryParams.append('isActive', appliedIsActive);
      }

      const res = await fetch(`/api/admin/organizations?${queryParams.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Acceso denegado. Se requieren privilegios de sysadmin.');
        }
        throw new Error('Error al obtener el listado de organizaciones.');
      }
      const json: OrganizationsResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    async function load() {
      // Indicamos loading
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });

        if (appliedQ.trim()) {
          queryParams.append('q', appliedQ.trim());
        }
        if (appliedPlan) {
          queryParams.append('plan', appliedPlan);
        }
        if (appliedIsActive) {
          queryParams.append('isActive', appliedIsActive);
        }

        const res = await fetch(`/api/admin/organizations?${queryParams.toString()}`);
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('Acceso denegado. Se requieren privilegios de sysadmin.');
          }
          throw new Error('Error al obtener el listado de organizaciones.');
        }
        const json: OrganizationsResponse = await res.json();
        if (active) {
          setData(json);
        }
      } catch (err: unknown) {
        console.error(err);
        if (active) {
          setError(err instanceof Error ? err.message : 'Error inesperado.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [page, appliedQ, appliedPlan, appliedIsActive]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedQ(searchQ);
    setAppliedPlan(selectPlan);
    setAppliedIsActive(selectIsActive);
  };

  const handleResetFilters = () => {
    setPage(1);
    setSearchQ('');
    setSelectPlan('');
    setSelectIsActive('');
    setAppliedQ('');
    setAppliedPlan('');
    setAppliedIsActive('');
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderPlanBadge = (plan: 'free' | 'pro' | 'enterprise') => {
    switch (plan) {
      case 'free':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-200">
            Free
          </span>
        );
      case 'pro':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Pro
          </span>
        );
      case 'enterprise':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Enterprise
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {plan}
          </span>
        );
    }
  };

  const renderActiveBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Activa
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        Suspendida
      </span>
    );
  };

  if (error) {
    return (
      <div className="max-w-md mx-auto my-16 bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-red-800 font-semibold">
          <div className="p-3 bg-red-100 rounded-full text-red-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          Error al Cargar Organizaciones
        </div>
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="secondary" onClick={handleRetry} className="bg-white border border-red-200 text-red-700 hover:bg-red-100 shadow-sm">
          Reintentar Carga
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Gestión de Organizaciones
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Visualiza, filtra y monitorea el estado operativo y plan contratado por cada organización.
        </p>
      </div>

      {/* Panel de Filtros */}
      <form onSubmit={handleApplyFilters} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm shadow-slate-100/50 flex flex-wrap items-end gap-4">
        {/* Búsqueda por texto */}
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <label htmlFor="search" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Búsqueda
          </label>
          <input
            id="search"
            type="text"
            placeholder="Buscar por nombre o slug..."
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Filtrar por Plan */}
        <div className="w-[180px] space-y-1.5">
          <label htmlFor="plan" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Plan
          </label>
          <select
            id="plan"
            value={selectPlan}
            onChange={(e) => setSelectPlan(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los planes</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        {/* Filtrar por Estado */}
        <div className="w-[180px] space-y-1.5">
          <label htmlFor="status" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Estado
          </label>
          <select
            id="status"
            value={selectIsActive}
            onChange={(e) => setSelectIsActive(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los estados</option>
            <option value="true">Activa</option>
            <option value="false">Suspendida</option>
          </select>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl shadow-md shadow-indigo-500/10">
            Aplicar
          </Button>
          {(searchQ || selectPlan || selectIsActive || appliedQ || appliedPlan || appliedIsActive) && (
            <Button type="button" variant="secondary" onClick={handleResetFilters} className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-700">
              Limpiar
            </Button>
          )}
        </div>
      </form>

      {/* Tabla de Resultados */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-100/50 overflow-hidden">
        {loading ? (
          // Skeleton loader de la tabla
          <div className="divide-y divide-slate-100">
            <div className="bg-slate-50/50 px-6 py-4 flex items-center justify-between border-b border-slate-200 font-bold text-xs text-slate-400 uppercase tracking-wider">
              <span>Cargando organizaciones...</span>
            </div>
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="px-6 py-4 animate-pulse flex items-center justify-between gap-6">
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
                  <div className="h-3 w-1/4 bg-slate-200 rounded"></div>
                </div>
                <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
                <div className="h-6 w-16 bg-slate-200 rounded-full"></div>
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          // Empty State
          <div className="p-16 text-center space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 inline-flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">No se encontraron organizaciones</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Intenta ajustar los filtros aplicados o comprueba el término de búsqueda ingresado.
            </p>
          </div>
        ) : (
          // Tabla Real
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Nombre</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-center">Miembros</th>
                  <th className="px-6 py-4 text-center">Cerebros</th>
                  <th className="px-6 py-4">Creada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.items.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {org.name}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                      {org.slug}
                    </td>
                    <td className="px-6 py-4">
                      {renderPlanBadge(org.plan)}
                    </td>
                    <td className="px-6 py-4">
                      {renderActiveBadge(org.isActive)}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 font-medium">
                      {org._count.memberships}
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 font-medium">
                      {org._count.brains}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDate(org.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-6 py-4 shadow-sm shadow-slate-100/50">
          <span className="text-xs text-slate-500 font-medium">
            Mostrando organizaciones del {((page - 1) * pageSize) + 1} al {Math.min(page * pageSize, data.pagination.total)} de {data.pagination.total} en total
          </span>

          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="sm"
              disabled={page === 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-700 px-3 py-1.5"
            >
              Anterior
            </Button>
            <span className="text-xs font-semibold text-slate-700">
              Página {page} de {data.pagination.totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              disabled={page === data.pagination.totalPages || loading}
              onClick={() => setPage((prev) => Math.min(data.pagination.totalPages, prev + 1))}
              className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-700 px-3 py-1.5"
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
