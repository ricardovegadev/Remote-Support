import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import Stripe from 'stripe';

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

function computeNextTicketCode(code: string): string {
  const clean = code.trim().toUpperCase();
  const numMatch = /^RS-(\d+)$/i.exec(clean);
  if (numMatch) {
    const num = Number(numMatch[1]);
    const next = num >= 9999 ? 1000 : num + 1;
    return `RS-${String(next).padStart(4, '0')}`;
  }
  const lastChar = clean.slice(-1);
  const nextChar = lastChar === '9' ? 'A' : lastChar === 'Z' ? '0' : String.fromCharCode(lastChar.charCodeAt(0) + 1);
  return `${clean.slice(0, -1)}${nextChar}`;
}

test('Server Phase 0 production mode fails closed without Supabase/SMTP and blocks x-demo-role bypass', async () => {
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

    // 1. Production rejects /api/technicians/apply with 503 when Supabase is missing
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

    // 2. Forged x-demo-role without Bearer JWT cannot bypass operator auth
    const adminBypassRes = await fetch(
      `http://127.0.0.1:${port}/api/admin/technician-applications`,
      { headers: { 'x-demo-role': 'owner' } }
    );
    assert.equal(adminBypassRes.status, 401);

    const telRes = await fetch(`http://127.0.0.1:${port}/api/telemetry/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-demo-role': 'owner',
      },
      body: JSON.stringify({ category: 'rbac', name: 'poison', status: 'warn' }),
    });
    assert.equal(telRes.status, 401);

    // 3. Production blocks room reads without Supabase, privacy OTP without SMTP, and sandbox webhook simulator
    const roomRes = await fetch(`http://127.0.0.1:${port}/api/tickets/RS-1024`);
    assert.equal(roomRes.status, 503);

    const otpRes = await fetch(`http://127.0.0.1:${port}/api/privacy/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'export', ticketCode: 'RS-1024' }),
    });
    assert.equal(otpRes.status, 503);

    const sandboxWhRes = await fetch(
      `http://127.0.0.1:${port}/api/payments/sandbox/dispatch-webhook`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketCode: 'RS-1024', gateway: 'stripe' }),
      }
    );
    assert.equal(sandboxWhRes.status, 403);

    // 4. Unknown /api/* route returns 404 JSON
    const notFoundRes = await fetch(`http://127.0.0.1:${port}/api/nonexistent-route`);
    assert.equal(notFoundRes.status, 404);
  } finally {
    srv.kill('SIGTERM');
  }
});

