'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface AuditLogItem {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  metadata: Record<string, unknown> | null | unknown;
  createdAt: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  actor?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface AuditLogsResponse {
  items: AuditLogItem[];
  pagination: PaginationInfo;
}

export default function AuditLogsClient() {
  const [data, setData] = useState<AuditLogsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de paginación
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Estados de filtros visuales locales
  const [filterOrgId, setFilterOrgId] = useState('');
  const [filterActorId, setFilterActorId] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterTargetType, setFilterTargetType] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Estados de filtros aplicados para fetch
  const [appliedOrgId, setAppliedOrgId] = useState('');
  const [appliedActorId, setAppliedActorId] = useState('');
  const [appliedAction, setAppliedAction] = useState('');
  const [appliedTargetType, setAppliedTargetType] = useState('');
  const [appliedFrom, setAppliedFrom] = useState('');
  const [appliedTo, setAppliedTo] = useState('');

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });

      if (appliedOrgId.trim()) queryParams.append('organizationId', appliedOrgId.trim());
      if (appliedActorId.trim()) queryParams.append('actorUserId', appliedActorId.trim());
      if (appliedAction.trim()) queryParams.append('action', appliedAction.trim());
      if (appliedTargetType.trim()) queryParams.append('targetType', appliedTargetType.trim());
      if (appliedFrom) queryParams.append('from', appliedFrom);
      if (appliedTo) queryParams.append('to', appliedTo);

      const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Acceso denegado. Se requieren privilegios de sysadmin.');
        }
        throw new Error('Error al obtener los logs de auditoría.');
      }
      const json: AuditLogsResponse = await res.json();
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
      setLoading(true);
      setError(null);

      try {
        const queryParams = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });

        if (appliedOrgId.trim()) queryParams.append('organizationId', appliedOrgId.trim());
        if (appliedActorId.trim()) queryParams.append('actorUserId', appliedActorId.trim());
        if (appliedAction.trim()) queryParams.append('action', appliedAction.trim());
        if (appliedTargetType.trim()) queryParams.append('targetType', appliedTargetType.trim());
        if (appliedFrom) queryParams.append('from', appliedFrom);
        if (appliedTo) queryParams.append('to', appliedTo);

        const res = await fetch(`/api/admin/audit-logs?${queryParams.toString()}`);
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error('Acceso denegado. Se requieren privilegios de sysadmin.');
          }
          throw new Error('Error al obtener los logs de auditoría.');
        }
        const json: AuditLogsResponse = await res.json();
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
  }, [page, appliedOrgId, appliedActorId, appliedAction, appliedTargetType, appliedFrom, appliedTo]);

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setAppliedOrgId(filterOrgId);
    setAppliedActorId(filterActorId);
    setAppliedAction(filterAction);
    setAppliedTargetType(filterTargetType);
    setAppliedFrom(filterFrom);
    setAppliedTo(filterTo);
  };

  const handleResetFilters = () => {
    setPage(1);
    setFilterOrgId('');
    setFilterActorId('');
    setFilterAction('');
    setFilterTargetType('');
    setFilterFrom('');
    setFilterTo('');
    setAppliedOrgId('');
    setAppliedActorId('');
    setAppliedAction('');
    setAppliedTargetType('');
    setAppliedFrom('');
    setAppliedTo('');
  };

  const formatDateTime = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const truncateId = (id: string | null) => {
    if (!id) return '—';
    if (id.length <= 8) return id;
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  };

  const renderActionBadge = (action: string) => {
    let colorClasses = 'bg-slate-100 text-slate-800 border-slate-200';
    if (action.includes('DELETE') || action.includes('ARCHIVED') || action.includes('REMOVE')) {
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    } else if (action.includes('CREATE') || action.includes('ADD') || action.includes('INVITE')) {
      colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    } else if (action.includes('UPDATE') || action.includes('EDIT') || action.includes('PATCH')) {
      colorClasses = 'bg-indigo-50 text-indigo-700 border-indigo-200';
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${colorClasses}`}>
        {action}
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
          Error al Cargar Historial de Auditoría
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
          Registro de Auditoría Global
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Visualiza de forma cronológica y audita todas las acciones administrativas y de seguridad del tenant.
        </p>
      </div>

      {/* Panel de Filtros */}
      <form onSubmit={handleApplyFilters} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm shadow-slate-100/50 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Org ID */}
          <div className="space-y-1.5">
            <label htmlFor="orgId" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              ID Organización
            </label>
            <input
              id="orgId"
              type="text"
              placeholder="UUID de la organización..."
              value={filterOrgId}
              onChange={(e) => setFilterOrgId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actor User ID */}
          <div className="space-y-1.5">
            <label htmlFor="actorId" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              ID Actor
            </label>
            <input
              id="actorId"
              type="text"
              placeholder="UUID del usuario..."
              value={filterActorId}
              onChange={(e) => setFilterActorId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Acción */}
          <div className="space-y-1.5">
            <label htmlFor="action" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Acción
            </label>
            <input
              id="action"
              type="text"
              placeholder="Ej: ORG_MEMBER_INVITED..."
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Tipo Target */}
          <div className="space-y-1.5">
            <label htmlFor="targetType" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Tipo Objetivo
            </label>
            <input
              id="targetType"
              type="text"
              placeholder="Ej: brain, node..."
              value={filterTargetType}
              onChange={(e) => setFilterTargetType(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Fecha Desde */}
          <div className="space-y-1.5">
            <label htmlFor="from" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Desde
            </label>
            <input
              id="from"
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>

          {/* Fecha Hasta */}
          <div className="space-y-1.5">
            <label htmlFor="to" className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Hasta
            </label>
            <input
              id="to"
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="submit" variant="primary" className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl shadow-md shadow-indigo-500/10">
            Aplicar Filtros
          </Button>
          {(filterOrgId || filterActorId || filterAction || filterTargetType || filterFrom || filterTo || appliedOrgId || appliedActorId || appliedAction || appliedTargetType || appliedFrom || appliedTo) && (
            <Button type="button" variant="secondary" onClick={handleResetFilters} className="border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-700">
              Limpiar
            </Button>
          )}
        </div>
      </form>

      {/* Tabla */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-100/50 overflow-hidden">
        {loading ? (
          // Skeleton
          <div className="divide-y divide-slate-100">
            <div className="bg-slate-50/50 px-6 py-4 flex items-center justify-between border-b border-slate-200 font-bold text-xs text-slate-400 uppercase tracking-wider">
              <span>Cargando logs de auditoría...</span>
            </div>
            {[1, 2, 3, 4, 5].map((idx) => (
              <div key={idx} className="px-6 py-4 animate-pulse flex items-center justify-between gap-6">
                <div className="h-4 w-24 bg-slate-200 rounded"></div>
                <div className="h-6 w-32 bg-slate-200 rounded-full"></div>
                <div className="space-y-1 flex-1">
                  <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
                  <div className="h-3 w-1/4 bg-slate-200 rounded"></div>
                </div>
                <div className="h-4 w-28 bg-slate-200 rounded"></div>
                <div className="h-8 w-40 bg-slate-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          // Empty State
          <div className="p-16 text-center space-y-4">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-400 inline-flex items-center justify-center">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2H9m1.5 4h3M9 12h6M9 16h6" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900">No se encontraron logs de auditoría</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Intenta cambiar los parámetros de filtros establecidos o selecciona un rango de fechas diferente.
            </p>
          </div>
        ) : (
          // Tabla de Datos
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Acción</th>
                  <th className="px-6 py-4">Organización</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Target</th>
                  <th className="px-6 py-4">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.items.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors align-top">
                    {/* Fecha */}
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>

                    {/* Acción */}
                    <td className="px-6 py-4">
                      {renderActionBadge(log.action)}
                    </td>

                    {/* Organización */}
                    <td className="px-6 py-4">
                      {log.organization ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{log.organization.name}</span>
                          <span className="text-xs text-slate-400 font-mono">{log.organization.slug}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Actor */}
                    <td className="px-6 py-4">
                      {log.actor ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-900">{log.actor.name || '—'}</span>
                          <span className="text-xs text-slate-400">{log.actor.email}</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200 inline-block">
                          Sistema
                        </span>
                      )}
                    </td>

                    {/* Target */}
                    <td className="px-6 py-4 text-xs font-medium text-slate-700">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">
                          {log.targetType}
                        </span>
                        <span className="text-slate-500 font-mono">
                          ID: {truncateId(log.targetId)}
                        </span>
                      </div>
                    </td>

                    {/* Metadata */}
                    <td className="px-6 py-4">
                      {log.metadata && Object.keys(log.metadata as Record<string, unknown>).length > 0 ? (
                        <pre className="text-[10px] font-mono bg-slate-50 border border-slate-200 p-2 rounded max-w-xs overflow-auto whitespace-pre-wrap max-h-24 text-slate-600">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
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
            Mostrando registros del {((page - 1) * pageSize) + 1} al {Math.min(page * pageSize, data.pagination.total)} de {data.pagination.total} en total
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
