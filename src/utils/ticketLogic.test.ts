import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADULT_RESTRICTION_ERROR,
  buildRustDeskDeepLink,
  buildTechnicalResolutionSummary,
  calculateAgeFromBirthDate,
  canClaimTicket,
  CATEGORY_OPTIONS,
  computeAverageResponseMinutes,
  computeDashboardMetrics,
  createTicketFromDraft,
  formatRustDeskId,
  generateTicketCode,
  getDiscountPercent,
  getInitials,
  getRustDeskInstallerUrl,
  getServiceTierPriceUsd,
  getServiceTierRegularPriceUsd,
  getSuggestedTierForCategory,
  isAdultBirthDate,
  isValidUuid,
  LEGAL_TERMS_VERSION,
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
    serviceTier: 'Express $15',
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
  // Under-18 user must be blocked
  const under18Result = validateStep3({
    ...emptyDraft,
    clientName: 'Laura Mendoza',
    clientEmail: 'laura@estudio.ec',
    birthDate: '2012-06-15',
    termsAccepted: true,
  });
  assert.equal(under18Result.valid, false);
  assert.equal(under18Result.errors.birthDate, ADULT_RESTRICTION_ERROR);

  // Unchecked terms must be blocked
  const noTermsResult = validateStep3({
    ...emptyDraft,
    clientName: 'Laura Mendoza',
    clientEmail: 'laura@estudio.ec',
    birthDate: '1992-05-14',
    termsAccepted: false,
  });
  assert.equal(noTermsResult.valid, false);

  assert.equal(
    validateStep3({
      ...emptyDraft,
      clientName: 'Laura Mendoza',
      clientEmail: 'laura@estudio.ec',
      birthDate: '1992-05-14',
      termsAccepted: true,
    }).valid,
    true
  );
});

test('calculateAgeFromBirthDate and isAdultBirthDate enforce strict +18 boundary', () => {
  const ref = new Date(Date.UTC(2026, 10, 18)); // 2026-11-18
  assert.equal(calculateAgeFromBirthDate('2008-11-18', ref), 18);
  assert.equal(isAdultBirthDate('2008-11-18', ref), true);
  assert.equal(calculateAgeFromBirthDate('2008-11-19', ref), 17);
  assert.equal(isAdultBirthDate('2008-11-19', ref), false);
  assert.equal(calculateAgeFromBirthDate('2026-02-30', ref), null);
  assert.equal(calculateAgeFromBirthDate('2027-01-01', ref), null);
});

