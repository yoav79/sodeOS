'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface BrainAttachmentItem {
  id: string;
  nodeId: string;
  nodeTitle: string;
  brainId: string;
  uploadedById: string;
  filename: string;
  contentType: string;
  size: number;
  createdAt: string;
  uploadedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  extractionStatus: string;
  extractionError: string | null;
}

interface NodeAttachmentsProps {
  brainId: string;
  nodeId: string | null;
  canEdit: boolean;
}

type FilterMode = 'all' | 'current_node';

export default function NodeAttachments({ brainId, nodeId, canEdit }: NodeAttachmentsProps) {
  const [attachments, setAttachments] = useState<BrainAttachmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    const loadAttachments = async () => {
      try {
        setLoading(true);
        setError(null);

        let url = `/api/brains/${brainId}/attachments`;
        if (filterMode === 'current_node' && nodeId) {
          url += `?nodeId=${nodeId}`;
        }

        const res = await fetch(url);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Error al cargar los archivos.');
        }
        const data = await res.json();
        if (active) {
          setAttachments(data.attachments || []);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Error desconocido al cargar archivos.';
          setError(msg);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadAttachments();

    return () => {
      active = false;
    };
  }, [brainId, nodeId, filterMode, trigger]);

  const fetchAttachments = () => {
    setTrigger((prev) => prev + 1);
  };

  const uploadSingleFile = async (file: File) => {
    if (!nodeId) {
      setUploadError('Selecciona un nodo para subir archivos.');
      return;
    }

    if (file.size === 0) {
      setUploadError('El archivo seleccionado está vacío.');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('El archivo excede el tamaño máximo permitido de 20 MB.');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/nodes/${nodeId}/attachments`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al subir el archivo.');
      }

      // Refresh list
      fetchAttachments();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error de red al subir archivo.';
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await uploadSingleFile(files[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit || !nodeId) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit || !nodeId) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    if (!canEdit || !nodeId) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await uploadSingleFile(files[0]);
    }
  };

  const handleDelete = async (id: string, filename: string) => {
    const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar el archivo "${filename}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setUploadError(null);

      const res = await fetch(`/api/attachments/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar el archivo.');
      }

      setAttachments((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar archivo.';
      alert(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getExtractionStatusBadge = (status: string): { label: string; className: string } => {
    switch (status) {
      case 'done':
        return { label: 'Listo', className: 'bg-emerald-50 text-emerald-600 border-emerald-100' };
      case 'processing':
        return { label: 'Procesando', className: 'bg-amber-50 text-amber-600 border-amber-100' };
      case 'pending':
        return { label: 'Pendiente', className: 'bg-slate-50 text-slate-500 border-slate-100' };
      case 'failed':
        return { label: 'Falló', className: 'bg-red-50 text-red-600 border-red-100' };
      case 'unsupported':
        return { label: 'No extraíble', className: 'bg-slate-50 text-slate-400 border-slate-100' };
      default:
        return { label: status, className: 'bg-slate-50 text-slate-500 border-slate-100' };
    }
  };

  const getFileColorClasses = (contentType: string): string => {
    if (contentType === 'application/pdf') {
      return 'bg-red-50 border-red-100 text-red-600';
    }
    if (contentType.includes('word') || contentType.includes('office-officedocument.wordprocessingml')) {
      return 'bg-blue-50 border-blue-100 text-blue-600';
    }
    if (contentType.includes('excel') || contentType.includes('office-officedocument.spreadsheetml')) {
      return 'bg-emerald-50 border-emerald-100 text-emerald-600';
    }
    if (contentType.includes('presentation') || contentType.includes('office-officedocument.presentationml')) {
      return 'bg-orange-50 border-orange-100 text-orange-600';
    }
    if (contentType.startsWith('text/') || contentType === 'text/markdown' || contentType === 'text/plain') {
      return 'bg-cyan-50 border-cyan-100 text-cyan-600';
    }
    return 'bg-slate-50 border-slate-200/80 text-slate-500';
  };

  const getFileIconSvg = (contentType: string) => {
    if (contentType === 'application/pdf') {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    if (contentType.includes('word') || contentType.includes('office-officedocument.wordprocessingml')) {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      );
    }
    if (contentType.includes('excel') || contentType.includes('office-officedocument.spreadsheetml')) {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    if (contentType.includes('presentation') || contentType.includes('office-officedocument.presentationml')) {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8M12 17v4m-9-4h18V5H3v12z" />
        </svg>
      );
    }
    if (contentType.startsWith('text/') || contentType === 'text/markdown' || contentType === 'text/plain') {
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with filter */}
      <div className="flex items-center justify-between pb-1 px-1">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Archivos del cerebro
        </h4>
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5 border border-slate-200/50 font-mono">
          {attachments.length}
        </span>
      </div>

      {/* Filter toggle */}
      {nodeId && (
        <div className="flex gap-1 p-0.5 bg-slate-100 rounded-lg border border-slate-200/50">
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`flex-1 text-[10px] font-semibold py-1.5 px-2 rounded-md transition-all ${
              filterMode === 'all'
                ? 'bg-white text-slate-700 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Todos los archivos
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('current_node')}
            className={`flex-1 text-[10px] font-semibold py-1.5 px-2 rounded-md transition-all ${
              filterMode === 'current_node'
                ? 'bg-white text-slate-700 shadow-xs border border-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Subidos desde este nodo
          </button>
        </div>
      )}

      {/* Upload Zone (Drag & Drop) - only when nodeId is available */}
      {canEdit && nodeId && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-5 text-center transition-all duration-200 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/40 shadow-xs'
              : 'border-slate-200 hover:border-slate-300 bg-slate-50/25'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id="file-upload-input"
          />
          <label
            htmlFor="file-upload-input"
            className="cursor-pointer flex flex-col items-center justify-center gap-2.5 select-none"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2 py-1">
                <div className="w-5 h-5 border border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[11px] font-semibold text-blue-600">Subiendo archivo...</span>
              </div>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-slate-200/60 shadow-xs text-slate-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[11px] font-semibold text-slate-700">
                    Arrastra archivos aquí o <span className="text-blue-600 hover:underline">haz clic para seleccionar</span>
                  </p>
                  <p className="text-[9px] text-slate-400">
                    El archivo se subirá al cerebro usando el nodo actual como origen. Formatos: imágenes, PDF, textos. Máx. 20 MB
                  </p>
                </div>
              </>
            )}
          </label>
        </div>
      )}

      {/* No nodeId message */}
      {canEdit && !nodeId && (
        <div className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200/60 rounded-xl p-3 text-center">
          Selecciona un documento para subir archivos al cerebro.
        </div>
      )}

      {/* Errors */}
      {uploadError && (
        <div className="text-[10px] text-red-700 bg-red-50 border border-red-100 rounded-xl p-2.5 font-medium">
          {uploadError}
        </div>
      )}

      {/* Main List Area */}
      {loading ? (
        <div className="flex items-center justify-center py-6 gap-2 text-xs text-slate-400">
          <div className="w-4 h-4 border border-slate-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Cargando archivos...</span>
        </div>
      ) : error ? (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 font-semibold space-y-2">
          <p>Error: {error}</p>
          <button
            type="button"
            onClick={fetchAttachments}
            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : attachments.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-3 bg-white border border-slate-200/60 rounded-2xl">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200/60 shadow-xs">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-600">
              {filterMode === 'current_node' ? 'Sin archivos en este nodo' : 'Sin archivos en el cerebro'}
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto leading-relaxed">
              {filterMode === 'current_node'
                ? 'No hay archivos subidos desde este documento.'
                : 'Sube imágenes o documentos para empezar a construir la biblioteca del cerebro.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {attachments.map((item) => {
            const isImage = item.contentType.startsWith('image/');
            const isInline = isImage || item.contentType === 'application/pdf' || item.contentType.startsWith('text/');
            const isDeleting = deletingId === item.id;
            const extractionBadge = getExtractionStatusBadge(item.extractionStatus);

            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200/80 rounded-xl p-3.5 space-y-3 hover:border-slate-300 transition-colors"
              >
                {/* Block superior: Preview/Icono a la izquierda, Metadata a la derecha */}
                <div className="flex gap-3 items-start min-w-0">
                  {/* Thumbnail or Icon */}
                  {isImage ? (
                    <div className="w-24 h-16 rounded-lg overflow-hidden border border-slate-200/60 bg-slate-50 shrink-0 shadow-2xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/attachments/${item.id}/download`}
                        alt={item.filename}
                        loading="lazy"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const span = document.createElement('span');
                            span.className = 'w-full h-full flex items-center justify-center text-lg select-none';
                            span.innerText = '🖼️';
                            parent.appendChild(span);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className={`w-24 h-16 rounded-lg flex items-center justify-center border shrink-0 shadow-2xs ${getFileColorClasses(item.contentType)}`}>
                      {getFileIconSvg(item.contentType)}
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-bold text-slate-700 truncate" title={item.filename}>
                      {item.filename}
                    </p>
                    
                    {/* Size, Content Type, and Extraction Status */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[9px] text-slate-400 font-semibold">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200/30 text-[8px] font-bold text-slate-500 uppercase tracking-wide">
                        {item.contentType.split('/')[1] || 'FILE'}
                      </span>
                      <span>·</span>
                      <span>{formatBytes(item.size)}</span>
                      <span>·</span>
                      <span className={`px-1.5 py-0.2 rounded border text-[8px] font-bold ${extractionBadge.className}`}>
                        {extractionBadge.label}
                      </span>
                    </div>

                    {/* Node origin */}
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-medium">
                      <svg className="w-3 h-3 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      <span className="truncate" title={item.nodeTitle}>
                        Subido desde: {item.nodeTitle}
                      </span>
                    </div>

                    {/* Uploader & Date */}
                    <div className="flex items-center gap-3 text-[9px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1 min-w-0">
                        <svg className="w-3 h-3 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="truncate" title={item.uploadedBy?.name || item.uploadedBy?.email}>
                          {item.uploadedBy?.name || 'Usuario'}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 shrink-0 font-mono">
                        <svg className="w-3 h-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                          {new Date(item.createdAt).toLocaleDateString('es-ES', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Toolbar inferior: Botones de acciones en grid */}
                <div className={`grid gap-2 pt-2.5 border-t border-slate-100 ${isInline && canEdit ? 'grid-cols-3' : isInline || canEdit ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {/* Vista previa */}
                  {isInline && (
                    <a
                      href={`/api/attachments/${item.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100/60 hover:bg-blue-100/90 transition-colors"
                      title="Vista previa"
                      aria-label={`Vista previa de ${item.filename}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Ver</span>
                    </a>
                  )}

                  {/* Descargar */}
                  <a
                    href={`/api/attachments/${item.id}/download`}
                    download={item.filename}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/60 hover:bg-indigo-100/90 transition-colors"
                    title="Descargar"
                    aria-label={`Descargar ${item.filename}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <span>Descargar</span>
                  </a>

                  {/* Eliminar */}
                  {canEdit && (
                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={() => handleDelete(item.id, item.filename)}
                      className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-bold text-red-600 bg-red-50 border border-red-100/60 hover:bg-red-100/90 transition-colors disabled:opacity-40"
                      title="Eliminar"
                      aria-label={`Eliminar ${item.filename}`}
                    >
                      {isDeleting ? (
                        <>
                          <span className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin shrink-0"></span>
                          <span>Borrando...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Eliminar</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
