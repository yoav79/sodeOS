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
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'draft':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      case 'needs_review':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'archived':
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
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
            ? 'bg-blue-500/10 border-l-2 border-blue-500 text-blue-400 font-medium'
            : 'hover:bg-zinc-800/50 text-zinc-300 hover:text-zinc-100 border-l-2 border-transparent'
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
            className={`p-1 rounded hover:bg-zinc-700/50 transition-transform duration-200 ${
              !hasChildren ? 'opacity-0 cursor-default' : 'opacity-70 hover:opacity-100'
            } ${isExpanded && hasChildren ? 'rotate-90' : ''}`}
          >
            <svg
              className="w-3 h-3 fill-current text-zinc-400"
              viewBox="0 0 24 24"
            >
              <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
            </svg>
          </button>

          {/* Node Icon */}
          <svg
            className={`w-4 h-4 shrink-0 ${
              isSelected ? 'text-blue-400' : 'text-zinc-500 group-hover:text-zinc-400'
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
          className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold tracking-wider shrink-0 transition-opacity duration-200 opacity-80 group-hover:opacity-100 ${getStatusColor(
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