test('Server Phase 0a-0d enforces room tokens, email OTP privacy, webhook-only payments, and Bearer RBAC', async () => {
  const prevPaymentsMode = process.env.PAYMENTS_MODE;
  const prevStripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const prevStripeKey = process.env.STRIPE_SECRET_KEY;

  process.env.PAYMENTS_MODE = 'sandbox';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_phase0_secret';
  delete process.env.STRIPE_SECRET_KEY;

  const { createServerApp } = await import('../../server.ts');

  const app = createServerApp({
    verifyOperatorToken: async (token) => {
      if (token === 'tok_owner') return { userId: 'user-owner', role: 'owner' };
      if (token === 'tok_admin') return { userId: 'user-admin', role: 'admin' };
      if (token === 'tok_tech') return { userId: 'user-tech', role: 'technician' };
      return null;
    },
  });

  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    // --- 0d: Operator Auth & RBAC (no x-demo-role bypass) ---
    const unauthAdmin = await fetch(`${baseUrl}/api/admin/technician-applications`, {
      headers: { 'x-demo-role': 'owner' },
    });
    assert.equal(unauthAdmin.status, 401);

    const invalidBearerAdmin = await fetch(`${baseUrl}/api/admin/technician-applications`, {
      headers: { Authorization: 'Bearer forged_token' },
    });
    assert.equal(invalidBearerAdmin.status, 403);

    const techAdminDenied = await fetch(`${baseUrl}/api/admin/technician-applications`, {
      headers: { Authorization: 'Bearer tok_tech' },
    });
    assert.equal(techAdminDenied.status, 403);

    const ownerAdminAllowed = await fetch(`${baseUrl}/api/admin/technician-applications`, {
      headers: { Authorization: 'Bearer tok_owner' },
    });
    assert.equal(ownerAdminAllowed.status, 200);

    const techTelemetryAllowed = await fetch(`${baseUrl}/api/telemetry/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok_tech',
      },
      body: JSON.stringify({ category: 'ai', name: 'unit_test', status: 'ok' }),
    });
    assert.equal(techTelemetryAllowed.status, 202);

    // --- 0d/P0: Server-side technician assessment grading ---
    const applyRes = await fetch(`${baseUrl}/api/technicians/apply`, {
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

    // --- 0a: Room token enforcement & RS-N+1 isolation ---
    const createTicketPayload = (email: string, serviceTier: string) => ({
      clientName: 'Laura Méndez',
      clientEmail: email,
      birthDate: '1991-04-12',
      termsAccepted: true,
      category: 'Problemas de Wi-Fi o red',
      osType: 'Windows',
      serviceTier,
      billingMode: 'one_time',
      description: 'La conexión VPN corporativa cae cada 5 minutos en Windows 11.',
      marketingOptIn: false,
    });

    const createResA = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createTicketPayload('laura.a@example.com', 'Express $15')),
    });
    assert.equal(createResA.status, 201);
    const dataA = (await createResA.json()) as {
      ticket: { id: string; ticket_code: string; client_session_token: string };
    };
    const ticketA = dataA.ticket;
    assert.match(ticketA.ticket_code, /^RS-[A-Z0-9]{4,12}$/i);
    assert.match(ticketA.client_session_token, /^[a-f0-9]{64}$/);

    const createResB = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createTicketPayload('laura.b@example.com', 'Optimización $29')),
    });
    assert.equal(createResB.status, 201);
    const ticketB = ((await createResB.json()) as {
      ticket: { id: string; ticket_code: string; client_session_token: string };
    }).ticket;

    // Missing token -> 403
    const noTokRes = await fetch(`${baseUrl}/api/tickets/${ticketA.ticket_code}`);
    assert.equal(noTokRes.status, 403);

    // Wrong token -> 403
    const wrongTokRes = await fetch(`${baseUrl}/api/tickets/${ticketA.ticket_code}`, {
      headers: { 'x-ticket-token': '0'.repeat(64) },
    });
    assert.equal(wrongTokRes.status, 403);

    // Cross-ticket RS-N+1 and ticketB access using ticketA's token -> 403
    const adjacentCode = computeNextTicketCode(ticketA.ticket_code);
    const adjacentRes = await fetch(`${baseUrl}/api/tickets/${adjacentCode}`, {
      headers: { 'x-ticket-token': ticketA.client_session_token },
    });
    assert.equal(adjacentRes.status, 403);

    const crossTicketRes = await fetch(`${baseUrl}/api/tickets/${ticketB.ticket_code}`, {
      headers: { 'x-ticket-token': ticketA.client_session_token },
    });
    assert.equal(crossTicketRes.status, 403);

    // Valid token -> 200
    const validRoomRes = await fetch(`${baseUrl}/api/tickets/${ticketA.ticket_code}`, {
      headers: { 'x-ticket-token': ticketA.client_session_token },
    });
    assert.equal(validRoomRes.status, 200);

    // CSAT requires valid room token, explicit resolved boolean, and 1-5 rating when resolved=true
    const csatNoToken = await fetch(`${baseUrl}/api/tickets/${ticketA.id}/csat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolved: true, rating: 5 }),
    });
    assert.equal(csatNoToken.status, 403);

    const badCsatRange = await fetch(`${baseUrl}/api/tickets/${ticketA.id}/csat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({ resolved: true, rating: 9 }),
    });
    assert.equal(badCsatRange.status, 400);

    const missingRatingOnResolved = await fetch(`${baseUrl}/api/tickets/${ticketA.id}/csat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({ resolved: true }),
    });
    assert.equal(missingRatingOnResolved.status, 400);

    // Unresolved guarantee dispute flow on ticketB does NOT require preselected stars or fake 1-star rating
    const unresolvedCsat = await fetch(`${baseUrl}/api/tickets/${ticketB.id}/csat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketB.client_session_token,
      },
      body: JSON.stringify({
        resolved: false,
        disputeReason: 'El problema volvió a aparecer tras reiniciar.',
      }),
    });
    assert.equal(unresolvedCsat.status, 200);
    const unresolvedJson = (await unresolvedCsat.json()) as {
      success: boolean;
      resolved: boolean;
      disputed: boolean;
      rating: number | null;
    };
    assert.equal(unresolvedJson.success, true);
    assert.equal(unresolvedJson.resolved, false);
    assert.equal(unresolvedJson.disputed, true);
    assert.equal(unresolvedJson.rating, null);

    const disputedTicketRes = await fetch(`${baseUrl}/api/tickets/${ticketB.ticket_code}`, {
      headers: { 'x-ticket-token': ticketB.client_session_token },
    });
    assert.equal(disputedTicketRes.status, 200);
    const disputedTicketJson = (await disputedTicketRes.json()) as {
      ticket: { csat_rating: number | null; dispute_reason: string | null };
    };
    assert.equal(disputedTicketJson.ticket.csat_rating, null);
    assert.equal(
      disputedTicketJson.ticket.dispute_reason,
      'El problema volvió a aparecer tras reiniciar.'
    );

    const goodCsat = await fetch(`${baseUrl}/api/tickets/${ticketA.id}/csat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({ resolved: true, rating: 5, comment: 'Excelente servicio' }),
    });
    assert.equal(goodCsat.status, 200);

    // --- Phase 1: Mac ticket creation normalizes Windows category & AI assistant uses Mac steps ---
    const macTicketRes = await fetch(`${baseUrl}/api/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...createTicketPayload('mac.user@example.com', 'Optimización $29'),
        osType: 'Mac',
        category: 'Windows lento o bajo rendimiento',
        description: 'Mi MacBook Pro está lento al compilar y abrir aplicaciones.',
      }),
    });
    assert.equal(macTicketRes.status, 201);
    const macTicketJson = (await macTicketRes.json()) as {
      ticket: { category: string; os_type: string; ai_diagnosis_summary: string };
    };
    assert.equal(macTicketJson.ticket.os_type, 'Mac');
    assert.equal(macTicketJson.ticket.category, 'Sistema Operativo/Lentitud');

    const macAiRes = await fetch(`${baseUrl}/api/ai/receptionist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        osType: 'Mac',
        category: 'Windows lento o bajo rendimiento',
        description: 'Mi MacBook tarda mucho en abrir programas y el ventilador suena fuerte.',
      }),
    });
    assert.equal(macAiRes.status, 200);
    const macAiJson = (await macAiRes.json()) as {
      suggestedCategory: string;
      probableCause: string;
      selfServiceSteps: string[];
    };
    assert.notEqual(macAiJson.suggestedCategory, 'Windows lento o bajo rendimiento');
    assert.ok(
      !macAiJson.selfServiceSteps.join(' ').toLowerCase().includes('windows'),
      'Mac AI self-service steps should not mention Windows'
    );

    const macTechAiRes = await fetch(`${baseUrl}/api/ai/assistant`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer tok_tech',
      },
      body: JSON.stringify({
        osType: 'Mac',
        category: 'Pantallazos azules (BSOD)',
        problemDescription: 'El MacBook se reinicia con kernel panic al despertar.',
      }),
    });
    assert.equal(macTechAiRes.status, 200);
    const macTechAiJson = (await macTechAiRes.json()) as {
      checklist: string[];
      diagnosticSummary: string;
    };
    assert.ok(Array.isArray(macTechAiJson.checklist) && macTechAiJson.checklist.length >= 2);
    assert.ok(
      !macTechAiJson.checklist.join(' ').includes('Minidump'),
      'Mac technician assistant must not return Windows Minidump steps'
    );

    // --- 0c: Webhook-only payments & authoritative server pricing (no $12 addon uplift) ---
    // Stripe checkout session uses authoritative $15 price & ignores addonPerformance: true & returns verified: false
    const stripeSessionRes = await fetch(`${baseUrl}/api/payments/stripe/create-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({
        ticketCode: ticketA.ticket_code,
        amountUsd: 1, // tampered client field must be ignored
        addonPerformance: true, // deprecated addon must not add $12
      }),
    });
    assert.equal(stripeSessionRes.status, 200);
    const stripeSessionData = (await stripeSessionRes.json()) as {
      amountUsd: number;
      verified: boolean;
      sessionId: string;
    };
    assert.equal(stripeSessionData.amountUsd, 15);
    assert.equal(stripeSessionData.verified, false);

    // verify-session MUST NOT mark ticket as paid
    const verifyBeforeWebhook = await fetch(
      `${baseUrl}/api/payments/stripe/verify-session?session_id=${encodeURIComponent(stripeSessionData.sessionId)}&ticket_code=${encodeURIComponent(ticketA.ticket_code)}`,
      { headers: { 'x-ticket-token': ticketA.client_session_token } }
    );
    assert.equal(verifyBeforeWebhook.status, 200);
    const verifyBeforeJson = (await verifyBeforeWebhook.json()) as {
      verified: boolean;
      webhookConfirmed: boolean;
      payment_status: string;
    };
    assert.equal(verifyBeforeJson.verified, false);
    assert.equal(verifyBeforeJson.webhookConfirmed, false);
    assert.equal(verifyBeforeJson.payment_status, 'pending');

    // Forged Stripe webhook signature fails (400)
    const forgedStripeWh = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=1700000000,v1=deadbeef',
      },
      body: JSON.stringify({ type: 'checkout.session.completed' }),
    });
    assert.equal(forgedStripeWh.status, 400);

    // Signed Stripe webhook with tampered amount ($1 instead of $15) fails (400)
    const stripeClient = new Stripe('sk_test_sandbox_local');
    const tamperedPayload = JSON.stringify({
      id: 'evt_tampered_amount',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: stripeSessionData.sessionId,
          object: 'checkout.session',
          status: 'complete',
          payment_status: 'paid',
          currency: 'usd',
          amount_total: 100, // tampered $1.00
          mode: 'payment',
          metadata: {
            ticketCode: ticketA.ticket_code,
            serviceTier: 'Express $15',
            billingMode: 'one_time',
          },
        },
      },
    });
    const tamperedSig = stripeClient.webhooks.generateTestHeaderString({
      payload: tamperedPayload,
      secret: 'whsec_test_phase0_secret',
    });
    const tamperedWhRes = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': tamperedSig,
      },
      body: tamperedPayload,
    });
    assert.equal(tamperedWhRes.status, 400);

    // Signed Stripe webhook settles ticketA to paid
    const validStripeDispatch = await fetch(`${baseUrl}/api/payments/sandbox/dispatch-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({
        ticketCode: ticketA.ticket_code,
        gateway: 'stripe',
        sessionId: stripeSessionData.sessionId,
      }),
    });
    assert.equal(validStripeDispatch.status, 200);

    const verifyAfterWebhook = await fetch(
      `${baseUrl}/api/payments/stripe/verify-session?session_id=${encodeURIComponent(stripeSessionData.sessionId)}&ticket_code=${encodeURIComponent(ticketA.ticket_code)}`,
      { headers: { 'x-ticket-token': ticketA.client_session_token } }
    );
    const verifyAfterJson = (await verifyAfterWebhook.json()) as {
      verified: boolean;
      payment_status: string;
    };
    assert.equal(verifyAfterJson.verified, true);
    assert.equal(verifyAfterJson.payment_status, 'paid');

    // PayPal flow on ticketB ($29)
    const paypalOrderRes = await fetch(`${baseUrl}/api/payments/paypal/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketB.client_session_token,
      },
      body: JSON.stringify({ ticketCode: ticketB.ticket_code }),
    });
    assert.equal(paypalOrderRes.status, 200);
    const paypalOrderData = (await paypalOrderRes.json()) as {
      orderId: string;
      amountUsd: number;
      verified: boolean;
    };
    assert.equal(paypalOrderData.amountUsd, 29);
    assert.equal(paypalOrderData.verified, false);

    // capture-order does NOT mark paid without webhook
    const paypalCaptureRes = await fetch(`${baseUrl}/api/payments/paypal/capture-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketB.client_session_token,
      },
      body: JSON.stringify({
        orderId: paypalOrderData.orderId,
        ticketCode: ticketB.ticket_code,
      }),
    });
    assert.equal(paypalCaptureRes.status, 200);
    const paypalCaptureJson = (await paypalCaptureRes.json()) as {
      verified: boolean;
      payment_status: string;
    };
    assert.equal(paypalCaptureJson.verified, false);
    assert.equal(paypalCaptureJson.payment_status, 'pending');

    // Forged PayPal webhook signature fails (403)
    const forgedPaypalWh = await fetch(`${baseUrl}/api/payments/paypal/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'paypal-transmission-id': 'tx-fake',
        'paypal-transmission-time': new Date().toISOString(),
        'paypal-transmission-sig': 'deadbeef',
        'paypal-cert-url': 'https://api.sandbox.paypal.com/cert',
        'paypal-auth-algo': 'SHA256-SANDBOX-HMAC',
      },
      body: JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED' }),
    });
    assert.equal(forgedPaypalWh.status, 403);

    // Signed PayPal webhook settles ticketB to paid
    const validPaypalDispatch = await fetch(`${baseUrl}/api/payments/sandbox/dispatch-webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketB.client_session_token,
      },
      body: JSON.stringify({
        ticketCode: ticketB.ticket_code,
        gateway: 'paypal',
        orderId: paypalOrderData.orderId,
      }),
    });
    assert.equal(validPaypalDispatch.status, 200);

    const roomBAfterPay = await fetch(`${baseUrl}/api/tickets/${ticketB.ticket_code}`, {
      headers: { 'x-ticket-token': ticketB.client_session_token },
    });
    const roomBJson = (await roomBAfterPay.json()) as {
      ticket: { payment_status: string };
    };
    assert.equal(roomBJson.ticket.payment_status, 'paid');

    // --- 0b: Privacy Export & Erasure require Email OTP ---
    const exportNoOtp = await fetch(`${baseUrl}/api/privacy/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({
        ticketCode: ticketA.ticket_code,
        challengeId: '00000000-0000-4000-8000-000000000000',
        otpCode: '123456',
      }),
    });
    assert.equal(exportNoOtp.status, 403);

    const otpReqRes = await fetch(`${baseUrl}/api/privacy/otp/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({
        action: 'export',
        ticketCode: ticketA.ticket_code,
      }),
    });
    assert.equal(otpReqRes.status, 200);
    const otpReqJson = (await otpReqRes.json()) as {
      challengeId: string;
      devOtpPreview?: string;
    };
    assert.ok(otpReqJson.challengeId);
    assert.match(otpReqJson.devOtpPreview ?? '', /^\d{6}$/);

    // Wrong OTP fails (403)
    const wrongOtpExport = await fetch(`${baseUrl}/api/privacy/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({
        ticketCode: ticketA.ticket_code,
        challengeId: otpReqJson.challengeId,
        otpCode: otpReqJson.devOtpPreview === '000000' ? '111111' : '000000',
      }),
    });
    assert.equal(wrongOtpExport.status, 403);

    // Valid OTP exports sanitized data once
    const validExportRes = await fetch(`${baseUrl}/api/privacy/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({
        ticketCode: ticketA.ticket_code,
        challengeId: otpReqJson.challengeId,
        otpCode: otpReqJson.devOtpPreview,
      }),
    });
    assert.equal(validExportRes.status, 200);
    const exportJson = (await validExportRes.json()) as {
      exportPayload: {
        verification_method: string;
        ticket: { ticket_code: string; client_session_token?: string };
      };
    };
    assert.equal(exportJson.exportPayload.verification_method, 'email_otp');
    assert.equal(exportJson.exportPayload.ticket.ticket_code, ticketA.ticket_code);
    assert.equal(exportJson.exportPayload.ticket.client_session_token, undefined);

    // Single-use OTP cannot be replayed (403)
    const replayExportRes = await fetch(`${baseUrl}/api/privacy/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({
        ticketCode: ticketA.ticket_code,
        challengeId: otpReqJson.challengeId,
        otpCode: otpReqJson.devOtpPreview,
      }),
    });
    assert.equal(replayExportRes.status, 403);

    // Erasure requires its own 'erase' OTP
    const eraseOtpReq = await fetch(`${baseUrl}/api/privacy/otp/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({
        action: 'erase',
        ticketCode: ticketA.ticket_code,
      }),
    });
    assert.equal(eraseOtpReq.status, 200);
    const eraseOtpJson = (await eraseOtpReq.json()) as {
      challengeId: string;
      devOtpPreview?: string;
    };
    assert.match(eraseOtpJson.devOtpPreview ?? '', /^\d{6}$/);

    const validEraseRes = await fetch(`${baseUrl}/api/privacy/erase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ticket-token': ticketA.client_session_token,
      },
      body: JSON.stringify({
        ticketCode: ticketA.ticket_code,
        challengeId: eraseOtpJson.challengeId,
        otpCode: eraseOtpJson.devOtpPreview,
      }),
    });
    assert.equal(validEraseRes.status, 200);

    // --- Phase 2: /api/config/business & NET technician payout in /api/admin/payments ---
    const businessCfgRes = await fetch(`${baseUrl}/api/config/business`);
    assert.equal(businessCfgRes.status, 200);
    const businessCfgJson = (await businessCfgRes.json()) as {
      success: boolean;
      config: {
        currency: string;
        feeConfig: { paymentFeePercent: number; paymentFeeFixedUsd: number; operationalCostUsd: number };
        serviceTiers: Array<{ id: string; priceUsd: number; regularPriceUsd?: unknown }>;
        commissionTiers: Array<{ id: string; commissionPercent: number }>;
      };
    };
    assert.equal(businessCfgJson.success, true);
    assert.equal(businessCfgJson.config.currency, 'USD');
    assert.equal(businessCfgJson.config.feeConfig.operationalCostUsd, 1.5);
    assert.equal(
      businessCfgJson.config.serviceTiers.every((t) => t.regularPriceUsd === undefined),
      true
    );

    // Unauthenticated or technician without permission cannot read /api/admin/payments? Wait: technician has analytics:view, unauth returns 401
    const unauthPayments = await fetch(`${baseUrl}/api/admin/payments`);
    assert.equal(unauthPayments.status, 401);

    const paymentsRes = await fetch(`${baseUrl}/api/admin/payments`, {
      headers: { Authorization: 'Bearer tok_owner' },
    });
    assert.equal(paymentsRes.status, 200);
    const paymentsJson = (await paymentsRes.json()) as {
      success: boolean;
      payments: Array<{
        ticket_id: string;
        amount_usd: number;
        commission_percent: number;
        technician_payout_usd: number;
        platform_fee_usd: number;
      }>;
    };
    assert.equal(paymentsJson.success, true);
    const payA = paymentsJson.payments.find((p) => p.ticket_id === ticketA.id);
    const payB = paymentsJson.payments.find((p) => p.ticket_id === ticketB.id);
    assert.ok(payA, 'Stripe payment ledger row for ticketA should exist');
    assert.ok(payB, 'PayPal payment ledger row for ticketB should exist');
    // For $15 Express at 65% base on NET ($15 - $0.74 gateway - $1.50 op = $12.76 -> 65% = $8.29)
    assert.equal(payA.amount_usd, 15);
    assert.equal(payA.commission_percent, 65);
    assert.equal(payA.technician_payout_usd, 8.29);
    // For $29 Optimización at 65% base on NET ($29 - $1.14 gateway - $1.50 op = $26.36 -> 65% = $17.13)
    assert.equal(payB.amount_usd, 29);
    assert.equal(payB.commission_percent, 65);
    assert.equal(payB.technician_payout_usd, 17.13);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (prevPaymentsMode === undefined) delete process.env.PAYMENTS_MODE;
    else process.env.PAYMENTS_MODE = prevPaymentsMode;
    if (prevStripeWebhookSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = prevStripeWebhookSecret;
    if (prevStripeKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = prevStripeKey;
  }
});

test('Server Phase 2 /api/config/business serves single authoritative pricing overrides from server env', async () => {
  const port = 3213;
  const srv = startServerProcess(port, {
    DISABLE_HMR: 'true',
    BUSINESS_TIER_EXPRESS_USD: '18',
    BUSINESS_OPERATIONAL_COST_USD: '2.00',
    BUSINESS_COMMISSION_BASE_PCT: '70',
  });

  try {
    await waitForHealth(port);
    const res = await fetch(`http://127.0.0.1:${port}/api/config/business`);
    assert.equal(res.status, 200);
    const json = (await res.json()) as {
      success: boolean;
      config: {
        feeConfig: { operationalCostUsd: number };
        serviceTiers: Array<{ id: string; priceUsd: number }>;
        commissionTiers: Array<{ id: string; commissionPercent: number }>;
      };
    };
    assert.equal(json.success, true);
    assert.equal(
      json.config.serviceTiers.find((t) => t.id === 'Express $15')?.priceUsd,
      18
    );
    assert.equal(json.config.feeConfig.operationalCostUsd, 2);
    assert.equal(json.config.commissionTiers[0]?.commissionPercent, 70);

    // Phase 3: /api/public/availability omits fake technician counts when Supabase is not configured
    const availRes = await fetch(`http://127.0.0.1:${port}/api/public/availability`);
    assert.equal(availRes.status, 200);
    const availJson = (await availRes.json()) as {
      success: boolean;
      isRealData: boolean;
      onlineTechnicians: number | null;
      estimatedWaitMinutes: number | null;
    };
    assert.equal(availJson.success, true);
    assert.equal(availJson.isRealData, false);
    assert.equal(availJson.onlineTechnicians, null);
    assert.equal(availJson.estimatedWaitMinutes, null);
  } finally {
    srv.kill('SIGTERM');
  }
});
