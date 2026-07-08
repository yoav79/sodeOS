'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  plan: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  createdAt: string;
  members: {
    total: number;
    items: {
      id: string;
      name: string;
      email: string;
      role: string;
      joinedAt: string;
    }[];
  };
  brains: {
    total: number;
    items: {
      id: string;
      name: string;
      visibility: string;
      createdAt: string;
      _count: { members: number };
    }[];
  };
  usage: {
    periodStart: string;
    metrics: {
      [key: string]: { used: number; limit: number | null };
    };
  };
  recentAuditLogs: {
    id: string;
    action: string;
    targetType: string;
    targetId: string | null;
    createdAt: string;
    actor: { name: string | null; email: string } | null;
  }[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('es-ES').format(n);
}

function truncateId(id: string | null): string {
  if (!id) return '—';
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

export default function OrganizationDetailClient({ orgId }: { orgId: string }) {
  const [data, setData] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      setNotFound(false);
      try {
        const res = await fetch(`/api/admin/organizations/${orgId}`);
        if (res.status === 401 || res.status === 403) {
          throw new Error('Acceso denegado. Se requieren privilegios de sysadmin.');
        }
        if (res.status === 404) {
          if (active) setNotFound(true);
          return;
        }
        if (!res.ok) {
          throw new Error('Error al obtener el detalle de la organización.');
        }
        const json: OrgDetail = await res.json();
        if (active) setData(json);
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Error inesperado.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [orgId]);

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    fetch(`/api/admin/organizations/${orgId}`)
      .then(async (res) => {
        if (res.status === 401 || res.status === 403) {
          throw new Error('Acceso denegado. Se requieren privilegios de sysadmin.');
        }
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (!res.ok) {
          throw new Error('Error al obtener el detalle de la organización.');
        }
        setData(await res.json());
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error inesperado.');
      })
      .finally(() => setLoading(false));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const formatDateTime = (iso: string) =>
    new Date(iso).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });

  const renderPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-slate-100 text-slate-800 border-slate-200',
      pro: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      enterprise: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colors[plan] || colors.free}`}>
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </span>
    );
  };

  const renderUsageBar = (used: number, limit: number | null) => {
    if (limit === null) {
      return <span className="text-xs text-slate-500 font-medium">Ilimitado</span>;
    }
    const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
    const barColor = pct > 90 ? 'bg-rose-500' : pct > 70 ? 'bg-amber-500' : 'bg-indigo-500';
    return (
      <div className="space-y-1">
        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-slate-400">{formatNumber(used)} / {formatNumber(limit)}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-48 bg-slate-200 rounded-lg" />
          <div className="h-8 w-72 bg-slate-200 rounded-xl" />
          <div className="h-4 w-96 bg-slate-200 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 animate-pulse h-24" />
          ))}
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="max-w-md mx-auto my-16 bg-amber-50 border border-amber-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <h2 className="text-lg font-bold text-amber-800">Organización no encontrada</h2>
        <p className="text-sm text-amber-600">La organización solicitada no existe o fue eliminada.</p>
        <Link href="/admin/organizations" className="inline-block mt-2">
          <Button variant="secondary" className="border border-amber-200 text-amber-700 hover:bg-amber-100">
            Volver a Organizaciones
          </Button>
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto my-16 bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-red-800 font-semibold">
          <div className="p-3 bg-red-100 rounded-full text-red-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          Error al Cargar Organización
        </div>
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="secondary" onClick={handleRetry} className="bg-white border border-red-200 text-red-700 hover:bg-red-100 shadow-sm">
          Reintentar Carga
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const usageLabels: Record<string, string> = {
    ai_requests: 'Solicitudes IA',
    ai_tokens: 'Tokens IA',
    web_searches: 'Búsquedas Web',
    file_uploads: 'Subidas de Archivo',
    storage_bytes: 'Almacenamiento',
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/admin/organizations" className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:underline">
            ← Organizaciones
          </Link>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">{data.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">{data.slug}</span>
            {renderPlanBadge(data.plan)}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${data.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
              {data.isActive ? 'Activa' : 'Suspendida'}
            </span>
            <span className="text-xs text-slate-400">Creada: {formatDate(data.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Usage Cards */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Uso del Mes Actual</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(data.usage.metrics).map(([key, metric]) => (
            <div key={key} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm shadow-slate-100/50">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                {usageLabels[key] || key}
              </span>
              <div className="text-xl font-extrabold text-slate-900 mb-1">
                {key === 'storage_bytes' ? formatBytes(metric.used) : formatNumber(metric.used)}
              </div>
              {renderUsageBar(metric.used, metric.limit)}
            </div>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Miembros <span className="text-slate-300">({data.members.total})</span>
        </h2>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-100/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Rol</th>
                  <th className="px-6 py-3">Se unió</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.members.items.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Sin miembros</td></tr>
                ) : data.members.items.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-semibold text-slate-900">{m.name}</td>
                    <td className="px-6 py-3 text-slate-500">{m.email}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{formatDate(m.joinedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.members.total > data.members.items.length && (
            <div className="px-6 py-2.5 border-t border-slate-100 text-xs text-slate-400 text-center">
              + {data.members.total - data.members.items.length} miembros más
            </div>
          )}
        </div>
      </div>

      {/* Brains Table */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
          Cerebros <span className="text-slate-300">({data.brains.total})</span>
        </h2>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-100/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Nombre</th>
                  <th className="px-6 py-3">Visibilidad</th>
                  <th className="px-6 py-3 text-center">Miembros</th>
                  <th className="px-6 py-3">Creado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.brains.items.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Sin cerebros</td></tr>
                ) : data.brains.items.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 font-semibold text-slate-900">{b.name}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {b.visibility}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-slate-600 font-medium">{b._count.members}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{formatDate(b.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.brains.total > data.brains.items.length && (
            <div className="px-6 py-2.5 border-t border-slate-100 text-xs text-slate-400 text-center">
              + {data.brains.total - data.brains.items.length} cerebros más
            </div>
          )}
        </div>
      </div>

      {/* Recent Audit Logs */}
      <div>
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Últimos Logs de Auditoría</h2>
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-100/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Fecha</th>
                  <th className="px-6 py-3">Acción</th>
                  <th className="px-6 py-3">Tipo</th>
                  <th className="px-6 py-3">Target</th>
                  <th className="px-6 py-3">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.recentAuditLogs.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400">Sin registros</td></tr>
                ) : data.recentAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-3 text-slate-500 whitespace-nowrap text-xs">{formatDateTime(log.createdAt)}</td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs font-medium text-slate-700 uppercase">{log.targetType}</td>
                    <td className="px-6 py-3 text-xs font-mono text-slate-500">{truncateId(log.targetId)}</td>
                    <td className="px-6 py-3 text-xs text-slate-600">
                      {log.actor ? `${log.actor.name || '—'} (${log.actor.email})` : 'Sistema'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
