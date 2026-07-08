'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface AdminSummaryResponse {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  estimatedCostUsdCurrentMonth: number;
}

export default function AdminClient() {
  const [data, setData] = useState<AdminSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/summary');
      if (!res.ok) {
        throw new Error('Error al obtener el resumen de métricas del administrador.');
      }
      const json: AdminSummaryResponse = await res.json();
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
      try {
        const res = await fetch('/api/admin/summary');
        if (!res.ok) {
          throw new Error('Error al obtener el resumen de métricas del administrador.');
        }
        const json: AdminSummaryResponse = await res.json();
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const todayStr = new Date().toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  if (loading) {
    return (
      <div className="space-y-8">
        {/* Cabecera loading */}
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-40 bg-slate-200 rounded-lg"></div>
          <div className="h-8 w-80 bg-slate-200 rounded-xl"></div>
          <div className="h-4 w-96 bg-slate-200 rounded-lg"></div>
        </div>

        {/* Grid skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-3 h-32 flex flex-col justify-center">
              <div className="h-3 w-28 bg-slate-200 rounded"></div>
              <div className="h-8 w-16 bg-slate-200 rounded-lg"></div>
              <div className="h-3 w-36 bg-slate-200 rounded"></div>
            </div>
          ))}
        </div>
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
          Error de Conexión
        </div>
        <p className="text-sm text-red-600">{error}</p>
        <Button variant="secondary" onClick={handleRetry} className="bg-white border border-red-200 text-red-700 hover:bg-red-100 shadow-sm">
          Reintentar Carga
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Cabecera del Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-1">
            {todayStr}
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard de Administración
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitoreo global de la plataforma, organizaciones registradas y consumo consolidado.
          </p>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Organizaciones Totales */}
        <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Organizaciones
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1">
              {data.totalOrganizations}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 font-medium">
              Registradas en el tenant
            </span>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
        </div>

        {/* KPI 2: Organizaciones Activas */}
        <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Habilitadas
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1">
              {data.activeOrganizations}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 font-medium">
              Con estado operativo activo
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* KPI 3: Usuarios Registrados */}
        <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Usuarios Totales
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1">
              {data.totalUsers}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 font-medium">
              Cuentas creadas globales
            </span>
          </div>
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </div>

        {/* KPI 4: Costo IA Estimado */}
        <div className="bg-white border border-slate-200 shadow-sm shadow-slate-100/50 rounded-2xl p-5 flex items-center justify-between gap-4 hover:border-slate-300 transition-colors">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Costo IA Estimado
            </span>
            <span className="text-3xl font-extrabold text-slate-900 mt-1">
              {formatCurrency(data.estimatedCostUsdCurrentMonth)}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 font-medium">
              Acumulado del mes corriente
            </span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
