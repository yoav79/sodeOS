import 'server-only';
import crypto from 'crypto';
import { TOOL_REGISTRY, AgentToolContext } from '../tools';
import {
  AgentRunResult,
  AgentRunStepResult,
  AgentObservation,
  AgentRunStatus,
  MAX_AGENT_RUN_EXECUTABLE_STEPS,
  MAX_AGENT_RUN_OBSERVATIONS,
  MAX_AGENT_RUN_OBSERVATION_CHARS,
} from './types';
import { AgentPlan, AgentToolName } from '../types';

const ALLOWED_RUN_TOOLS = new Set<AgentToolName>([
  'getCurrentDocument',
  'getBrainTree',
  'searchBrain',
  'getNodeById',
  'getRecentNodeVersions',
  'webSearch',
  'getAttachmentContext',
]);

function resolveToolInput(
  toolName: AgentToolName,
  stepNumber: number,
  inputsMap: Record<string | number, Record<string, unknown>> | undefined,
  ctx: AgentToolContext,
  userQuery: string
): unknown {
  const stepInput = inputsMap?.[stepNumber] || inputsMap?.[String(stepNumber)];

  switch (toolName) {
    case 'getCurrentDocument':
    case 'getBrainTree':
      return undefined;

    case 'searchBrain': {
      let query = '';
      if (stepInput && typeof stepInput.query === 'string') {
        query = stepInput.query;
      } else {
        query = userQuery;
      }
      query = query.trim().slice(0, 100); // limit to 100 chars (MAX_TOOL_SEARCH_QUERY_LENGTH)

      let limit = 10;
      if (stepInput && typeof stepInput.limit === 'number' && !isNaN(stepInput.limit)) {
        limit = Math.min(Math.max(1, stepInput.limit), 10);
      }
      return { query, limit };
    }

    case 'webSearch': {
      let query = '';
      if (stepInput && typeof stepInput.query === 'string') {
        query = stepInput.query;
      } else {
        query = userQuery;
      }
      query = query.trim().slice(0, 200); // limit to 200 chars for webSearch query (strict privacy)

      let maxResults = 5;
      if (stepInput && typeof stepInput.maxResults === 'number' && !isNaN(stepInput.maxResults)) {
        maxResults = Math.min(Math.max(1, stepInput.maxResults), 5);
      }
      return { query, maxResults };
    }

    case 'getAttachmentContext': {
      let query: string | undefined = undefined;
      if (stepInput && typeof stepInput.query === 'string') {
        query = stepInput.query.trim().slice(0, 200);
      }

      let maxFiles = 3;
      if (stepInput && typeof stepInput.maxFiles === 'number' && !isNaN(stepInput.maxFiles)) {
        maxFiles = Math.min(Math.max(1, stepInput.maxFiles), 5);
      }

      let maxChunksPerFile = 2;
      if (stepInput && typeof stepInput.maxChunksPerFile === 'number' && !isNaN(stepInput.maxChunksPerFile)) {
        maxChunksPerFile = Math.min(Math.max(1, stepInput.maxChunksPerFile), 5);
      }

      let maxTotalChars = 3000;
      if (stepInput && typeof stepInput.maxTotalChars === 'number' && !isNaN(stepInput.maxTotalChars)) {
        maxTotalChars = Math.min(Math.max(100, stepInput.maxTotalChars), 5000);
      }

      return { query, maxFiles, maxChunksPerFile, maxTotalChars };
    }

    case 'getNodeById': {
      let nodeId = ctx.nodeId;
      if (stepInput && typeof stepInput.nodeId === 'string' && stepInput.nodeId.trim() !== '') {
        nodeId = stepInput.nodeId.trim();
      }
      return { nodeId };
    }

    case 'getRecentNodeVersions': {
      let nodeId = ctx.nodeId;
      if (stepInput && typeof stepInput.nodeId === 'string' && stepInput.nodeId.trim() !== '') {
        nodeId = stepInput.nodeId.trim();
      }
      let limit = 5;
      if (stepInput && typeof stepInput.limit === 'number' && !isNaN(stepInput.limit)) {
        limit = Math.min(Math.max(1, stepInput.limit), 5);
      }
      return { nodeId, limit };
    }

    default:
      return undefined;
  }
}

