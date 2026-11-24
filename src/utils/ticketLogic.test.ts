import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessSection,
  canManageMemberRole,
  hasPermission,
} from './rbac';
import { computeOperationalTelemetry } from './telemetryLogic';
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
  getTechnicianCommissionTier,
  isAdultBirthDate,
  isValidUuid,
  LEGAL_TERMS_VERSION,
  NDA_CLIENT_VERSION,
  NDA_TECH_VERSION,
  normalizeRustDeskId,
  OFFICIAL_RUSTDESK_RELEASES_URL,
  parseAppRoute,
  TECHNICIAN_COMMISSION_TIERS,
  validateRegistrationPassword,
  validateRustDeskId,
  validateStep1,
  validateStep2,
  validateStep3,
} from './ticketLogic';
import {
  ASSESSMENT_DURATION_SECONDS,
  evaluateTechnicianAssessment,
  TECHNICIAN_ASSESSMENT_QUESTIONS,
} from './techEvaluation';
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

test('parseAppRoute resolves /postular and /trabaja-con-nosotros to technician_apply', () => {
  assert.deepEqual(parseAppRoute('/postular'), {
    view: 'technician_apply',
    ticketCode: null,
  });
  assert.deepEqual(parseAppRoute('/postular/'), {
    view: 'technician_apply',
    ticketCode: null,
  });
  assert.deepEqual(parseAppRoute('/POSTULAR'), {
    view: 'technician_apply',
    ticketCode: null,
  });
  assert.deepEqual(parseAppRoute('/trabaja-con-nosotros'), {
    view: 'technician_apply',
    ticketCode: null,
  });
});

test('NDA version constants expose official dual NDA identifiers', () => {
  assert.equal(NDA_CLIENT_VERSION, 'NDA-CLIENT-v1.0-2026');
  assert.equal(NDA_TECH_VERSION, 'NDA-TECH-v1.0-2026');
});

test('getTechnicianCommissionTier enforces approved 65/75/80/85% thresholds and handles edge inputs', () => {
  assert.deepEqual(
    TECHNICIAN_COMMISSION_TIERS.map((tier) => tier.commissionPercent),
    [65, 75, 80, 85]
  );

  // Base: 0 - 25 -> 65% (including negative and NaN defensive clamping)
  assert.equal(getTechnicianCommissionTier(-10).id, 'base');
  assert.equal(getTechnicianCommissionTier(-10).commissionPercent, 65);
  assert.equal(getTechnicianCommissionTier(Number.NaN).id, 'base');
  assert.equal(getTechnicianCommissionTier(Number.NaN).commissionPercent, 65);
  assert.equal(getTechnicianCommissionTier(0).commissionPercent, 65);
  assert.equal(getTechnicianCommissionTier(25).commissionPercent, 65);

  // Pro: 26 - 100 -> 75%
  assert.equal(getTechnicianCommissionTier(26).id, 'pro');
  assert.equal(getTechnicianCommissionTier(26).commissionPercent, 75);
  assert.equal(getTechnicianCommissionTier(100).commissionPercent, 75);

  // Senior: 101 - 250 -> 80%
  assert.equal(getTechnicianCommissionTier(101).id, 'senior');
  assert.equal(getTechnicianCommissionTier(101).commissionPercent, 80);
  assert.equal(getTechnicianCommissionTier(250).commissionPercent, 80);

  // Elite: 251 - 500+ -> 85%
  assert.equal(getTechnicianCommissionTier(251).id, 'elite');
  assert.equal(getTechnicianCommissionTier(251).commissionPercent, 85);
  assert.equal(getTechnicianCommissionTier(500).commissionPercent, 85);
  assert.equal(getTechnicianCommissionTier(900).commissionPercent, 85);
});

