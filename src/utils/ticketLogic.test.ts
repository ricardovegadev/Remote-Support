import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRustDeskDeepLink,
  buildTechnicalResolutionSummary,
  canClaimTicket,
  computeAverageResponseMinutes,
  computeDashboardMetrics,
  createTicketFromDraft,
  formatRustDeskId,
  generateTicketCode,
  getInitials,
  getRustDeskInstallerUrl,
  getServiceTierPriceUsd,
  isValidUuid,
  normalizeRustDeskId,
  OFFICIAL_RUSTDESK_RELEASES_URL,
  parseAppRoute,
  validateRustDeskId,
  validateStep1,
  validateStep2,
  validateStep3,
} from './ticketLogic';
import type { SupportTicket, WizardDraft } from '../types/support';

test('generateTicketCode produces RS-XXXX format', () => {
  const code = generateTicketCode(() => 0.5);
  assert.match(code, /^RS-\d{4}$/);
});

test('getInitials generates distinct initials using first and last word', () => {
  assert.equal(getInitials('Empresa demostrativa A'), 'EA');
  assert.equal(getInitials('Empresa demostrativa B'), 'EB');
  assert.equal(getInitials('Cliente demostrativo C'), 'CC');
  assert.equal(getInitials('Carlos Mendoza'), 'CM');
  assert.equal(getInitials('Soporte'), 'SO');
});

test('RustDesk ID normalization, formatting, validation, and deep link', () => {
  assert.equal(normalizeRustDeskId('123 456 7899'), '123456789');
  assert.equal(formatRustDeskId('123456789'), '123 456 789');
  assert.equal(validateRustDeskId('12345').valid, false);
  assert.equal(validateRustDeskId('123 456 789').valid, true);
  assert.equal(
    buildRustDeskDeepLink('123 456 789'),
    'rustdesk://connection/new/123456789'
  );
  assert.equal(buildRustDeskDeepLink(null), null);
});

test('wizard step validations catch missing or malformed inputs', () => {
  const emptyDraft: WizardDraft = {
    step: 1,
    category: null,
    operatingSystem: null,
    serviceTier: 'Express $25',
    description: '',
    clientName: '',
    clientEmail: '',
  };

  assert.equal(validateStep1(emptyDraft).valid, false);
  assert.equal(validateStep1({ ...emptyDraft, category: 'Impresoras' }).valid, true);
  assert.equal(validateStep2(emptyDraft).valid, false);
  assert.equal(
    validateStep2({
      ...emptyDraft,
      operatingSystem: 'Mac',
      description: 'Impresora HP no responde desde esta mañana en macOS',
    }).valid,
    true
  );
  assert.equal(
    validateStep3({ ...emptyDraft, clientName: 'A', clientEmail: 'mal' }).valid,
    false
  );
  assert.equal(
    validateStep3({
      ...emptyDraft,
      clientName: 'Laura Mendoza',
      clientEmail: 'laura@estudio.ec',
    }).valid,
    true
  );
});

