'use client';

import React from 'react';
import { NodeTreeItem, Node } from '@/types';

interface EditorTopbarProps {
  brainName: string;
  breadcrumbPath: NodeTreeItem[] | null;
  nodeDetail: Node | null;
  onSelectNode: (id: string) => void;
  onNavigateToBrains: () => void;
  onNavigateToBrain: () => void;
  onNavigateToDashboard: () => void;
  onLogout: () => void;
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

  return (
    <header className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 z-10 shrink-0">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={onNavigateToDashboard}>
          <div className="bg-blue-600 p-1.5 rounded-lg shadow-md shadow-blue-500/10">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <span className="text-xs font-bold text-slate-800 tracking-tight">Cerebro Empresarial</span>
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

      <div className="flex items-center gap-2">
        <button
          onClick={onNavigateToDashboard}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors flex items-center gap-1"
        >
          ← Dashboard
        </button>
        <button
          onClick={onLogout}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}
