import fs from 'fs';
import path from 'path';

// 1. Cargar variables de entorno locales de forma segura
const projectRoot = path.join(__dirname, '../..');
const envPaths = [
  path.join(projectRoot, '.env.local'),
  path.join(projectRoot, '.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  }
}

// 2. Importar módulos del RAG
import db from '../../src/lib/db';
import { classifyQueryIntent } from '../../src/lib/ai/brain-query/intent';
import { resolveQueryScope } from '../../src/lib/ai/brain-query/scope';
import { getBrainQueryContext } from '../../src/lib/ai/brain-query/context';
import { runBrainQuery } from '../../src/lib/ai/brain-query/service';

async function main() {
  console.log('=== Cerebro Empresarial (sodeOS) - QA Brain Query Baseline ===\n');

  // Obtener brainId de los argumentos o variables de entorno
  const brainId = process.env.BRAIN_QUERY_QA_BRAIN_ID || process.argv[2];

  if (!brainId) {
    console.error('ERROR: El "brainId" no está configurado.');
    console.log('\nInstrucciones de uso:');
    console.log('Opción A: Pasarlo como variable de entorno:');
    console.log('  BRAIN_QUERY_QA_BRAIN_ID="uuid-del-brain" npx tsx scripts/qa/brain-query-baseline.ts');
    console.log('Opción B: Pasarlo como argumento CLI:');
    console.log('  npx tsx scripts/qa/brain-query-baseline.ts "uuid-del-brain"');
    console.log('\nSaliendo de forma segura.');
    process.exit(0);
  }

  console.log(`Usando Brain ID: ${brainId}`);
  const callLlm = process.env.BRAIN_QUERY_QA_CALL_LLM === '1';
  console.log(`Llamar al proveedor de IA: ${callLlm ? 'SÍ (Consumirá tokens)' : 'NO (Solo pruebas de contexto)'}\n`);

  // Definición de casos de prueba mínimos
  const qaCases = [
    { query: 'cuantas letras, paginas e informacion tenemos del reporte de miami' },
    { query: 'cuantas paginas tiene el reporte de miami' },
    { query: 'cuantos caracteres tiene Reporte Miami.docx' },
    { query: 'qué dice sobre reembolsos?' },
    { query: 'qué fuentes consultadas hay en el documento testIA?' },
    { query: 'qué fuentes consultadas hay en el documento test IA?' },
    { query: 'cuantos documentos, nodos y subnodos componen este cerebro' },
    { query: 'cuál es el índice del documento test IA?' },
    { query: 'resúmeme el documento test IA' }
  ];

  for (let i = 0; i < qaCases.length; i++) {
    const { query } = qaCases[i];
    console.log(`\n------------------------------------------------------------`);
    console.log(`Caso ${i + 1}: "${query}"`);
    console.log(`------------------------------------------------------------`);

    try {
      // Intent y Scope locales
      const intent = classifyQueryIntent(query);
      const scope = await resolveQueryScope({ brainId, query });

      console.log(`- Intent Detectado: ${intent}`);
      console.log(`- Scope Resuelto:`);
      console.log(`  * Tipo: ${scope.type}`);
      console.log(`  * Target: ${scope.document ? `${scope.document.kind} (ID: ${scope.document.id}, Name: ${scope.document.filename || scope.document.title})` : 'ninguno'}`);
      console.log(`  * Ambiguo: ${scope.ambiguous}`);
      console.log(`  * Warnings Scope:`, scope.warnings);

      // Obtener Contexto
      const contextRes = await getBrainQueryContext({ brainId, query });
      console.log(`- Cantidad de Sources: ${contextRes.sources.length}`);
      console.log(`- Sources Principales:`, contextRes.sources.map(s => `${s.type}: ${s.filename || s.title || s.id}`));
      console.log(`- Warnings Contexto:`, contextRes.warnings);
      console.log(`- Longitud de ContextText: ${contextRes.contextText.length} caracteres`);

      // Determinar si parece una resolución estructurada/determinista o RAG normal
      let resolvedType = 'RAG normal (Búsqueda semántica / Fallback)';
      if (contextRes.contextText.includes('Metadata disponible')) {
        resolvedType = 'Estructurada (Metadata)';
      } else if (contextRes.contextText.includes('Estructura de nodos') || contextRes.contextText.includes('Inventario de documentos')) {
        resolvedType = 'Estructurada (Estructura/Jerarquía)';
      } else if (intent === 'document_outline' && contextRes.contextText.includes('Sección solicitada') || contextRes.contextText.includes('Documento solicitado')) {
        resolvedType = 'Estructurada (Outline/Estructura)';
      } else if (intent === 'source_request') {
        resolvedType = 'Estructurada (Sources/Fuentes)';
      }
      console.log(`- Tipo de Resolución Estimada: ${resolvedType}`);

      // Validar si el documento solicitado existe o si los resultados están vacíos (SKIPPED/WARNING)
      if (contextRes.sources.length === 0 && (scope.document || query.includes('reporte') || query.includes('test IA') || query.includes('testIA'))) {
        console.log(`\n[WARNING/SKIPPED]: El documento referenciado en la consulta no fue encontrado en base de datos.`);
      }

      // Llamada opcional al LLM
      if (callLlm) {
        console.log(`- Llamando a runBrainQuery (LLM)...`);
        const response = await runBrainQuery({ brainId, query });
        if (response.success) {
          console.log(`- Respuesta de IA:\n${response.answer}`);
        } else {
          console.error(`- Error en runBrainQuery:`, response.error);
        }
      }

    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`- ERROR procesando caso:`, errMsg);
    }
  }

  console.log('\n============================================================');
  console.log('QA Baseline Completado con éxito.');
  console.log('============================================================');
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
