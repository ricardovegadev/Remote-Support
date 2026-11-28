import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyRisk,
  classifySingleFile,
  formatRiskReport,
  RISK_LEVELS,
} from './factory-risk-gate.mjs';

test('Factory Risk Gate classifies ALTO for critical SQL, server, AuthModal, ticketLogic, and .env files', () => {
  const highPaths = [
    'supabase/schema.sql',
    'supabase/migrations/20261127000000_test.sql',
    'server.ts',
    'src/components/AuthModal.tsx',
    'src/utils/ticketLogic.ts',
    '.env',
    '.env.support',
    '.env.example',
  ];

  for (const filePath of highPaths) {
    const single = classifySingleFile(filePath);
    assert.equal(single.level, RISK_LEVELS.HIGH, `Expected ALTO for ${filePath}`);

    const summary = classifyRisk([filePath]);
    assert.equal(summary.overallRisk, RISK_LEVELS.HIGH);
    assert.equal(summary.blocksAutoMerge, true);
    assert.equal(summary.requiresHumanSignature, true);
    assert.equal(summary.highFiles.length, 1);
  }
});

test('Factory Risk Gate classifies MEDIO for src/components/** and src/services/** without high-risk files', () => {
  const result = classifyRisk([
    'src/components/HeroSection.tsx',
    'src/services/supportAdapter.ts',
    'docs/egm/03_SESSION_CHANGELOG.md',
  ]);

  assert.equal(result.overallRisk, RISK_LEVELS.MEDIUM);
  assert.equal(result.blocksAutoMerge, false);
  assert.equal(result.requiresHumanSignature, false);
  assert.equal(result.mediumFiles.length, 2);
  assert.equal(result.lowFiles.length, 1);
  assert.ok(result.requiredReviewers.includes('security-reviewer'));
  assert.ok(result.requiredReviewers.includes('ux-reviewer'));
  assert.ok(result.requiredReviewers.includes('ui-reviewer'));
});

test('Factory Risk Gate classifies BAJO for docs, factory rules, scripts, and minor CSS', () => {
  const result = classifyRisk([
    'docs/egm/04_FACTORY_METRICS.md',
    '.agent/rules/02-model-routing.md',
    'scripts/factory-risk-gate.mjs',
    'package.json',
  ]);

  assert.equal(result.overallRisk, RISK_LEVELS.LOW);
  assert.equal(result.blocksAutoMerge, false);
  assert.equal(result.requiresHumanSignature, false);
  assert.equal(result.highFiles.length, 0);
  assert.equal(result.mediumFiles.length, 0);
  assert.equal(result.lowFiles.length, 4);
});

test('Factory Risk Gate escalates overall risk to ALTO when mixed with MEDIO and BAJO files', () => {
  const result = classifyRisk([
    'docs/egm/03_SESSION_CHANGELOG.md',
    'src/components/Header.tsx',
    'server.ts',
  ]);

  assert.equal(result.overallRisk, RISK_LEVELS.HIGH);
  assert.equal(result.blocksAutoMerge, true);
  assert.equal(result.requiresHumanSignature, true);

  const report = formatRiskReport(result);
  assert.match(report, /Nivel de Riesgo Global : ALTO/);
  assert.match(report, /BLOQUEADO \(Exige Puerta Humana 1 y 2\)/);
  assert.match(report, /server\.ts/);
});
