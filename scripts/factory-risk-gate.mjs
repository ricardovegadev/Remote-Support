#!/usr/bin/env node
/**
 * Remote Support 365 — Deterministic Factory Risk Gate (Factory Engineering V3)
 *
 * Pure deterministic Node.js hook (ZERO AI calls, ZERO external dependencies).
 * Inspects changed files in Git (staged + unstaged + untracked) and classifies
 * risk as ALTO / MEDIO / BAJO to enforce mandatory reviewers and Human Gates.
 */

import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const RISK_LEVELS = Object.freeze({
  HIGH: 'ALTO',
  MEDIUM: 'MEDIO',
  LOW: 'BAJO',
});

/**
 * Normalizes any OS path to forward-slash repository-relative form.
 * @param {string} filePath
 * @returns {string}
 */
export function normalizeRepoPath(filePath) {
  return String(filePath ?? '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\//, '');
}

/**
 * Classifies a single file path into ALTO / MEDIO / BAJO with an explicit rule reason.
 * @param {string} rawPath
 * @returns {{ file: string, level: 'ALTO' | 'MEDIO' | 'BAJO', reason: string }}
 */
export function classifySingleFile(rawPath) {
  const file = normalizeRepoPath(rawPath);
  const baseName = path.posix.basename(file);

  // ALTO: schema SQL, migraciones, servidor BFF/pagos, AuthModal, ticketLogic financiero o archivos .env*
  if (file === 'supabase/schema.sql' || file.startsWith('supabase/migrations/')) {
    return {
      file,
      level: RISK_LEVELS.HIGH,
      reason: 'Esquema PostgreSQL / políticas RLS / migración SQL',
    };
  }
  if (file === 'server.ts' || file.startsWith('src/server/')) {
    return {
      file,
      level: RISK_LEVELS.HIGH,
      reason: 'Backend BFF, pagos Authorize/Capture/Void, auth o RBAC en servidor',
    };
  }
  if (file === 'src/components/AuthModal.tsx') {
    return {
      file,
      level: RISK_LEVELS.HIGH,
      reason: 'Autenticación de usuarios, verificación +18 y recuperación de credenciales',
    };
  }
  if (file === 'src/utils/ticketLogic.ts') {
    return {
      file,
      level: RISK_LEVELS.HIGH,
      reason: 'Lógica financiera pura, tarifas, comisiones sobre neto, +18 y tokens',
    };
  }
  if (baseName === '.env' || baseName.startsWith('.env.')) {
    return {
      file,
      level: RISK_LEVELS.HIGH,
      reason: 'Variables de entorno / superficie sensible de credenciales',
    };
  }

  // MEDIO: componentes de interfaz y servicios de aplicación
  if (
    file.startsWith('src/components/') ||
    file.startsWith('src/services/') ||
    file === 'src/App.tsx' ||
    file.startsWith('src/utils/') ||
    file.startsWith('src/types/') ||
    file.startsWith('src/config/') ||
    file.startsWith('src/hooks/')
  ) {
    return {
      file,
      level: RISK_LEVELS.MEDIUM,
      reason: 'Interfaz de usuario, servicios de datos o configuración de aplicación',
    };
  }

  // BAJO: documentación, infraestructura de fábrica, estilos menores o scripts auxiliares
  return {
    file,
    level: RISK_LEVELS.LOW,
    reason: 'Documentación, reglas de fábrica, copy o estilos menores',
  };
}

/**
 * Classifies a list of changed files and derives mandatory reviewers,
 * auto-merge eligibility, and Human Gate requirements.
 * @param {string[]} rawFiles
 */
export function classifyRisk(rawFiles) {
  const uniqueFiles = Array.from(
    new Set(rawFiles.map(normalizeRepoPath).filter(Boolean))
  ).sort();

  const items = uniqueFiles.map(classifySingleFile);
  const highFiles = items.filter((i) => i.level === RISK_LEVELS.HIGH);
  const mediumFiles = items.filter((i) => i.level === RISK_LEVELS.MEDIUM);
  const lowFiles = items.filter((i) => i.level === RISK_LEVELS.LOW);

  let overallRisk = RISK_LEVELS.LOW;
  if (highFiles.length > 0) {
    overallRisk = RISK_LEVELS.HIGH;
  } else if (mediumFiles.length > 0) {
    overallRisk = RISK_LEVELS.MEDIUM;
  }

  const touchesUi = uniqueFiles.some(
    (f) =>
      f.startsWith('src/components/') ||
      f === 'src/App.tsx' ||
      f.endsWith('.css') ||
      f === 'index.html'
  );

  let requiredReviewers;
  let blocksAutoMerge = false;
  let humanGates = [];

  if (overallRisk === RISK_LEVELS.HIGH) {
    requiredReviewers = [
      'security-reviewer (modelo distinto al Builder)',
      'code-reviewer',
      ...(touchesUi ? ['ux-reviewer', 'ui-reviewer'] : ['ux-reviewer (N/A si solo backend)', 'ui-reviewer (N/A si solo backend)']),
      'factory-approver (4/4 PASS obligatorio)',
    ];
    blocksAutoMerge = true;
    humanGates = [
      'Puerta Humana 1: Aprobación de Spec / ADR antes de implementar',
      'Puerta Humana 2: Revisión y firma humana obligatoria antes de merge / despliegue',
    ];
  } else if (overallRisk === RISK_LEVELS.MEDIUM) {
    requiredReviewers = [
      'security-reviewer',
      'code-reviewer',
      ...(touchesUi ? ['ux-reviewer', 'ui-reviewer'] : []),
      'factory-approver (4/4 PASS obligatorio)',
    ];
    blocksAutoMerge = false;
    humanGates = [
      'Aprobación estándar tras 4/4 PASS en factory-approver y Quality Gates en verde',
    ];
  } else {
    requiredReviewers = [
      'code-reviewer (verificación rápida)',
      ...(touchesUi ? ['ui-reviewer'] : []),
    ];
    blocksAutoMerge = false;
    humanGates = ['No exige Puerta Humana 1 ni 2 (cambio de riesgo bajo)'];
  }

  return {
    overallRisk,
    blocksAutoMerge,
    requiresHumanSignature: overallRisk === RISK_LEVELS.HIGH,
    totalFiles: uniqueFiles.length,
    highFiles,
    mediumFiles,
    lowFiles,
    requiredReviewers,
    humanGates,
  };
}

/**
 * Collects changed files from Git (unstaged, staged, and untracked) safely without shell interpolation.
 * @param {string} cwd
 * @returns {{ files: string[], gitAvailable: boolean, note?: string }}
 */
export function collectGitChangedFiles(cwd = process.cwd()) {
  const runGit = (args) =>
    execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

  try {
    runGit(['rev-parse', '--is-inside-work-tree']);
  } catch {
    return {
      files: [],
      gitAvailable: false,
      note: 'No se detectó un repositorio Git activo en el directorio actual (evaluado con 0 archivos en diff).',
    };
  }

  const collected = new Set();
  const commands = [
    ['diff', '--name-only'],
    ['diff', '--cached', '--name-only'],
    ['ls-files', '--others', '--exclude-standard'],
  ];

  for (const args of commands) {
    try {
      const output = runGit(args);
      for (const line of output.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed) collected.add(trimmed);
      }
    } catch {
      // Ignora subcomandos no aplicables (ej. repo sin commits iniciales)
    }
  }

  return {
    files: Array.from(collected).sort(),
    gitAvailable: true,
  };
}

