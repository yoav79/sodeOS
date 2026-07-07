'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface UsageLimitEntry {
  used: number | null;
  limit: number | null;
  period: 'monthly' | 'lifetime' | 'per_request';
}

interface UsageSummaryResponse {
  organizationId: string;
  plan: 'free' | 'pro' | 'enterprise';
  periodStart: string;
  generatedAt: string;
  limits: {
    ai_requests: UsageLimitEntry;
    ai_tokens: UsageLimitEntry;
    web_searches: UsageLimitEntry;
    file_uploads: UsageLimitEntry;
    storage_bytes: UsageLimitEntry;
    max_file_size_bytes: UsageLimitEntry;
    attachment_extractions: UsageLimitEntry;
  };
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return 'No disponible';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function getPlanLabel(plan: string): string {
  switch (plan) {
    case 'free':
      return 'Plan Gratuito';
    case 'pro':
      return 'Plan Pro';
    case 'enterprise':
      return 'Plan Enterprise';
    default:
      return plan;
  }
}

export default function UsageSummaryCard() {
  const [data, setData] = useState<UsageSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await fetch('/api/usage/summary');
        if (!res.ok) {
          throw new Error('Error al obtener el resumen de consumo.');
        }
        const json: UsageSummaryResponse = await res.json();
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
  }, []);

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/usage/summary');
      if (!res.ok) {
        throw new Error('Error al obtener el resumen de consumo.');
      }
      const json: UsageSummaryResponse = await res.json();
      setData(json);
    } catch (err: unknown) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-6 animate-pulse space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-6 w-48 bg-slate-200 rounded-lg"></div>
          <div className="h-6 w-24 bg-slate-200 rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((idx) => (
            <div key={idx} className="space-y-2">
              <div className="h-4 w-32 bg-slate-200 rounded"></div>
              <div className="h-2 w-full bg-slate-200 rounded-full"></div>
              <div className="h-3 w-16 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-red-800 font-semibold">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Error al cargar consumo de límites
        </div>
        <p className="text-xs text-red-600">{error}</p>
        <Button variant="secondary" size="sm" onClick={handleRetry} className="bg-white border border-red-200 text-red-700 hover:bg-red-100">
          Reintentar
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const renderProgressBar = (
    title: string,
    entry: UsageLimitEntry,
    isBytes = false,
    extraNote?: string
  ) => {
    const { used, limit } = entry;
    
    let displayUsed = '';
    let displayLimit = '';
    let pct = 0;
    
    if (used === null) {
      displayUsed = '—';
    } else {
      displayUsed = isBytes ? formatBytes(used) : used.toLocaleString();
    }

    if (limit === null) {
      displayLimit = 'Ilimitado';
      pct = 0;
    } else {
      displayLimit = isBytes ? formatBytes(limit) : limit.toLocaleString();
      if (used !== null && limit > 0) {
        pct = Math.min(100, Math.round((used / limit) * 100));
      } else if (limit === 0) {
        pct = 100;
      }
    }

    const showWarning = limit !== null && pct >= 80 && pct < 100;
    const showDanger = limit !== null && pct >= 100;

    let barColorClass = 'bg-blue-600';
    if (showDanger) barColorClass = 'bg-red-600';
    else if (showWarning) barColorClass = 'bg-amber-500';
    else if (limit === null) barColorClass = 'bg-indigo-500';

    return (
      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between gap-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs font-bold text-slate-700 block">{title}</span>
            {extraNote && <span className="text-[10px] text-slate-400 block mt-0.5">{extraNote}</span>}
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {entry.period === 'monthly' ? 'Mensual' : 'Total'}
          </span>
        </div>

        <div>
          <div className="flex justify-between items-baseline text-xs mb-1">
            <span className="font-semibold text-slate-800">
              {displayUsed} <span className="text-slate-400 font-normal">/ {displayLimit}</span>
            </span>
            {limit !== null && (
              <span className={`text-[10px] font-bold ${showDanger ? 'text-red-600' : showWarning ? 'text-amber-600' : 'text-slate-500'}`}>
                {pct}%
              </span>
            )}
          </div>

          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
            <div
              className={`${barColorClass} h-full transition-all duration-500`}
              style={{ width: `${limit === null ? 100 : pct}%` }}
            ></div>
          </div>
        </div>

        {/* Warning messages */}
        {showDanger && (
          <div className="text-[10px] text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
            Límite alcanzado
          </div>
        )}
        {showWarning && (
          <div className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Cercano al límite
          </div>
        )}
      </div>
    );
  };

  const {
    ai_requests,
    ai_tokens,
    web_searches,
    file_uploads,
    storage_bytes,
    max_file_size_bytes,
    attachment_extractions,
  } = data.limits;

  const planClass =
    data.plan === 'enterprise'
      ? 'bg-violet-100 text-violet-800 border-violet-200'
      : data.plan === 'pro'
      ? 'bg-blue-100 text-blue-800 border-blue-200'
      : 'bg-slate-100 text-slate-800 border-slate-200';

  return (
    <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-md font-bold text-slate-800 flex items-center gap-2">
            Uso del Plan y Límites
            <span className={`text-[10px] font-bold border px-2.5 py-0.5 rounded-full uppercase tracking-wider ${planClass}`}>
              {getPlanLabel(data.plan)}
            </span>
          </h2>
          <p className="text-[10px] text-slate-500 font-medium mt-1">
            Período mensual actual desde el <span className="font-semibold text-slate-700">{formatDate(data.periodStart)}</span>.
          </p>
        </div>

        {max_file_size_bytes.limit !== null && (
          <div className="self-start sm:self-center flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 text-[10px] font-semibold">
            <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Tamaño máx. por archivo: {formatBytes(max_file_size_bytes.limit)}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderProgressBar('Solicitudes de IA', ai_requests)}
        {renderProgressBar('Tokens de IA', ai_tokens, false, 'Estimado según tokens reportados')}
        {renderProgressBar('Búsquedas Web', web_searches)}
        {renderProgressBar('Archivos Subidos', file_uploads)}
        {renderProgressBar('Almacenamiento Total', storage_bytes, true)}
        {renderProgressBar('Extracciones de Texto', attachment_extractions)}
      </div>
    </div>
  );
}