export async function executeAgentPlan(
  ctx: AgentToolContext,
  approvedPlan: AgentPlan,
  userQuery: string,
  inputsMap?: Record<string | number, Record<string, unknown>>
): Promise<AgentRunResult> {
  const runId = crypto.randomUUID();
  const stepResults: AgentRunStepResult[] = [];
  const observations: AgentObservation[] = [];
  const globalWarnings: string[] = [];

  let executedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let accumulatedChars = 0;

  for (const step of approvedPlan.steps) {
    const { stepNumber, description, estimatedTool } = step;

    // 0. Skip execution of steps that do not require any tool
    if (estimatedTool === 'none') {
      stepResults.push({
        stepNumber,
        description,
        estimatedTool,
        status: 'executed',
        observation: {
          stepNumber,
          toolName: 'none',
          ok: true,
          data: { message: 'No se requiere ejecución de herramienta para este paso.' }
        }
      });
      executedCount++;
      continue;
    }

    // 1. Check if tool is supported in allowlist
    if (!ALLOWED_RUN_TOOLS.has(estimatedTool) || !TOOL_REGISTRY.has(estimatedTool)) {
      stepResults.push({
        stepNumber,
        description,
        estimatedTool,
        status: 'skipped',
        skippedReason: 'unsupported_tool',
      });
      skippedCount++;
      continue;
    }

    // 2. Check executable steps limit
    if (executedCount >= MAX_AGENT_RUN_EXECUTABLE_STEPS) {
      stepResults.push({
        stepNumber,
        description,
        estimatedTool,
        status: 'skipped',
        skippedReason: 'max_steps_limit',
      });
      skippedCount++;
      continue;
    }

    // 3. Resolve tool input safely
    let toolInput: unknown;
    try {
      toolInput = resolveToolInput(estimatedTool, stepNumber, inputsMap, ctx, userQuery);
    } catch (err) {
      failedCount++;
      const errorMessage = err instanceof Error ? err.message : 'Error al mapear parámetros del paso.';
      const errorObservation: AgentObservation = {
        stepNumber,
        toolName: estimatedTool,
        ok: false,
        errorCode: 'VALIDATION_ERROR',
        errorMessage,
      };

      stepResults.push({
        stepNumber,
        description,
        estimatedTool,
        status: 'failed',
        observation: errorObservation,
      });

      if (observations.length < MAX_AGENT_RUN_OBSERVATIONS) {
        observations.push(errorObservation);
      }
      continue;
    }

    // 4. Execute the tool
    const tool = TOOL_REGISTRY.get(estimatedTool)!;
    try {
      const response = await tool.execute(ctx, toolInput);

      if (response.ok) {
        executedCount++;

        let dataToSave = response.data;
        let isTruncatedByRunLimit = false;
        const warnings = response.warnings ? [...response.warnings] : [];

        // Check if adding this observation exceeds character limit
        const dataString = JSON.stringify(dataToSave || '');
        if (accumulatedChars + dataString.length > MAX_AGENT_RUN_OBSERVATION_CHARS) {
          isTruncatedByRunLimit = true;
          dataToSave = {
            truncated: true,
            message: 'Observation truncated by run limit',
          };
          warnings.push('Observación truncada por superar el límite acumulado de caracteres del run.');
          globalWarnings.push(`El paso ${stepNumber} (${estimatedTool}) fue truncado para evitar exceder el límite global.`);
        }

        const currentObservationLength = JSON.stringify(dataToSave || '').length;
        accumulatedChars += currentObservationLength;

        const observation: AgentObservation = {
          stepNumber,
          toolName: estimatedTool,
          ok: true,
          data: dataToSave,
          warnings: warnings.length > 0 ? warnings : undefined,
          meta: {
            ...response.meta,
            charCount: currentObservationLength,
            truncated: response.meta?.truncated || isTruncatedByRunLimit,
          },
        };

        stepResults.push({
          stepNumber,
          description,
          estimatedTool,
          status: 'executed',
          observation,
        });

        if (observations.length < MAX_AGENT_RUN_OBSERVATIONS) {
          observations.push(observation);
        } else {
          globalWarnings.push(
            `La observación del paso ${stepNumber} no se guardó porque se alcanzó el límite máximo de ${MAX_AGENT_RUN_OBSERVATIONS} observaciones.`
          );
        }
      } else {
        // Controlled error from tool
        failedCount++;
        const errorObservation: AgentObservation = {
          stepNumber,
          toolName: estimatedTool,
          ok: false,
          errorCode: response.code,
          errorMessage: response.message,
        };

        stepResults.push({
          stepNumber,
          description,
          estimatedTool,
          status: 'failed',
          observation: errorObservation,
        });

        if (observations.length < MAX_AGENT_RUN_OBSERVATIONS) {
          observations.push(errorObservation);
        }
      }
    } catch (err) {
      // Uncontrolled exception during tool execution
      failedCount++;
      const errorMessage = err instanceof Error ? err.message : 'Error inesperado durante la ejecución de la herramienta.';
      const errorObservation: AgentObservation = {
        stepNumber,
        toolName: estimatedTool,
        ok: false,
        errorCode: 'INTERNAL_ERROR',
        errorMessage,
      };

      stepResults.push({
        stepNumber,
        description,
        estimatedTool,
        status: 'failed',
        observation: errorObservation,
      });

      if (observations.length < MAX_AGENT_RUN_OBSERVATIONS) {
        observations.push(errorObservation);
      }
    }
  }

  // Determine global run status
  let status: AgentRunStatus = 'success';
  if (failedCount > 0) {
    status = executedCount > 0 ? 'partial_success' : 'failed';
  }

  return {
    runId,
    status,
    steps: stepResults,
    observations,
    summary: {
      totalSteps: approvedPlan.steps.length,
      executedSteps: executedCount,
      skippedSteps: skippedCount,
      failedSteps: failedCount,
      totalChars: accumulatedChars,
    },
    warnings: globalWarnings.length > 0 ? globalWarnings : undefined,
  };
}