test('createTicketFromDraft, computeDashboardMetrics, and computeAverageResponseMinutes calculate KPIs accurately', () => {
  const t1 = createTicketFromDraft(
    {
      step: 3,
      category: 'Redes/Wi-Fi',
      operatingSystem: 'Windows',
      serviceTier: 'Express $25',
      description: 'VPN corporativa falla al autenticar desde casa',
      clientName: 'Carlos Andrade',
      clientEmail: 'Carlos@Empresa.com',
    },
    { nowIso: '2026-11-13T10:00:00.000Z', randomFn: () => 0.42 }
  );

  assert.match(t1.ticket_code, /^RS-\d{4}$/);
  assert.equal(t1.status, 'waiting_payment');
  assert.equal(t1.payment_status, 'pending');
  assert.equal(getServiceTierPriceUsd('Avanzado $55'), 55);
  assert.equal(canClaimTicket(t1), true);

  const claimedTicket: SupportTicket = {
    ...t1,
    id: '11111111-1111-4111-8111-111111111191',
    ticket_code: 'RS-9001',
    service_tier: 'Optimización $40',
    payment_status: 'paid',
    status: 'in_progress',
    assigned_to: '30000000-0000-4000-8000-000000000001',
    assigned_technician_id: '30000000-0000-4000-8000-000000000001',
    assigned_technician_name: 'Carlos Mendoza',
    created_at: '2026-11-13T09:00:00.000Z',
    claimed_at: '2026-11-13T09:02:00.000Z',
  };
  assert.equal(canClaimTicket(claimedTicket), false);

  const resolvedTicket: SupportTicket = {
    ...t1,
    id: '11111111-1111-4111-8111-111111111192',
    ticket_code: 'RS-9002',
    service_tier: 'Avanzado $55',
    payment_status: 'paid',
    status: 'resolved',
    created_at: '2026-11-13T08:00:00.000Z',
    claimed_at: '2026-11-13T08:04:00.000Z',
  };
  assert.equal(canClaimTicket(resolvedTicket), false);

  const sampleTickets: SupportTicket[] = [t1, claimedTicket, resolvedTicket];

  const metrics = computeDashboardMetrics(sampleTickets, '2026-11-13T12:00:00.000Z');
  assert.equal(metrics.pendingCount, 1);
  assert.equal(metrics.activeSessionsCount, 1);
  assert.equal(metrics.resolvedTodayCount, 1);
  assert.equal(metrics.revenueUsd, 95);

  const avgResponse = computeAverageResponseMinutes(sampleTickets);
  assert.equal(avgResponse.minutes, 3);
  assert.equal(avgResponse.formatted, '3.0 min');

  const summaryWithPrev = buildTechnicalResolutionSummary(t1, 'Se reinstaló perfil VPN.', true);
  assert.match(summaryWithPrev, /Se reinstaló perfil VPN\./);
  assert.match(summaryWithPrev, /Recomendación preventiva:/);

  const summaryWithoutPrev = buildTechnicalResolutionSummary(t1, 'Se reinstaló perfil VPN.', false);
  assert.equal(summaryWithoutPrev.includes('Recomendación preventiva:'), false);
});

test('parseAppRoute resolves /, /dashboard, /portal, and /sesion/[ticket_code]', () => {
  assert.deepEqual(parseAppRoute('/'), { view: 'tech_portal', ticketCode: null });
  assert.deepEqual(parseAppRoute('/dashboard'), { view: 'tech_portal', ticketCode: null });
  assert.deepEqual(parseAppRoute('/portal'), { view: 'landing', ticketCode: null });
  assert.deepEqual(parseAppRoute('/sesion/rs-8492'), {
    view: 'connection_room',
    ticketCode: 'RS-8492',
  });
});

test('isValidUuid validates RFC 4122 UUIDs and rejects legacy string IDs', () => {
  assert.equal(isValidUuid('00000000-0000-4000-8000-000000000001'), true);
  assert.equal(isValidUuid('11111111-1111-4111-8111-111111111107'), true);
  assert.equal(isValidUuid('org-rs365-hq'), false);
  assert.equal(isValidUuid('tech-lead-01'), false);
  assert.equal(isValidUuid(null), false);
});

test('getRustDeskInstallerUrl uses configured env URLs or official GitHub releases fallback', () => {
  assert.equal(
    getRustDeskInstallerUrl('Windows', 'temporary', {}),
    OFFICIAL_RUSTDESK_RELEASES_URL
  );
  assert.equal(
    getRustDeskInstallerUrl('Windows', 'temporary', {
      windowsUrl: 'https://cdn.remotesupport365.com/rustdesk-win.exe',
      macUrl: 'https://cdn.remotesupport365.com/rustdesk-mac.dmg',
    }),
    'https://cdn.remotesupport365.com/rustdesk-win.exe'
  );
  assert.equal(
    getRustDeskInstallerUrl('Mac', 'installed', {
      windowsUrl: 'https://cdn.remotesupport365.com/rustdesk-win.exe',
      macUrl: 'https://cdn.remotesupport365.com/rustdesk-mac.dmg',
    }),
    'https://cdn.remotesupport365.com/rustdesk-mac.dmg'
  );
});