/**
 * Formats a clear, deterministic CLI report.
 * @param {ReturnType<typeof classifyRisk>} result
 * @param {{ gitAvailable?: boolean, note?: string, strictMode?: boolean }} [meta]
 * @returns {string}
 */
export function formatRiskReport(result, meta = {}) {
  const lines = [];
  lines.push('======================================================================');
  lines.push('  FACTORY RISK GATE (Determinista · Sin IA · Factory Engineering V3)');
  lines.push('======================================================================');
  lines.push(`  Nivel de Riesgo Global : ${result.overallRisk}`);
  lines.push(
    `  Auto-Merge             : ${
      result.blocksAutoMerge ? 'BLOQUEADO (Exige Puerta Humana 1 y 2)' : 'PERMITIDO tras Quality Gates + Approver'
    }`
  );
  lines.push(
    `  Firma Humana Obligatoria: ${result.requiresHumanSignature ? 'SÍ (OBLIGATORIA)' : 'NO'}`
  );
  lines.push(`  Archivos inspeccionados: ${result.totalFiles}`);
  if (meta.note) {
    lines.push(`  Nota Git               : ${meta.note}`);
  }
  lines.push('----------------------------------------------------------------------');

  if (result.highFiles.length > 0) {
    lines.push('  [ALTO] Archivos críticos detectados:');
    for (const item of result.highFiles) {
      lines.push(`    - ${item.file}  (${item.reason})`);
    }
  }
  if (result.mediumFiles.length > 0) {
    lines.push('  [MEDIO] Archivos de UI / servicios detectados:');
    for (const item of result.mediumFiles) {
      lines.push(`    - ${item.file}  (${item.reason})`);
    }
  }
  if (result.lowFiles.length > 0) {
    lines.push('  [BAJO] Archivos de docs / estilos / fábrica detectados:');
    for (const item of result.lowFiles) {
      lines.push(`    - ${item.file}  (${item.reason})`);
    }
  }
  if (result.totalFiles === 0) {
    lines.push('  Sin archivos modificados en working tree ni staging area.');
  }

  lines.push('----------------------------------------------------------------------');
  lines.push('  Revisores obligatorios:');
  for (const reviewer of result.requiredReviewers) {
    lines.push(`    * ${reviewer}`);
  }
  lines.push('  Puertas de gobierno:');
  for (const gate of result.humanGates) {
    lines.push(`    * ${gate}`);
  }
  lines.push('======================================================================');

  return lines.join('\n');
}