test('evaluateTechnicianAssessment scores technical/attitude dimensions and recommendation rules', () => {
  assert.equal(ASSESSMENT_DURATION_SECONDS, 900);
  assert.equal(TECHNICIAN_ASSESSMENT_QUESTIONS.length, 10);

  const technicalQuestions = TECHNICIAN_ASSESSMENT_QUESTIONS.filter(
    (q) => q.dimension === 'technical'
  );
  const attitudeQuestions = TECHNICIAN_ASSESSMENT_QUESTIONS.filter(
    (q) => q.dimension === 'attitude'
  );
  assert.equal(technicalQuestions.length, 5);
  assert.equal(attitudeQuestions.length, 5);

  // 10/10 -> recommended_approve
  const allCorrect: Record<string, string> = {};
  for (const q of TECHNICIAN_ASSESSMENT_QUESTIONS) {
    allCorrect[q.id] = q.correctOptionId;
  }
  const perfect = evaluateTechnicianAssessment(allCorrect);
  assert.equal(perfect.technicalScore, 100);
  assert.equal(perfect.attitudeScore, 100);
  assert.equal(perfect.totalScore, 100);
  assert.equal(perfect.unansweredCount, 0);
  assert.equal(perfect.recommendation, 'recommended_approve');

  // 4/5 technical (80%) + 4/5 attitude (80%) -> total 80% -> recommended_approve
  const solidAnswers: Record<string, string> = {};
  technicalQuestions.forEach((q, idx) => {
    solidAnswers[q.id] = idx < 4 ? q.correctOptionId : 'wrong';
  });
  attitudeQuestions.forEach((q, idx) => {
    solidAnswers[q.id] = idx < 4 ? q.correctOptionId : 'wrong';
  });
  const solid = evaluateTechnicianAssessment(solidAnswers);
  assert.equal(solid.technicalScore, 80);
  assert.equal(solid.attitudeScore, 80);
  assert.equal(solid.totalScore, 80);
  assert.equal(solid.recommendation, 'recommended_approve');

  // Edge case: 5/5 technical (100%) + 3/5 attitude (60%) -> total 80% >= 75, but attitude < 80 -> manual_review
  const lowAttitudeAnswers: Record<string, string> = {};
  technicalQuestions.forEach((q) => {
    lowAttitudeAnswers[q.id] = q.correctOptionId;
  });
  attitudeQuestions.forEach((q, idx) => {
    lowAttitudeAnswers[q.id] = idx < 3 ? q.correctOptionId : 'wrong';
  });
  const lowAttitude = evaluateTechnicianAssessment(lowAttitudeAnswers);
  assert.equal(lowAttitude.technicalScore, 100);
  assert.equal(lowAttitude.attitudeScore, 60);
  assert.equal(lowAttitude.totalScore, 80);
  assert.equal(lowAttitude.recommendation, 'manual_review');

  // 3/5 technical + 3/5 attitude -> total 60% -> manual_review
  const midAnswers: Record<string, string> = {};
  technicalQuestions.forEach((q, idx) => {
    midAnswers[q.id] = idx < 3 ? q.correctOptionId : 'wrong';
  });
  attitudeQuestions.forEach((q, idx) => {
    midAnswers[q.id] = idx < 3 ? q.correctOptionId : 'wrong';
  });
  const mid = evaluateTechnicianAssessment(midAnswers);
  assert.equal(mid.totalScore, 60);
  assert.equal(mid.recommendation, 'manual_review');

  // Empty answers -> 0% -> recommended_reject
  const empty = evaluateTechnicianAssessment({});
  assert.equal(empty.totalScore, 0);
  assert.equal(empty.unansweredCount, 10);
  assert.equal(empty.recommendation, 'recommended_reject');
});

test('parseAppRoute resolves /registro-tecnico to technician_register', () => {
  assert.deepEqual(parseAppRoute('/registro-tecnico'), {
    view: 'technician_register',
    ticketCode: null,
  });
  assert.deepEqual(parseAppRoute('/REGISTRO-TECNICO/'), {
    view: 'technician_register',
    ticketCode: null,
  });
});

