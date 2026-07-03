'use client';

import React, { useState } from 'react';
import { NodeTreeItem, NodeStatus } from '@/types';

// Module-level variable to store the currently dragged node's ID.
// Using a module-level variable is extremely efficient as it does not trigger global re-renders
// during dragging while allowing all tree nodes to instantly validate valid target operations.
let activeDragSourceId: string | null = null;

// Helper to build a map of all nodes in the tree to efficiently find relationships (e.g., parents, descendants).
function buildNodeMap(items: NodeTreeItem[], map = new Map<string, NodeTreeItem>()): Map<string, NodeTreeItem> {
  for (const item of items) {
    map.set(item.id, item);
    if (item.children && item.children.length > 0) {
      buildNodeMap(item.children, map);
    }
  }
  return map;
}

// Helper to check if targetId is a descendant of sourceId in the tree to prevent cycle creation.
function isDescendantOf(sourceId: string, targetId: string, nodeMap: Map<string, NodeTreeItem>): boolean {
  let current = nodeMap.get(targetId);
  while (current && current.parentId) {
    if (current.parentId === sourceId) return true;
    current = nodeMap.get(current.parentId);
  }
  return false;
}

interface NodeTreeProps {
  items: NodeTreeItem[];
  selectedNodeId: string | null;
  onSelectNode: (node: NodeTreeItem) => void;
  level?: number;
  forceExpanded?: boolean;
  onMoveNode?: (nodeId: string, newParentId: string | null, newPosition: number) => void;
  canEdit?: boolean;
  nodeMap?: Map<string, NodeTreeItem>;
}

export default function NodeTree({
  items,
  selectedNodeId,
  onSelectNode,
  level = 0,
  forceExpanded = false,
  onMoveNode,
  canEdit = true,
  nodeMap,
}: NodeTreeProps) {
  const currentMap = nodeMap || (level === 0 ? buildNodeMap(items) : new Map<string, NodeTreeItem>());
  const [isRootHovered, setIsRootHovered] = useState(false);

  if (!items) return null;

  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <NodeTreeRow
          key={item.id}
          item={item}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          level={level}
          forceExpanded={forceExpanded}
          onMoveNode={onMoveNode}
          canEdit={canEdit}
          nodeMap={currentMap}
          siblings={items}
        />
      ))}

      {/* Root Drop Zone: displayed only at level 0 so that nodes can be dragged to the root level */}
      {level === 0 && items.length > 0 && canEdit && (
        <div
          onDragOver={(e) => {
            if (activeDragSourceId) {
              const lastRootItem = items[items.length - 1];
              if (lastRootItem && lastRootItem.id === activeDragSourceId) {
                return;
              }
              e.preventDefault();
              setIsRootHovered(true);
            }
          }}
          onDragLeave={() => setIsRootHovered(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsRootHovered(false);
            if (activeDragSourceId && onMoveNode) {
              onMoveNode(activeDragSourceId, null, items.length);
            }
          }}
          className={`h-8 mt-2 rounded-lg border-2 border-dashed flex items-center justify-center transition-all duration-200 ${
            isRootHovered
              ? 'border-blue-500 bg-blue-50/50 text-blue-600'
              : 'border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500 cursor-pointer'
          }`}
        >
          <span className="text-[10px] font-semibold select-none">Mover a la raíz (arrastrar aquí)</span>
        </div>
      )}
    </ul>
  );
}

interface NodeTreeRowProps {
  item: NodeTreeItem;
  selectedNodeId: string | null;
  onSelectNode: (node: NodeTreeItem) => void;
  level: number;
  forceExpanded?: boolean;
  onMoveNode?: (nodeId: string, newParentId: string | null, newPosition: number) => void;
  canEdit: boolean;
  nodeMap: Map<string, NodeTreeItem>;
  siblings: NodeTreeItem[];
}