function parseCliArgs(argv) {
  const strictMode = argv.includes('--strict');
  const jsonMode = argv.includes('--json');
  const filesIndex = argv.indexOf('--files');
  let explicitFiles = null;
  if (filesIndex !== -1) {
    explicitFiles = [];
    for (let i = filesIndex + 1; i < argv.length; i += 1) {
      if (argv[i].startsWith('--')) break;
      explicitFiles.push(argv[i]);
    }
  }
  return { strictMode, jsonMode, explicitFiles };
}

function main() {
  const { strictMode, jsonMode, explicitFiles } = parseCliArgs(
    process.argv.slice(2)
  );

  let files;
  let meta = { gitAvailable: true, strictMode };

  if (explicitFiles !== null) {
    files = explicitFiles;
    meta = { gitAvailable: true, strictMode, note: 'Evaluado desde --files CLI.' };
  } else {
    const gitRes = collectGitChangedFiles(process.cwd());
    files = gitRes.files;
    meta = { gitAvailable: gitRes.gitAvailable, note: gitRes.note, strictMode };
  }

  const result = classifyRisk(files);

  if (jsonMode) {
    process.stdout.write(`${JSON.stringify({ ...result, meta }, null, 2)}\n`);
  } else {
    process.stdout.write(`${formatRiskReport(result, meta)}\n`);
  }

  if (strictMode && result.blocksAutoMerge) {
    process.stderr.write(
      '[factory:gate --strict] Auto-merge bloqueado: se requiere aprobación humana (Puerta Humana 1 y 2).\n'
    );
    process.exitCode = 2;
  }
}

const isExecutedDirectly =
  typeof process.argv[1] === 'string' &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isExecutedDirectly) {
  main();
}
