import nodemailer from 'nodemailer';

export interface GmailDeliveryResult {
  status: 'sent' | 'simulated' | 'failed';
  messageId?: string;
  error?: string;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function isGmailConfigured(): boolean {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.trim();
  return Boolean(
    user &&
      pass &&
      !user.includes('YOUR_') &&
      !pass.includes('YOUR_')
  );
}

async function sendGmailMessage(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<GmailDeliveryResult> {
  if (!isGmailConfigured()) {
    return { status: 'simulated' };
  }

  const gmailUser = process.env.GMAIL_USER!.trim();
  const gmailPass = process.env.GMAIL_APP_PASSWORD!.trim().replace(/\s+/g, '');

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"Remote Support 365 · Talento Técnico" <${gmailUser}>`,
      to: params.to,
      subject: params.subject,
      text: params.text,
      html: params.html,
    });

    return {
      status: 'sent',
      messageId: info.messageId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error SMTP Gmail';
    console.error('[gmailService] Error enviando correo:', message);
    return {
      status: 'failed',
      error: 'No se pudo enviar el correo vía Gmail SMTP.',
    };
  }
}

export async function sendTechnicianApprovedEmail(input: {
  to: string;
  fullName: string;
  modality: 'half_time' | 'full_time';
  specialties: string[];
  registerUrl: string;
  expiresHours?: number;
}): Promise<GmailDeliveryResult> {
  const expiresHours = input.expiresHours ?? 72;
  const safeName = escapeHtml(input.fullName);
  const modalityLabel =
    input.modality === 'full_time'
      ? 'Tiempo Completo (Full-time)'
      : 'Medio Tiempo (Half-time)';
  const safeSpecialties = input.specialties.map(escapeHtml).join(' · ') || 'Soporte Técnico Remoto';
  const safeUrl = escapeHtml(input.registerUrl);

  const subject = '¡Felicidades! Fuiste aceptado en Remote Support 365 — Completa tu registro';

  const text = [
    `Hola ${input.fullName},`,
    '',
    '¡Excelentes noticias! Has aprobado nuestra evaluación técnica y de actitudes para unirte a la red de especialistas de Remote Support 365.',
    '',
    `Modalidad aprobada: ${modalityLabel}`,
    `Especialidades: ${input.specialties.join(', ') || 'Soporte Técnico Remoto'}`,
    '',
    `Completa tu registro y activa tu acceso al Dashboard Operativo usando este enlace personal (válido por ${expiresHours} horas y de un solo uso):`,
    input.registerUrl,
    '',
    'Recuerda que tu cuenta opera bajo el Acuerdo de Confidencialidad Interno (NDA-TECH-v1.0-2026) aceptado en tu postulación.',
    '',
    'Bienvenido al equipo,',
    'Remote Support 365',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:24px;background-color:#F8FAFC;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0B192C;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
    <div style="background:#0B192C;padding:24px 28px;color:#FFFFFF;">
      <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#10B981;">Remote Support 365 · Red de Especialistas</p>
      <h1 style="margin:8px 0 0;font-size:20px;line-height:1.3;">¡Fuiste aceptado en nuestro equipo técnico!</h1>
    </div>
    <div style="padding:28px;font-size:14px;line-height:1.6;color:#334155;">
      <p style="margin-top:0;">Hola <strong>${safeName}</strong>,</p>
      <p>Revisamos tu evaluación de conocimientos técnicos y actitudes y nos alegra confirmarte que <strong>has sido aceptado</strong> para operar en Remote Support 365.</p>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px;margin:18px 0;font-size:13px;">
        <p style="margin:0 0 6px;"><strong>Modalidad:</strong> ${escapeHtml(modalityLabel)}</p>
        <p style="margin:0;"><strong>Especialidades aprobadas:</strong> ${safeSpecialties}</p>
      </div>
      <p>Haz clic en el siguiente botón para crear tu contraseña y activar tu acceso al <strong>Dashboard Operativo</strong>:</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${safeUrl}" style="display:inline-block;background:#2563EB;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:10px;">Completar mi registro técnico →</a>
      </div>
      <p style="font-size:12px;color:#64748B;margin-bottom:8px;">Este enlace es personal, de <strong>un solo uso</strong> y expira en <strong>${expiresHours} horas</strong>. Si no puedes hacer clic en el botón, copia y pega esta dirección en tu navegador:</p>
      <p style="font-size:11px;word-break:break-all;color:#1D4ED8;background:#EFF6FF;padding:10px;border-radius:8px;margin-top:0;">${safeUrl}</p>
      <hr style="border:none;border-top:1px solid #E2E8F0;margin:20px 0;" />
      <p style="font-size:11px;color:#64748B;margin:0;">Recuerda que toda sesión se rige por el Acuerdo de Confidencialidad Interno (NDA-TECH-v1.0-2026) firmado en tu postulación.</p>
    </div>
  </div>
</body>
</html>`;

  return sendGmailMessage({ to: input.to, subject, html, text });
}

export async function sendTechnicianRejectedEmail(input: {
  to: string;
  fullName: string;
}): Promise<GmailDeliveryResult> {
  const safeName = escapeHtml(input.fullName);
  const subject = 'Resultado de tu postulación — Remote Support 365';

  const text = [
    `Hola ${input.fullName},`,
    '',
    'Gracias por tomarte el tiempo de postular y completar la evaluación de Remote Support 365.',
    '',
    'En esta oportunidad no hemos podido avanzar con tu incorporación a la red de especialistas activos. Valoramos mucho tu interés y te invitamos a volver a postular en 60 días cuando actualices tu experiencia o certificaciones.',
    '',
    'Te deseamos mucho éxito,',
    'Equipo de Talento Técnico · Remote Support 365',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="es">
<body style="margin:0;padding:24px;background-color:#F8FAFC;font-family:Inter,Segoe UI,Arial,sans-serif;color:#0B192C;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;overflow:hidden;">
    <div style="background:#0B192C;padding:24px 28px;color:#FFFFFF;">
      <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#94A3B8;">Remote Support 365 · Talento Técnico</p>
      <h1 style="margin:8px 0 0;font-size:20px;line-height:1.3;">Gracias por tu postulación</h1>
    </div>
    <div style="padding:28px;font-size:14px;line-height:1.6;color:#334155;">
      <p style="margin-top:0;">Hola <strong>${safeName}</strong>,</p>
      <p>Agradecemos sinceramente el tiempo que dedicaste a completar nuestra evaluación técnica y de actitudes.</p>
      <p>En esta ocasión no podremos avanzar con tu ingreso a la red activa de especialistas. Te invitamos a fortalecer tu perfil y volver a postular en <strong>60 días</strong>.</p>
      <p style="margin-bottom:0;">Te deseamos mucho éxito en tus próximos proyectos,<br/><strong>Remote Support 365</strong></p>
    </div>
  </div>
</body>
</html>`;

  return sendGmailMessage({ to: input.to, subject, html, text });
}