function NodeTreeRow({
  item,
  selectedNodeId,
  onSelectNode,
  level,
  forceExpanded = false,
  onMoveNode,
  canEdit,
  nodeMap,
  siblings,
}: NodeTreeRowProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeDropZone, setActiveDropZone] = useState<'before' | 'inside' | 'after' | null>(null);

  const hasChildren = item.children && item.children.length > 0;
  const isSelected = selectedNodeId === item.id;
  const showChildren = forceExpanded || isExpanded;

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

  // Drag and Drop Event Handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!canEdit) return;
    activeDragSourceId = item.id;
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    activeDragSourceId = null;
    setActiveDropZone(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!canEdit || !activeDragSourceId) return;

    // Prevent dragging a node onto itself or inside its own descendants
    if (activeDragSourceId === item.id || isDescendantOf(activeDragSourceId, item.id, nodeMap)) {
      return;
    }

    e.preventDefault();

    // Determine the drop zone based on target row vertical thirds
    const rect = e.currentTarget.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const height = rect.height;

    let zone: 'before' | 'inside' | 'after' = 'inside';
    if (relativeY < height / 3) {
      zone = 'before';
    } else if (relativeY > (height * 2) / 3) {
      zone = 'after';
    }

    if (activeDropZone !== zone) {
      setActiveDropZone(zone);
    }
  };

  const handleDragLeave = () => {
    setActiveDropZone(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!canEdit || !activeDragSourceId) return;
    e.preventDefault();

    const sourceId = activeDragSourceId;
    activeDragSourceId = null;
    const zone = activeDropZone;
    setActiveDropZone(null);

    if (sourceId === item.id || isDescendantOf(sourceId, item.id, nodeMap)) {
      return;
    }

    if (!onMoveNode) return;

    if (zone === 'inside') {
      // Drop inside target: target becomes parent, node goes to the end of target's children
      const targetChildrenCount = item.children ? item.children.length : 0;
      onMoveNode(sourceId, item.id, targetChildrenCount);
    } else {
      // Drop before or after target: siblings re-ordered within the same parent
      const siblingsWithoutSource = siblings.filter(s => s.id !== sourceId);
      const targetIndexInFiltered = siblingsWithoutSource.findIndex(s => s.id === item.id);

      if (targetIndexInFiltered !== -1) {
        const newPos = zone === 'before' ? targetIndexInFiltered : targetIndexInFiltered + 1;
        onMoveNode(sourceId, item.parentId ?? null, newPos);
      }
    }
  };

  return (
    <li className="list-none relative">
      {/* Visual Indicator: before */}
      {activeDropZone === 'before' && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500 z-10 rounded animate-pulse" />
      )}

      <div
        draggable={canEdit}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group flex items-center justify-between py-1.5 px-2 rounded-lg transition-all duration-200 cursor-pointer ${
          isSelected
            ? 'bg-blue-50 border-l-2 border-blue-600 text-blue-700 font-semibold'
            : activeDropZone === 'inside'
            ? 'bg-blue-100/50 border-l-2 border-blue-500 text-blue-800 font-semibold'
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
            } ${showChildren && hasChildren ? 'rotate-90' : ''}`}
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
          className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold shrink-0 transition-opacity duration-200 ${getStatusColor(item.status)} ${
            isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          {getStatusLabel(item.status)}
        </span>
      </div>

      {/* Visual Indicator: after */}
      {activeDropZone === 'after' && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 z-10 rounded animate-pulse" />
      )}

      {/* Render children recursively if expanded */}
      {hasChildren && showChildren && (
        <div className="mt-0.5 border-l border-slate-200" style={{ marginLeft: `${level * 12 + 16}px` }}>
          <NodeTree
            items={item.children}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            level={level + 1}
            forceExpanded={forceExpanded}
            onMoveNode={onMoveNode}
            canEdit={canEdit}
            nodeMap={nodeMap}
          />
        </div>
      )}
    </li>
  );
}
