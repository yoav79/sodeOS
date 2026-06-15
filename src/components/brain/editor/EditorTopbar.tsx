'use client';

import React, { useState, useEffect, useRef } from 'react';
import { NodeTreeItem, Node } from '@/types';
import { BrainSearchResult } from '../BrainEditorClient';
import { Button } from '@/components/ui/Button';

interface EditorTopbarProps {
  brainName: string;
  breadcrumbPath: NodeTreeItem[] | null;
  nodeDetail: Node | null;
  onSelectNode: (id: string) => void;
  onNavigateToBrains: () => void;
  onNavigateToBrain: () => void;
  onNavigateToDashboard: () => void;
  onLogout: () => void;

  // Remote Search Props
  remoteSearchQuery: string;
  remoteSearchResults: BrainSearchResult[];
  isRemoteSearching: boolean;
  remoteSearchError: string | null;
  isRemoteSearchOpen: boolean;
  setIsRemoteSearchOpen: (open: boolean) => void;
  onRemoteSearch: (query: string) => void;
  onSelectSearchResult: (nodeId: string) => void;
}

export default function EditorTopbar({
  brainName,
  breadcrumbPath,
  nodeDetail,
  onSelectNode,
  onNavigateToBrains,
  onNavigateToBrain,
  onNavigateToDashboard,
  onLogout,
  remoteSearchQuery,
  remoteSearchResults,
  isRemoteSearching,
  remoteSearchError,
  isRemoteSearchOpen,
  setIsRemoteSearchOpen,
  onRemoteSearch,
  onSelectSearchResult,
}: EditorTopbarProps) {
  const renderBreadcrumbNodes = () => {
    if (!breadcrumbPath || breadcrumbPath.length === 0) return null;

    const len = breadcrumbPath.length;

    if (len <= 4) {
      return breadcrumbPath.map((node, index) => {
        const isLast = index === len - 1;
        return (
          <React.Fragment key={node.id}>
            <span className="text-slate-300/80">/</span>
            {isLast ? (
              <span className="font-extrabold text-slate-800 truncate max-w-[180px]">{node.title}</span>
            ) : (
              <span
                onClick={() => onSelectNode(node.id)}
                className="hover:text-blue-600 cursor-pointer shrink-0 transition-colors duration-150 font-semibold truncate max-w-[120px]"
              >
                {node.title}
              </span>
            )}
          </React.Fragment>
        );
      });
    }

    const firstNode = breadcrumbPath[0];
    const penultimateNode = breadcrumbPath[len - 2];
    const currentNode = breadcrumbPath[len - 1];

    return (
      <>
        {/* Primer nodo */}
        <span className="text-slate-300/80">/</span>
        <span
          onClick={() => onSelectNode(firstNode.id)}
          className="hover:text-blue-600 cursor-pointer shrink-0 transition-colors duration-150 font-semibold truncate max-w-[120px]"
        >
          {firstNode.title}
        </span>

        {/* Separador colapsado */}
        <span className="text-slate-300/80">/</span>
        <span 
          className="text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-1.5 py-0.5 rounded-md font-mono text-[9px] font-bold cursor-default select-none transition-colors duration-150" 
          title="Segmentos intermedios ocultados"
        >
          &hellip;
        </span>

        {/* Penúltimo nodo */}
        <span className="text-slate-300/80">/</span>
        <span
          onClick={() => onSelectNode(penultimateNode.id)}
          className="hover:text-blue-600 cursor-pointer shrink-0 transition-colors duration-150 font-semibold truncate max-w-[120px]"
        >
          {penultimateNode.title}
        </span>

        {/* Nodo actual */}
        <span className="text-slate-300/80">/</span>
        <span className="font-extrabold text-slate-800 truncate max-w-[180px]">
          {currentNode.title}
        </span>
      </>
    );
  };

  const [localInput, setLocalInput] = useState(remoteSearchQuery);
  const [prevQuery, setPrevQuery] = useState(remoteSearchQuery);
  const containerRef = useRef<HTMLDivElement>(null);

  // Adjust localInput state during render when remoteSearchQuery prop changes
  if (remoteSearchQuery !== prevQuery) {
    setPrevQuery(remoteSearchQuery);
    setLocalInput(remoteSearchQuery);
  }

  // Debounced search logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localInput.trim() !== remoteSearchQuery.trim()) {
        onRemoteSearch(localInput);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [localInput, onRemoteSearch, remoteSearchQuery]);

  // Close search popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as globalThis.Node)) {
        setIsRemoteSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsRemoteSearchOpen]);

  return (
    <header className="h-12 border-b border-slate-200 bg-white/95 backdrop-blur-md flex items-center justify-between px-4 z-10 shrink-0 print-hide">
      <div className="flex items-center gap-4 min-w-0">
        <div 
          className="flex items-center gap-2.5 shrink-0 cursor-pointer group select-none transition-transform active:scale-[0.98] duration-150" 
          onClick={onNavigateToDashboard}
        >
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-md shadow-blue-500/10 group-hover:bg-blue-700 transition-colors duration-150">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
          <span className="text-sm font-bold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors duration-150">Cerebro Empresarial</span>
        </div>

        <div className="h-4 w-px bg-slate-200/80 shrink-0" />

        {/* Breadcrumb funcional jerárquico */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 min-w-0 select-none">
          <span
            className="hover:text-blue-600 cursor-pointer shrink-0 transition-colors duration-150 font-medium"
            onClick={onNavigateToBrains}
          >
            Cerebros
          </span>
          <span className="text-slate-300/80">/</span>
          <span
            className="hover:text-blue-600 cursor-pointer shrink-0 transition-colors duration-150 font-bold text-slate-700"
            onClick={onNavigateToBrain}
            title="Ir al inicio de este cerebro"
          >
            {brainName}
          </span>
          {breadcrumbPath && renderBreadcrumbNodes()}
          {!breadcrumbPath && nodeDetail && (
            <>
              <span className="text-slate-300/80">/</span>
              <span className="font-extrabold text-slate-800 truncate max-w-[180px]">
                {nodeDetail.title}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Buscador de Cerebro */}
      <div className="relative mx-4 flex-1 max-w-sm hidden md:block" ref={containerRef}>
        <div className="relative flex items-center group/search">
          <span className="absolute left-3.5 text-slate-400 group-focus-within/search:text-blue-500 transition-colors duration-150">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar en este cerebro..."
            value={localInput}
            onChange={(e) => {
              setLocalInput(e.target.value);
              setIsRemoteSearchOpen(true);
            }}
            onFocus={() => setIsRemoteSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setIsRemoteSearchOpen(false);
              }
            }}
            className="w-full pl-9 pr-9 py-1.5 bg-slate-50/60 hover:bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all font-medium"
          />
          {localInput && (
            <Button
              onClick={() => {
                setLocalInput('');
                onRemoteSearch('');
              }}
              variant="ghost"
              size="icon"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Limpiar búsqueda"
              aria-label="Limpiar búsqueda"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          )}
        </div>

        {/* Popover de Resultados */}
        {isRemoteSearchOpen && localInput.trim().length >= 2 && (
          <div className="absolute left-0 right-0 mt-2 bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-900/5 z-50 overflow-hidden max-h-80 flex flex-col transition-all duration-150">
            {isRemoteSearching && (
              <div className="flex items-center justify-center py-8 gap-2 text-slate-400 text-xs font-semibold">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Buscando coincidencias...</span>
              </div>
            )}

            {!isRemoteSearching && remoteSearchError && (
              <div className="p-3.5 text-red-600 text-xs font-semibold bg-red-50/80 border-b border-red-100 flex items-start gap-2">
                <span className="shrink-0">⚠️</span>
                <span className="flex-1 leading-relaxed">{remoteSearchError}</span>
              </div>
            )}

            {!isRemoteSearching && !remoteSearchError && remoteSearchResults.length === 0 && (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-base shadow-2xs">
                  🔍
                </div>
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-700">No se encontraron resultados</p>
                  <p className="text-[10px] text-slate-400">Intenta con otros términos de búsqueda.</p>
                </div>
              </div>
            )}

            {!isRemoteSearching && !remoteSearchError && remoteSearchResults.length > 0 && (
              <div className="overflow-y-auto divide-y divide-slate-100/60 flex-1 pr-0.5 scrollbar-thin">
                {remoteSearchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => onSelectSearchResult(result.id)}
                    className="p-3 hover:bg-slate-50/80 active:bg-slate-100/50 cursor-pointer transition-colors duration-150 text-left flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <span className="font-bold text-xs text-slate-700 truncate hover:text-blue-600 transition-colors" title={result.title}>
                        {result.title}
                      </span>
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0 ${
                        result.matchedField === 'title' 
                          ? 'bg-blue-50 text-blue-600 border border-blue-100/60' 
                          : 'bg-amber-50 text-amber-600 border border-amber-100/60'
                      }`}>
                        {result.matchedField === 'title' ? 'Título' : 'Contenido'}
                      </span>
                    </div>
                    {result.snippet && (
                      <p className="text-[10px] text-slate-500 font-mono line-clamp-2 break-all bg-slate-50/50 hover:bg-slate-50/80 p-2 rounded-lg border border-slate-100/80 transition-colors leading-relaxed">
                        {result.snippet}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onNavigateToDashboard}
          variant="ghost"
          size="sm"
          className="text-xs font-semibold text-slate-600 hover:text-slate-800 flex items-center gap-1.5"
          leftIcon={
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          }
        >
          Dashboard
        </Button>
        <Button
          onClick={onLogout}
          variant="secondary"
          size="sm"
          className="text-xs font-semibold bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-200 hover:border-red-200 active:bg-slate-100 flex items-center gap-1.5 shadow-sm"
          leftIcon={
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
        >
          Cerrar sesión
        </Button>
      </div>
    </header>
  );
}
