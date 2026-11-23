import { useEffect, useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  Copy,
  FileSignature,
  Loader2,
  Mail,
  RefreshCw,
  UserCheck,
  XCircle,
} from 'lucide-react';
import {
  decideTechnicianApplication,
  fetchTechnicianApplicationsForAdmin,
} from '../../services/technicianApplicationService';
import type { TechnicianApplication } from '../../types/support';

function getRecommendationBadge(
  rec: TechnicianApplication['recommendation']
): { label: string; className: string } {
  if (rec === 'recommended_approve') {
    return {
      label: 'Recomendado',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (rec === 'manual_review') {
    return {
      label: 'Revisión manual',
      className: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }
  return {
    label: 'Puntaje bajo',
    className: 'bg-rose-50 text-rose-800 border-rose-200',
  };
}

function getStatusBadge(status: TechnicianApplication['status']): {
  label: string;
  className: string;
} {
  if (status === 'approved') {
    return {
      label: 'Aceptado · Invitación enviada',
      className: 'bg-blue-50 text-[#1D4ED8] border-blue-200',
    };
  }
  if (status === 'registered') {
    return {
      label: 'Registrado y activo',
      className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (status === 'rejected') {
    return {
      label: 'No aceptado',
      className: 'bg-slate-100 text-slate-600 border-slate-200',
    };
  }
  return {
    label: 'Pendiente de revisión',
    className: 'bg-amber-50 text-amber-800 border-amber-200',
  };
}

export function TechnicianApplicationsPanel() {
  const [applications, setApplications] = useState<TechnicianApplication[]>([]);
  const [gmailConfigured, setGmailConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await fetchTechnicianApplicationsForAdmin();
      setApplications(res.applications);
      setGmailConfigured(res.gmailConfigured);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadList();
  }, []);

  const handleDecision = async (
    app: TechnicianApplication,
    decision: 'approved' | 'rejected'
  ) => {
    setProcessingId(app.id);
    setNotice(null);
    try {
      const res = await decideTechnicianApplication(app, decision);
      if (res.ok) {
        setApplications((prev) =>
          prev.map((item) => (item.id === app.id ? res.application : item))
        );
        const deliveryLabel =
          res.emailDeliveryStatus === 'sent'
            ? 'Correo enviado por Gmail SMTP.'
            : res.emailDeliveryStatus === 'simulated'
            ? 'Modo simulado (sin credenciales Gmail): enlace de registro listo para copiar.'
            : 'Decisión guardada, pero falló el envío SMTP.';
        setNotice(
          decision === 'approved'
            ? `${app.full_name} aprobado. ${deliveryLabel}`
            : `${app.full_name} marcado como no aceptado. ${deliveryLabel}`
        );
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleCopyUrl = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const pendingCount = applications.filter((a) => a.status === 'pending_review').length;

  return (
    <div
      data-testid="technician-applications-panel"
      className="bg-white border border-[#E5E9F2] rounded-2xl p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
              <span>Postulantes Técnicos (/postular)</span>
            </h3>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-mono text-[11px] font-bold">
                {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748B]">
            Revisa evaluaciones de conocimientos + actitud y aprueba en 1 clic para enviar
            el enlace único de registro (72 h) vía Gmail.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${
              gmailConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <Mail className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{gmailConfigured ? 'Gmail SMTP activo' : 'Gmail en modo simulado'}</span>
          </span>
          <button
            type="button"
            onClick={() => void loadList()}
            disabled={loading}
            aria-label="Actualizar postulantes"
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:text-[#0F172A] hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-2.5 text-xs font-medium text-[#1D4ED8] flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-[#2563EB]" aria-hidden="true" />
          <span>Cargando postulaciones...</span>
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center space-y-1">
          <p className="text-xs font-semibold text-[#0F172A]">
            Aún no hay postulaciones técnicas registradas
          </p>
          <p className="text-xs text-slate-500">
            Cuando un candidato complete la evaluación en <code>/postular</code>, aparecerá aquí
            listo para aprobación en 1 clic.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const recBadge = getRecommendationBadge(app.recommendation);
            const statusBadge = getStatusBadge(app.status);
            const isBusy = processingId === app.id;
            return (
              <div
                key={app.id}
                className="rounded-xl border border-[#E5E9F2] bg-[#FAFBFD] p-4 space-y-3"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-[#0F172A]">{app.full_name}</p>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${recBadge.className}`}
                      >
                        {recBadge.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <span className="font-mono">{app.email}</span> · {app.country} ·{' '}
                      <strong>
                        {app.modality === 'full_time' ? 'Full-time' : 'Half-time'}
                      </strong>
                    </p>
                  </div>

                  {/* Scores */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-mono tabular-nums shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                      Técnico: <strong>{app.technical_score}%</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700">
                      Actitud: <strong>{app.attitude_score}%</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#0B192C] text-white font-bold">
                      Total: {app.total_score}%
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-600">
                  <span>
                    <strong>Especialidades:</strong> {app.specialties.join(' · ')}
                  </span>
                  {app.certifications && (
                    <span className="inline-flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-600" aria-hidden="true" />
                      <span>{app.certifications}</span>
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <FileSignature className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>
                      NDA {app.nda_version} firmado por {app.nda_signed_name}
                    </span>
                  </span>
                </div>

                {app.debug_register_url && app.status === 'approved' && (
                  <div className="rounded-lg bg-blue-50/80 border border-blue-200 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                    <span className="text-[#1D4ED8] truncate">
                      <strong>Enlace único (simulado):</strong> {app.debug_register_url}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleCopyUrl(app.id, app.debug_register_url!)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-blue-200 text-[#1D4ED8] font-semibold hover:bg-blue-100 shrink-0"
                    >
                      {copiedId === app.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" aria-hidden="true" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" aria-hidden="true" />
                          <span>Copiar link</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {app.status !== 'registered' && (
                  <div className="pt-2 border-t border-slate-200/70 flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleDecision(app, 'rejected')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Rechazar y notificar</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => void handleDecision(app, 'approved')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                    >
                      {isBusy ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      <span>
                        {app.status === 'approved'
                          ? 'Reenviar link Gmail'
                          : 'Aprobar y enviar Gmail'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
