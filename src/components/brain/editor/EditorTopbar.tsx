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
            <span className="text-slate-300">/</span>
            {isLast ? (
              <span className="font-semibold text-slate-800 truncate max-w-[180px]">{node.title}</span>
            ) : (
              <span
                onClick={() => onSelectNode(node.id)}
                className="hover:text-blue-600 cursor-pointer shrink-0 transition-colors font-medium truncate max-w-[120px]"
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
        <span className="text-slate-300">/</span>
        <span
          onClick={() => onSelectNode(firstNode.id)}
          className="hover:text-blue-600 cursor-pointer shrink-0 transition-colors font-medium truncate max-w-[120px]"
        >
          {firstNode.title}
        </span>

        {/* Separador colapsado */}
        <span className="text-slate-300">/</span>
        <span className="text-slate-400 px-1 font-medium cursor-default" title="Segmentos intermedios ocultados">
          &hellip;
        </span>

        {/* Penúltimo nodo */}
        <span className="text-slate-300">/</span>
        <span
          onClick={() => onSelectNode(penultimateNode.id)}
          className="hover:text-blue-600 cursor-pointer shrink-0 transition-colors font-medium truncate max-w-[120px]"
        >
          {penultimateNode.title}
        </span>

        {/* Nodo actual */}
        <span className="text-slate-300">/</span>
        <span className="font-semibold text-slate-800 truncate max-w-[180px]">
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
    <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 z-10 shrink-0 print-hide">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={onNavigateToDashboard}>
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-md shadow-blue-500/10">
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
          <span className="text-sm font-bold text-slate-800 tracking-tight">Cerebro Empresarial</span>
        </div>

        <div className="h-4 w-px bg-slate-200 shrink-0" />

        {/* Breadcrumb funcional jerárquico */}
        <nav className="flex items-center gap-1.5 text-xs text-slate-500 min-w-0">
          <span
            className="hover:text-blue-600 cursor-pointer shrink-0 transition-colors"
            onClick={onNavigateToBrains}
          >
            Cerebros
          </span>
          <span className="text-slate-300">/</span>
          <span
            className="hover:text-blue-600 cursor-pointer shrink-0 transition-colors font-medium truncate max-w-[120px] text-slate-700"
            onClick={onNavigateToBrain}
            title="Ir al inicio de este cerebro"
          >
            {brainName}
          </span>
          {breadcrumbPath && renderBreadcrumbNodes()}
          {!breadcrumbPath && nodeDetail && (
            <>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800 truncate max-w-[180px]">
                {nodeDetail.title}
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Buscador de Cerebro */}
      <div className="relative mx-4 flex-1 max-w-sm hidden md:block" ref={containerRef}>
        <div className="relative flex items-center">
          <span className="absolute left-3 text-slate-400">
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
            className="w-full pl-9 pr-8 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
          />
          {localInput && (
            <button
              onClick={() => {
                setLocalInput('');
                onRemoteSearch('');
              }}
              className="absolute right-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Limpiar búsqueda"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Popover de Resultados */}
        {isRemoteSearchOpen && localInput.trim().length >= 2 && (
          <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-80 flex flex-col">
            {isRemoteSearching && (
              <div className="flex items-center justify-center py-6 gap-2 text-slate-500 text-xs">
                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span>Buscando coincidencias...</span>
              </div>
            )}

            {!isRemoteSearching && remoteSearchError && (
              <div className="p-3 text-red-600 text-xs font-medium bg-red-50 border-b border-slate-100">
                ⚠️ {remoteSearchError}
              </div>
            )}

            {!isRemoteSearching && !remoteSearchError && remoteSearchResults.length === 0 && (
              <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-1">
                <span className="text-lg">🔍</span>
                <span className="font-semibold text-slate-600">No se encontraron resultados</span>
                <span className="text-[10px] text-slate-400">Intenta con otros términos de búsqueda.</span>
              </div>
            )}

            {!isRemoteSearching && !remoteSearchError && remoteSearchResults.length > 0 && (
              <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                {remoteSearchResults.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => onSelectSearchResult(result.id)}
                    className="p-3 hover:bg-slate-50 cursor-pointer transition-colors text-left"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-slate-800 truncate">{result.title}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        result.matchedField === 'title' 
                          ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {result.matchedField === 'title' ? 'Título' : 'Contenido'}
                      </span>
                    </div>
                    {result.snippet && (
                      <p className="text-[10px] text-slate-500 mt-1 font-mono line-clamp-2 break-all bg-slate-50/50 p-1.5 rounded-md border border-slate-100">
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