test('createTicketFromDraft, computeDashboardMetrics, and computeAverageResponseMinutes calculate KPIs accurately', () => {
  const t1 = createTicketFromDraft(
    {
      step: 3,
      category: 'Redes/Wi-Fi',
      operatingSystem: 'Windows',
      serviceTier: 'Express $15',
      description: 'VPN corporativa falla al autenticar desde casa',
      clientName: 'Carlos Andrade',
      clientEmail: 'Carlos@Empresa.com',
      birthDate: '1990-03-22',
      termsAccepted: true,
      marketingOptIn: false,
    },
    { nowIso: '2026-11-13T10:00:00.000Z', randomFn: () => 0.42 }
  );

  assert.match(t1.ticket_code, /^RS-\d{4}$/);
  assert.equal(t1.status, 'waiting_payment');
  assert.equal(t1.payment_status, 'pending');
  assert.equal(t1.is_adult_verified, true);
  assert.equal(t1.terms_version, LEGAL_TERMS_VERSION);
  assert.equal(t1.terms_accepted_at, '2026-11-13T10:00:00.000Z');
  assert.equal(t1.marketing_opt_in, false);
  assert.equal(getServiceTierPriceUsd('Avanzado $39'), 39);
  assert.equal(canClaimTicket(t1), true);

  const claimedTicket: SupportTicket = {
    ...t1,
    id: '11111111-1111-4111-8111-111111111191',
    ticket_code: 'RS-9001',
    service_tier: 'Optimización $29',
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
    service_tier: 'Avanzado $39',
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
  assert.equal(metrics.revenueUsd, 68);

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
  assert.deepEqual(parseAppRoute('/'), { view: 'landing', ticketCode: null });
  assert.deepEqual(parseAppRoute('/portal'), { view: 'landing', ticketCode: null });
  assert.deepEqual(parseAppRoute('/dashboard'), { view: 'tech_portal', ticketCode: null });
  assert.deepEqual(parseAppRoute('/ruta-inexistente'), { view: 'landing', ticketCode: null });
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

test('getRustDeskInstallerUrl uses configured custom env URLs or /api/rustdesk/official-download fallback', () => {
  assert.equal(
    getRustDeskInstallerUrl('Windows', 'temporary', {}),
    '/api/rustdesk/official-download?os=Windows'
  );
  assert.equal(
    getRustDeskInstallerUrl('Mac', 'temporary', {
      macUrl: OFFICIAL_RUSTDESK_RELEASES_URL,
    }),
    '/api/rustdesk/official-download?os=Mac'
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
  assert.equal(
    getRustDeskInstallerUrl('Linux', 'temporary', {}),
    '/api/rustdesk/official-download?os=Linux'
  );
  assert.equal(
    getRustDeskInstallerUrl('Mobile', 'temporary', {}),
    '/api/rustdesk/official-download?os=Mobile'
  );
});

test('getServiceTierRegularPriceUsd and getDiscountPercent calculate launch savings accurately', () => {
  assert.equal(getServiceTierRegularPriceUsd('Express $15'), 25);
  assert.equal(getServiceTierRegularPriceUsd('Optimización $29'), 40);
  assert.equal(getServiceTierRegularPriceUsd('Avanzado $39'), 55);
  assert.equal(getServiceTierPriceUsd('Pyme Esencial $39/mes'), 39);
  assert.equal(getServiceTierRegularPriceUsd('Pyme Esencial $39/mes'), 59);
  assert.equal(getServiceTierPriceUsd('Pyme Corporativo $79/mes'), 79);
  assert.equal(getServiceTierRegularPriceUsd('Pyme Corporativo $79/mes'), 99);
  assert.equal(getDiscountPercent(15, 25), 40);
  assert.equal(getDiscountPercent(29, 40), 28);
  assert.equal(getDiscountPercent(39, 55), 29);
  assert.equal(getDiscountPercent(79, 99), 20);
  assert.equal(getDiscountPercent(50, 50), 0);
});

test('createTicketFromDraft supports Pyme monthly plans with accurate $79/mes billing', () => {
  const pymeTicket = createTicketFromDraft(
    {
      step: 3,
      category: 'Otro',
      operatingSystem: 'Windows',
      serviceTier: 'Pyme Corporativo $79/mes',
      billingMode: 'pyme_monthly',
      description: 'Activación de monitoreo continuo para 15 estaciones',
      clientName: 'Clínica Central',
      clientEmail: 'ti@clinicacentral.ec',
      birthDate: '1988-09-10',
      termsAccepted: true,
      marketingOptIn: false,
    },
    { nowIso: '2026-11-18T10:00:00.000Z', randomFn: () => 0.25 }
  );

  assert.equal(pymeTicket.service_tier, 'Pyme Corporativo $79/mes');
  assert.equal(getServiceTierPriceUsd(pymeTicket.service_tier), 79);
  assert.equal(pymeTicket.billing_mode, 'pyme_monthly');
  assert.equal(pymeTicket.subscription_status, 'none');
  assert.equal(pymeTicket.agent_type, 'installed');
  assert.equal(pymeTicket.priority, 'high');
});

test('10-service launch catalog maps suggested tiers accurately and preserves legacy categories', () => {
  assert.equal(CATEGORY_OPTIONS.length, 10);

  // Express $15
  assert.equal(getSuggestedTierForCategory('Aplicaciones que no arrancan'), 'Express $15');
  assert.equal(getSuggestedTierForCategory('Problemas de Wi-Fi o red'), 'Express $15');
  assert.equal(getSuggestedTierForCategory('Errores de Microsoft 365 y Outlook'), 'Express $15');
  assert.equal(getSuggestedTierForCategory('Configuración de impresoras'), 'Express $15');

  // Optimización $29
  assert.equal(getSuggestedTierForCategory('Windows lento o bajo rendimiento'), 'Optimización $29');
  assert.equal(getSuggestedTierForCategory('Eliminación de malware y virus'), 'Optimización $29');
  assert.equal(getSuggestedTierForCategory('Actualizaciones de Windows'), 'Optimización $29');

  // Avanzado $39
  assert.equal(getSuggestedTierForCategory('Pantallazos azules (BSOD)'), 'Avanzado $39');
  assert.equal(getSuggestedTierForCategory('Recuperación de archivos'), 'Avanzado $39');
  assert.equal(getSuggestedTierForCategory('VPN y acceso remoto'), 'Avanzado $39');

  // Retrocompatibilidad con categorías heredadas
  assert.equal(getSuggestedTierForCategory('Impresoras'), 'Express $15');
  assert.equal(getSuggestedTierForCategory('Correo/Office'), 'Express $15');
  assert.equal(getSuggestedTierForCategory('Sistema Operativo/Lentitud'), 'Optimización $29');
  assert.equal(getSuggestedTierForCategory('Redes/Wi-Fi'), 'Express $15');
  assert.equal(getSuggestedTierForCategory('Otro'), 'Express $15');
});

test('createTicketFromDraft generates cryptographic 64-char hex client_session_token when randomFn is omitted', () => {
  const baseDraft: WizardDraft = {
    step: 3,
    category: 'Errores de Microsoft 365 y Outlook',
    operatingSystem: 'Windows',
    serviceTier: 'Express $15',
    billingMode: 'one_time',
    description: 'Outlook no sincroniza correos tras actualizar Windows',
    clientName: 'Ana Lucía Paredes',
    clientEmail: 'ana@empresa.ec',
    birthDate: '1991-04-12',
    termsAccepted: true,
    marketingOptIn: false,
  };

  const tA = createTicketFromDraft(baseDraft);
  const tB = createTicketFromDraft(baseDraft);

  assert.match(tA.client_session_token, /^[a-f0-9]{64}$/);
  assert.match(tB.client_session_token, /^[a-f0-9]{64}$/);
  assert.notEqual(tA.client_session_token, tB.client_session_token);
  assert.equal(tA.consent_accepted, false);
});


