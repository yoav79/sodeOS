'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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

interface OwnerSearchUser {
  id: string;
  email: string;
  name: string | null;
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

  // Estados para la creación de organizaciones
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [isSlugDirty, setIsSlugDirty] = useState(false);
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [ownerSearchInput, setOwnerSearchInput] = useState('');
  const [ownerSearchResults, setOwnerSearchResults] = useState<OwnerSearchUser[]>([]);
  const [ownerSearching, setOwnerSearching] = useState(false);
  const [ownerSearchError, setOwnerSearchError] = useState<string | null>(null);
  const [selectedOwner, setSelectedOwner] = useState<OwnerSearchUser | null>(null);
  const [newPlan, setNewPlan] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const resetCreateModalState = () => {
    setShowCreateModal(false);
    setCreateError(null);
    setCreateSuccess(null);
    setOwnerSearchInput('');
    setOwnerSearchResults([]);
    setOwnerSearching(false);
    setOwnerSearchError(null);
    setSelectedOwner(null);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewName(value);
    if (!isSlugDirty) {
      const suggested = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      setNewSlug(suggested);
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugDirty(true);
    setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
  };

  const handleOwnerEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewOwnerEmail(value);
    setOwnerSearchInput(value);
    setOwnerSearchError(null);

    if (selectedOwner && value.trim().toLowerCase() !== selectedOwner.email.toLowerCase()) {
      setSelectedOwner(null);
    }
  };

  const handleSelectOwner = (user: OwnerSearchUser) => {
    setSelectedOwner(user);
    setNewOwnerEmail(user.email);
    setOwnerSearchInput(user.email);
    setOwnerSearchResults([]);
    setOwnerSearchError(null);
  };

  const handleClearOwnerSelection = () => {
    setSelectedOwner(null);
    setOwnerSearchResults([]);
    setOwnerSearchError(null);
  };

