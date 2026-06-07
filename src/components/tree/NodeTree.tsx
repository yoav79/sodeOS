'use client';

import React, { useState } from 'react';
import { NodeTreeItem, NodeStatus } from '@/types';

interface NodeTreeProps {
  items: NodeTreeItem[];
  selectedNodeId: string | null;
  onSelectNode: (node: NodeTreeItem) => void;
  level?: number;
}

export default function NodeTree({
  items,
  selectedNodeId,
  onSelectNode,
  level = 0,
}: NodeTreeProps) {
  if (!items || items.length === 0) return null;

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <NodeTreeRow
          key={item.id}
          item={item}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          level={level}
        />
      ))}
    </ul>
  );
}

interface NodeTreeRowProps {
  item: NodeTreeItem;
  selectedNodeId: string | null;
  onSelectNode: (node: NodeTreeItem) => void;
  level: number;
}

function NodeTreeRow({
  item,
  selectedNodeId,
  onSelectNode,
  level,
}: NodeTreeRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = item.children && item.children.length > 0;
  const isSelected = selectedNodeId === item.id;

  const getStatusColor = (status: NodeStatus) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'draft':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'needs_review':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'archived':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getStatusLabel = (status: NodeStatus) => {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'draft':
        return 'Borrador';
      case 'needs_review':
        return 'En revisión';
      case 'archived':
        return 'Archivado';
      default:
        return status;
    }
  };

  return (
    <li className="list-none">
      <div
        className={`group flex items-center justify-between py-1.5 px-2 rounded-lg transition-all duration-200 cursor-pointer ${
          isSelected
            ? 'bg-blue-50 border-l-2 border-blue-600 text-blue-700 font-semibold'
            : 'hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-l-2 border-transparent'
        }`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={() => onSelectNode(item)}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Arrow click = expand/collapse */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevents selection
              setIsExpanded(!isExpanded);
            }}
            disabled={!hasChildren}
            className={`p-1 rounded hover:bg-slate-200 transition-transform duration-200 ${
              !hasChildren ? 'opacity-0 cursor-default' : 'opacity-70 hover:opacity-100'
            } ${isExpanded && hasChildren ? 'rotate-90' : ''}`}
          >
            <svg
              className="w-3 h-3 fill-current text-slate-400 group-hover:text-slate-600"
              viewBox="0 0 24 24"
            >
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </button>

          {/* Node Icon */}
          <svg
            className={`w-4 h-4 shrink-0 ${
              isSelected ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {hasChildren ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            )}
          </svg>

          {/* Node Title */}
          <span className="truncate text-sm">{item.title}</span>
        </div>

        {/* Status Badge */}
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0 transition-opacity duration-200 ${getStatusColor(
            item.status
          )}`}
        >
          {getStatusLabel(item.status)}
        </span>
      </div>

      {/* Render children recursively if expanded */}
      {hasChildren && isExpanded && (
        <div className="mt-0.5">
          <NodeTree
            items={item.children}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            level={level + 1}
          />
        </div>
      )}
    </li>
  );
}
