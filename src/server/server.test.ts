import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';

function waitForHealth(port: number, timeoutMs = 8000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = async () => {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/health`);
        if (res.ok) {
          resolve();
          return;
        }
      } catch {
        // Server still booting
      }
      if (Date.now() - start > timeoutMs) {
        reject(new Error(`Server on port ${port} did not become healthy in ${timeoutMs}ms`));
        return;
      }
      setTimeout(() => void tick(), 200);
    };
    void tick();
  });
}

function startServerProcess(
  port: number,
  envOverrides: Record<string, string>
): ChildProcess {
  return spawn('./node_modules/.bin/tsx', ['server.ts', `--port=${port}`], {
    env: {
      ...process.env,
      DISABLE_HMR: 'true',
      ...envOverrides,
    },
    stdio: 'ignore',
  });
}

test('Server P0/P1 production mode blocks sandbox leaks and unauthenticated telemetry', async () => {
  const port = 3211;
  const srv = startServerProcess(port, {
    NODE_ENV: 'production',
    PAYMENTS_MODE: 'live',
    PORT: String(port),
  });

  try {
    await waitForHealth(port);

    const healthRes = await fetch(`http://127.0.0.1:${port}/api/health`);
    assert.equal(healthRes.status, 200);
    const health = (await healthRes.json()) as { ok: boolean };
    assert.equal(health.ok, true);

    // 1. Production must reject /api/technicians/apply with 503 when Supabase is missing (no RAM sandbox)
    const applyRes = await fetch(`http://127.0.0.1:${port}/api/technicians/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Prod Test User',
        email: 'prod-test@example.com',
        country: 'EC',
        birth_date: '1990-01-01',
        modality: 'full_time',
        specialties: ['Windows & BSOD'],
        nda_accepted: true,
        nda_signed_name: 'Prod Test User',
        technical_score: 100,
        attitude_score: 100,
        total_score: 100,
        answers: {},
      }),
    });
    assert.equal(applyRes.status, 503);

    // 2. Production must reject unauthenticated POST /api/telemetry/events
    const telRes = await fetch(`http://127.0.0.1:${port}/api/telemetry/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'rbac', name: 'poison', status: 'warn' }),
    });
    assert.ok(telRes.status === 401 || telRes.status === 503);

    // 3. Unknown /api/* route must return 404 JSON
    const notFoundRes = await fetch(`http://127.0.0.1:${port}/api/nonexistent-route`);
    assert.equal(notFoundRes.status, 404);
  } finally {
    srv.kill('SIGTERM');
  }
});

test('Server P0/P1 dev sandbox enforces server-side grading, RBAC 403 for technician, and CSAT validation', async () => {
  const port = 3212;
  const srv = startServerProcess(port, {
    NODE_ENV: 'development',
    PAYMENTS_MODE: 'sandbox',
  });

  try {
    await waitForHealth(port);

    // 1. Server-side grading ignores spoofed 100/100 scores when answers are empty
    const applyRes = await fetch(`http://127.0.0.1:${port}/api/technicians/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Spoof Attempt',
        email: 'spoof-ci@example.com',
        country: 'EC',
        birth_date: '1990-05-05',
        modality: 'full_time',
        specialties: ['Windows & BSOD'],
        nda_accepted: true,
        nda_signed_name: 'Spoof Attempt',
        technical_score: 100,
        attitude_score: 100,
        total_score: 100,
        answers: {},
      }),
    });
    assert.equal(applyRes.status, 201);
    const applyData = (await applyRes.json()) as {
      application?: { total_score: number; recommendation: string };
    };
    assert.equal(applyData.application?.total_score, 0);
    assert.equal(applyData.application?.recommendation, 'recommended_reject');

    // 2. RBAC blocks technician role from admin endpoints (403)
    const rbacDenied = await fetch(
      `http://127.0.0.1:${port}/api/admin/technician-applications`,
      { headers: { 'x-demo-role': 'technician' } }
    );
    assert.equal(rbacDenied.status, 403);

    // 3. RBAC allows owner role on admin endpoints (200)
    const rbacAllowed = await fetch(
      `http://127.0.0.1:${port}/api/admin/technician-applications`,
      { headers: { 'x-demo-role': 'owner' } }
    );
    assert.equal(rbacAllowed.status, 200);

    // 4. CSAT endpoint validates rating bounds (1-5) and UUID
    const badCsat = await fetch(
      `http://127.0.0.1:${port}/api/tickets/00000000-0000-4000-8000-000000000099/csat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 9 }),
      }
    );
    assert.equal(badCsat.status, 400);

    const goodCsat = await fetch(
      `http://127.0.0.1:${port}/api/tickets/00000000-0000-4000-8000-000000000099/csat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: 5, comment: 'Excelente servicio' }),
      }
    );
    assert.equal(goodCsat.status, 200);
  } finally {
    srv.kill('SIGTERM');
  }
});
