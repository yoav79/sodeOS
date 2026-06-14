'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface NodeAttachmentItem {
  id: string;
  nodeId: string;
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
}

interface NodeAttachmentsProps {
  nodeId: string;
  canEdit: boolean;
}

export default function NodeAttachments({ nodeId, canEdit }: NodeAttachmentsProps) {
  const [attachments, setAttachments] = useState<NodeAttachmentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    const loadAttachments = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/nodes/${nodeId}/attachments`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Error al cargar los adjuntos.');
        }
        const data = await res.json();
        if (active) {
          setAttachments(data.attachments || []);
        }
      } catch (err: unknown) {
        if (active) {
          const msg = err instanceof Error ? err.message : 'Error desconocido al cargar adjuntos.';
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
  }, [nodeId, trigger]);

  const fetchAttachments = () => {
    setTrigger((prev) => prev + 1);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    // Basic local client validation
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

      // Add to list and clear input
      setAttachments((prev) => [data.attachment, ...prev]);
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

  const handleDelete = async (id: string, filename: string) => {
    const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar el adjunto "${filename}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setUploadError(null); // Clear previous upload errors

      const res = await fetch(`/api/attachments/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Error al eliminar el adjunto.');
      }

      setAttachments((prev) => prev.filter((item) => item.id !== id));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al eliminar adjunto.';
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

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType === 'application/pdf') return '📕';
    if (contentType.includes('word') || contentType.includes('office-officedocument.wordprocessingml')) return '📘';
    if (contentType.includes('excel') || contentType.includes('office-officedocument.spreadsheetml')) return '📗';
    if (contentType.includes('presentation') || contentType.includes('office-officedocument.presentationml')) return '📙';
    if (contentType.startsWith('text/')) return '📝';
    return '📄';
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm space-y-3">
      {/* Title with Badge Counter */}
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <span>Adjuntos</span>
          {!loading && !error && (
            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded-full text-[9px] font-bold">
              {attachments.length}
            </span>
          )}
        </h4>
        
        {/* Upload Button Trigger */}
        {canEdit && (
          <label className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 cursor-pointer select-none">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            {uploading ? (
              <>
                <span className="w-2.5 h-2.5 border border-blue-600 border-t-transparent rounded-full animate-spin"></span>
                <span>Subiendo...</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Subir archivo</span>
              </>
            )}
          </label>
        )}
      </div>

      {/* Errors */}
      {uploadError && (
        <div className="text-[10px] text-red-700 bg-red-50 border border-red-100 rounded-lg p-2 font-medium">
          ⚠️ {uploadError}
        </div>
      )}

      {/* Main List Area */}
      {loading ? (
        <div className="flex items-center justify-center py-4 gap-1.5 text-[11px] text-slate-400">
          <div className="w-3.5 h-3.5 border border-slate-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Cargando adjuntos...</span>
        </div>
      ) : error ? (
        <div className="text-[11px] text-red-700 bg-red-50 border border-red-100 rounded-lg p-2.5 font-medium space-y-2">
          <p>⚠️ Error: {error}</p>
          <button
            type="button"
            onClick={fetchAttachments}
            className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline transition-colors"
          >
            Reintentar
          </button>
        </div>
      ) : attachments.length === 0 ? (
        <p className="text-[11px] text-slate-400 italic text-center py-2">
          Sin adjuntos para este nodo
        </p>
      ) : (
        <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
          {attachments.map((item) => (
            <div key={item.id} className="py-2 first:pt-0 last:pb-0 flex items-start gap-2 text-xs">
              {/* File Icon */}
              <span className="text-sm select-none mt-0.5">{getFileIcon(item.contentType)}</span>
              
              {/* File details */}
              <div className="flex-1 min-w-0">
                <a
                  href={`/api/attachments/${item.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-slate-700 hover:text-blue-600 transition-colors block truncate"
                  title={`Descargar ${item.filename}`}
                >
                  {item.filename}
                </a>
                <div className="flex items-center gap-1.5 text-[9px] text-slate-400 mt-0.5">
                  <span>{formatBytes(item.size)}</span>
                  <span>•</span>
                  <span className="truncate max-w-[80px]" title={item.uploadedBy?.name || item.uploadedBy?.email}>
                    {item.uploadedBy?.name || 'Usuario'}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(item.createdAt).toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 shrink-0 self-center">
                {/* Download */}
                <a
                  href={`/api/attachments/${item.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-slate-50"
                  title="Descargar"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
                
                {/* Delete */}
                {canEdit && (
                  <button
                    type="button"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item.id, item.filename)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-slate-50 disabled:opacity-40"
                    title="Eliminar"
                  >
                    {deletingId === item.id ? (
                      <span className="w-3.5 h-3.5 border border-red-600 border-t-transparent rounded-full animate-spin block"></span>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
