import 'server-only';
import { AgentToolRegistry, AgentToolDefinition } from './types';
import { getCurrentDocument } from './getCurrentDocument';
import { getBrainTree } from './getBrainTree';
import { searchBrain } from './searchBrain';
import { getNodeById } from './getNodeById';
import { getRecentNodeVersions } from './getRecentNodeVersions';
import { webSearch } from './webSearch';
import { getAttachmentContext } from './getAttachmentContext';

// Re-export all tools and types
export * from './types';
export { getCurrentDocument } from './getCurrentDocument';
export { getBrainTree } from './getBrainTree';
export { searchBrain } from './searchBrain';
export { getNodeById } from './getNodeById';
export { getRecentNodeVersions } from './getRecentNodeVersions';
export { webSearch } from './webSearch';
export { getAttachmentContext } from './getAttachmentContext';

/**
 * Registro unificado de herramientas de lectura interna del agente.
 * Este registro mapea los identificadores de herramientas autorizadas
 * a sus correspondientes definiciones y funciones de ejecución.
 */
export const TOOL_REGISTRY: AgentToolRegistry = new Map<string, AgentToolDefinition>([
  [getCurrentDocument.name, getCurrentDocument],
  [getBrainTree.name, getBrainTree],
  [searchBrain.name, searchBrain],
  [getNodeById.name, getNodeById],
  [getRecentNodeVersions.name, getRecentNodeVersions],
  [webSearch.name, webSearch],
  [getAttachmentContext.name, getAttachmentContext],
]);