test('validateRegistrationPassword enforces min 8 chars, letters + numbers, and match', () => {
  assert.equal(validateRegistrationPassword('abc123', 'abc123').valid, false);
  assert.equal(validateRegistrationPassword('abcdefgh', 'abcdefgh').valid, false);
  assert.equal(validateRegistrationPassword('12345678', '12345678').valid, false);
  assert.equal(validateRegistrationPassword('Soporte2026', 'Otra2026').valid, false);
  assert.equal(validateRegistrationPassword('Soporte2026', 'Soporte2026').valid, true);
});

test('Phase 3 RBAC governance enforces role hierarchy and section permissions', () => {
  assert.equal(hasPermission('owner', 'rbac:manage'), true);
  assert.equal(hasPermission('admin', 'applications:review'), true);
  assert.equal(hasPermission('technician', 'tickets:claim'), true);
  assert.equal(hasPermission('technician', 'rbac:manage'), false);
  assert.equal(hasPermission('technician', 'applications:review'), false);

  assert.equal(canAccessSection('owner', 'security'), true);
  assert.equal(canAccessSection('admin', 'settings'), true);
  assert.equal(canAccessSection('technician', 'tickets'), true);
  assert.equal(canAccessSection('technician', 'security'), false);
  assert.equal(canAccessSection('technician', 'settings'), false);

  assert.equal(canManageMemberRole('owner', 'admin', 'owner'), true);
  assert.equal(canManageMemberRole('admin', 'technician', 'admin'), true);
  assert.equal(canManageMemberRole('admin', 'owner', 'technician'), false);
  assert.equal(canManageMemberRole('admin', 'technician', 'owner'), false);
  assert.equal(canManageMemberRole('technician', 'technician', 'admin'), false);
});

test('Phase 3 computeOperationalTelemetry aggregates AI quota, sessions, and OS breakdown', () => {
  const sampleTicket = createTicketFromDraft({
    step: 3,
    category: 'Windows lento o bajo rendimiento',
    operatingSystem: 'Windows',
    serviceTier: 'Optimización $29',
    description: 'Equipo lento al iniciar',
    clientName: 'Ana Pérez',
    clientEmail: 'ana@example.com',
    birthDate: '1992-05-10',
    termsAccepted: true,
    marketingOptIn: false,
  });

  const snapshot = computeOperationalTelemetry({
    tickets: [sampleTicket],
    sessions: [
      {
        id: '00000000-0000-4000-8000-000000000101',
        organization_id: '00000000-0000-4000-8000-000000000001',
        ticket_code: sampleTicket.ticket_code,
        client_name: 'Ana Pérez',
        technician_name: 'Carlos Mendoza',
        rustdesk_id: '123456789',
        agent_type: 'temporary',
        status: 'active',
        started_at: new Date().toISOString(),
        ended_at: null,
        duration_minutes: 18,
      },
    ],
    devices: [
      {
        id: '00000000-0000-4000-8000-000000000201',
        organization_id: '00000000-0000-4000-8000-000000000001',
        client_name: 'Ana Pérez',
        client_email: 'ana@example.com',
        device_name: 'PC-ANA-01',
        os_type: 'Windows',
        rustdesk_id: '123456789',
        agent_type: 'installed',
        plan_name: 'Pyme Esencial',
        is_online: true,
        last_seen_at: new Date().toISOString(),
      },
    ],
    aiAgents: [],
    organization: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Remote Support 365',
      slug: 'remote-support-365',
      plan_tier: 'internal_hq',
      dispatch_mode: 'smart',
      rustdesk_relay_domain: '',
      payment_gateway: 'stripe_paypal',
      ai_credits_monthly: 500,
      ai_credits_used: 125,
      created_at: new Date().toISOString(),
    },
  });

  assert.equal(snapshot.totalTickets, 1);
  assert.equal(snapshot.activeSessionsCount, 1);
  assert.equal(snapshot.avgSessionDurationMin, 18);
  assert.equal(snapshot.onlineDevicesCount, 1);
  assert.equal(snapshot.aiCreditsUsed, 125);
  assert.equal(snapshot.aiQuotaUtilizationPct, 25);
  assert.deepEqual(snapshot.osBreakdown, [
    { os: 'Windows', count: 1, pct: 100 },
  ]);
});