  useEffect(() => {
    if (!showCreateModal) {
      return;
    }

    const query = ownerSearchInput.trim();
    const selectedEmail = selectedOwner?.email.toLowerCase();

    let active = true;
    const timeoutId = window.setTimeout(async () => {
      if (selectedEmail && query.toLowerCase() === selectedEmail) {
        setOwnerSearchResults([]);
        setOwnerSearching(false);
        setOwnerSearchError(null);
        return;
      }

      if (query.length < 2) {
        setOwnerSearchResults([]);
        setOwnerSearching(false);
        setOwnerSearchError(null);
        return;
      }

      setOwnerSearching(true);
      setOwnerSearchError(null);

      try {
        const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}&limit=10`);

        if (res.status === 401 || res.status === 403) {
          throw new Error('Acceso denegado. Se requieren privilegios de sysadmin.');
        }

        if (!res.ok) {
          throw new Error('Error al buscar usuarios existentes.');
        }

        const json: { users?: OwnerSearchUser[] } = await res.json();
        if (active) {
          setOwnerSearchResults(Array.isArray(json.users) ? json.users : []);
        }
      } catch (err: unknown) {
        if (active) {
          setOwnerSearchResults([]);
          setOwnerSearchError(err instanceof Error ? err.message : 'Error inesperado.');
        }
      } finally {
        if (active) {
          setOwnerSearching(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [ownerSearchInput, selectedOwner, showCreateModal]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setCreateError(null);
    setCreateSuccess(null);

    if (!newName.trim() || !newSlug.trim() || !newOwnerEmail.trim()) {
      setCreateError('Todos los campos obligatorios (*) deben ser completados.');
      setCreateSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newName.trim(),
          slug: newSlug.trim(),
          ownerEmail: newOwnerEmail.trim().toLowerCase(),
          plan: newPlan,
        }),
      });

      if (!res.ok) {
        let errMsg = 'Error al crear la organización.';
        try {
          const errJson = await res.json();
          if (errJson && typeof errJson.error === 'string') {
            errMsg = errJson.error;
          }
        } catch {
          // Ignorar error al parsear JSON
        }
        throw new Error(errMsg);
      }

      setCreateSuccess('Organización creada exitosamente.');

      // Limpiar formulario
      setNewName('');
      setNewSlug('');
      setIsSlugDirty(false);
      setNewOwnerEmail('');
      setOwnerSearchInput('');
      setOwnerSearchResults([]);
      setOwnerSearching(false);
      setOwnerSearchError(null);
      setSelectedOwner(null);
      setNewPlan('free');

      // Volver a pág 1 y refrescar listado
      setPage(1);
      setRefreshTrigger((prev) => prev + 1);

      // Cerrar modal
      setTimeout(() => {
        resetCreateModalState();
        setCreateSuccess(null);
      }, 1500);

    } catch (err: unknown) {
      console.error(err);
      setCreateError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setCreateSubmitting(false);
    }
  };

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
  }, [page, appliedQ, appliedPlan, appliedIsActive, refreshTrigger]);

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Gestión de Organizaciones
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Visualiza, filtra y monitorea el estado operativo y plan contratado por cada organización.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl shadow-md shadow-indigo-500/10 shrink-0 font-semibold px-4 py-2.5 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Crear organización
        </Button>
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
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.items.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <Link href={`/admin/organizations/${org.id}`} className="text-indigo-600 hover:underline">
                        {org.name}
                      </Link>
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
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Ver
                      </Link>
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

      {/* Modal de Creación */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                Nueva Organización
              </h3>
              <button
                onClick={() => {
                  resetCreateModalState();
                }}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Alertas */}
            {createError && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold">
                {createError}
              </div>
            )}
            {createSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-700 text-xs font-semibold">
                {createSuccess}
              </div>
            )}

            {/* Formulario */}
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="modal-name" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Nombre de la Organización *
                </label>
                <input
                  id="modal-name"
                  type="text"
                  required
                  placeholder="ej. Acme Corp"
                  value={newName}
                  onChange={handleNameChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="modal-slug" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Slug (Único) *
                </label>
                <input
                  id="modal-slug"
                  type="text"
                  required
                  placeholder="ej. acme-corp"
                  value={newSlug}
                  onChange={handleSlugChange}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="modal-owner" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Propietario Existente *
                </label>
                <div className="space-y-2">
                  <input
                    id="modal-owner"
                    type="text"
                    required
                    placeholder="Busca por nombre o email..."
                    value={ownerSearchInput}
                    onChange={handleOwnerEmailChange}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoComplete="off"
                  />

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Recomendado: selecciona un usuario existente. Si escribes un email manualmente, el backend seguirá validando que exista.
                  </p>

                  {selectedOwner && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-emerald-800 truncate">
                          {selectedOwner.name || 'Usuario seleccionado'}
                        </div>
                        <div className="text-[11px] text-emerald-700 truncate">
                          {selectedOwner.email}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleClearOwnerSelection}
                        className="border border-emerald-200 bg-white hover:bg-emerald-100 rounded-lg text-emerald-700 text-[11px] font-semibold px-2.5 py-1"
                      >
                        Limpiar selección
                      </Button>
                    </div>
                  )}

                  {!selectedOwner && ownerSearchInput.trim().length < 2 && (
                    <div className="text-[11px] text-slate-400">
                      Escribe al menos 2 caracteres para buscar usuarios existentes.
                    </div>
                  )}

                  {!selectedOwner && ownerSearching && ownerSearchInput.trim().length >= 2 && (
                    <div className="text-[11px] text-slate-500">
                      Buscando usuarios...
                    </div>
                  )}

                  {!selectedOwner && ownerSearchError && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                      {ownerSearchError}
                    </div>
                  )}

                  {!selectedOwner && !ownerSearching && ownerSearchInput.trim().length >= 2 && !ownerSearchError && ownerSearchResults.length > 0 && (
                    <div className="max-h-56 overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                      {ownerSearchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleSelectOwner(user)}
                          className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                        >
                          <div className="text-sm font-semibold text-slate-900 truncate">
                            {user.name || 'Sin nombre'}
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {user.email}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {!selectedOwner && !ownerSearching && ownerSearchInput.trim().length >= 2 && !ownerSearchError && ownerSearchResults.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                      Sin coincidencias. Puedes escribir un email manualmente si el usuario ya existe.
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="modal-plan" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                  Plan Inicial
                </label>
                <select
                  id="modal-plan"
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as 'free' | 'pro' | 'enterprise')}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={createSubmitting}
                  onClick={() => {
                    resetCreateModalState();
                  }}
                  className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-700 font-semibold px-4 py-2"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={createSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-semibold px-4 py-2 shadow-md shadow-indigo-500/10"
                >
                  {createSubmitting ? 'Creando...' : 'Crear'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
