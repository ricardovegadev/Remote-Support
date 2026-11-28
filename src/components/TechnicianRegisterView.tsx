import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  completeTechnicianRegistration,
  verifyTechnicianInviteToken,
  type VerifiedTechnicianInvite,
} from '../services/technicianApplicationService';
import type {
  TechnicianSpecialty,
  UserAccountProfile,
  WorkModality,
} from '../types/support';
import { validateRegistrationPassword } from '../utils/ticketLogic';
import type { LegalDocTab } from './LegalDocsModal';

interface TechnicianRegisterViewProps {
  onReturnHome: () => void;
  onOpenLegalDoc: (tab: LegalDocTab) => void;
  onRegistered: (payload: {
    profile: UserAccountProfile;
    specialties?: TechnicianSpecialty[];
    modality?: WorkModality;
  }) => void;
}

export function TechnicianRegisterView({
  onReturnHome,
  onOpenLegalDoc,
  onRegistered,
}: TechnicianRegisterViewProps) {
  const [token] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    return new URLSearchParams(window.location.search).get('token')?.trim() ?? '';
  });

  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [invite, setInvite] = useState<VerifiedTechnicianInvite | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmNda, setConfirmNda] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registeredOk, setRegisteredOk] = useState(false);

  useEffect(() => {
    let active = true;
    if (!token) {
      setLoadingInvite(false);
      setInviteCode('invalid');
      setInviteError(
        'Falta el token de invitación en el enlace. Abre el vínculo exacto que recibiste en tu correo de aceptación.'
      );
      return;
    }

    void verifyTechnicianInviteToken(token).then((res) => {
      if (!active) return;
      if (res.ok && res.invite) {
        setInvite(res.invite);
        setInviteError(null);
      } else {
        setInviteCode(res.code ?? 'invalid');
        setInviteError(res.error ?? 'Enlace de invitación inválido o expirado.');
      }
      setLoadingInvite(false);
    });

    return () => {
      active = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const pwCheck = validateRegistrationPassword(password, confirmPassword);
    if (!pwCheck.valid) {
      setFormError(pwCheck.error ?? 'Contraseña inválida.');
      return;
    }
    if (!confirmNda) {
      setFormError(
        'Debes confirmar la vigencia del Acuerdo de Confidencialidad Interno (NDA).'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await completeTechnicianRegistration({
        token,
        password,
        confirmNda,
      });
      if (!res.ok || !res.profile) {
        setFormError(res.error ?? 'No se pudo activar tu cuenta de técnico.');
        return;
      }
      // Auto-login en Supabase Auth para ingresar autenticado directo a /dashboard
      try {
        const { getSupabaseClient } = await import('../lib/supabaseClient');
        const supabase = getSupabaseClient();
        if (supabase && res.profile.email) {
          await supabase.auth.signInWithPassword({
            email: res.profile.email,
            password,
          });
        }
      } catch {
        // Si falla el auto-login silencioso, el operador puede iniciar sesión con su nueva contraseña
      }
      setRegisteredOk(true);
      onRegistered({
        profile: res.profile,
        specialties: res.specialties,
        modality: res.modality,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const assignedRole = invite?.assigned_role ?? 'technician';
  const roleDisplayMeta =
    assignedRole === 'admin'
      ? {
          eyebrow: 'Alta de Administrador Invitado',
          heading: 'Completa tu registro de Administrador',
          badge: 'Rol: Administrador',
          cta: 'Activar mi cuenta de Administrador',
          submitting: 'Activando cuenta de Administrador...',
          successTitle: '¡Cuenta de Administrador activada!',
          successBody:
            'Ya tienes acceso al Centro de Operaciones con permisos administrativos para gestionar la operación.',
        }
      : assignedRole === 'supervisor'
      ? {
          eyebrow: 'Alta de Supervisor Invitado',
          heading: 'Completa tu registro de Supervisor',
          badge: 'Rol: Supervisor',
          cta: 'Activar mi cuenta de Supervisor',
          submitting: 'Activando cuenta de Supervisor...',
          successTitle: '¡Cuenta de Supervisor activada!',
          successBody:
            'Ya tienes acceso al Centro de Operaciones para coordinar la cola de tickets y el equipo de especialistas.',
        }
      : {
          eyebrow: 'Alta de Especialista Aprobado',
          heading: 'Completa tu registro técnico',
          badge: 'Rol: Especialista Técnico',
          cta: 'Activar mi cuenta de Técnico',
          submitting: 'Activando cuenta técnica...',
          successTitle: '¡Cuenta técnica activada!',
          successBody:
            'Ya tienes acceso al Dashboard Operativo para activar tu estado en línea y atender incidencias según tus especialidades.',
        };

  return (
    <section className="py-12 sm:py-16 bg-[#F8FAFC] min-h-[calc(100vh-10rem)]">
      <div className="max-w-xl mx-auto px-4 sm:px-6 space-y-6">
        <button
          type="button"
          onClick={onReturnHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0B192C] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Volver a Remote Support 365</span>
        </button>

        <div
          data-testid="technician-register-card"
          className="bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 overflow-hidden"
        >
          <div className="px-6 py-5 bg-[#0B192C] text-white flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-white/10 text-[#10B981] flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#10B981]">
                {roleDisplayMeta.eyebrow}
              </p>
              <h1 className="text-lg font-bold leading-tight">
                {roleDisplayMeta.heading}
              </h1>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {loadingInvite ? (
              <div className="py-10 text-center space-y-3">
                <Loader2
                  className="w-7 h-7 text-[#2563EB] animate-spin mx-auto"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium text-slate-700">
                  Verificando tu enlace de invitación único...
                </p>
              </div>
            ) : inviteError || !invite ? (
              <div role="alert" className="space-y-4 text-center py-4">
                <span className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-6 h-6" aria-hidden="true" />
                </span>
                <div className="space-y-1.5">
                  <h2 className="text-base font-bold text-[#0B192C]">
                    {inviteCode === 'used'
                      ? 'Este enlace ya fue utilizado'
                      : inviteCode === 'expired'
                      ? 'Este enlace ha expirado'
                      : 'Enlace de invitación no válido'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
                    {inviteError}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onReturnHome}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-slate-800 text-white text-xs font-semibold transition-colors"
                >
                  <span>Ir al inicio</span>
                </button>
              </div>
            ) : registeredOk ? (
              <div className="py-6 text-center space-y-4">
                <span className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
                </span>
                <h2 className="text-lg font-bold text-[#0B192C]">
                  {roleDisplayMeta.successTitle}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600">
                  {roleDisplayMeta.successBody}
                </p>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5" noValidate>
                {/* Read-only approved profile summary */}
                <div className="rounded-2xl bg-[#F8FAFC] border border-slate-200/90 p-4 space-y-2.5 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-[#0B192C] text-sm">
                      {invite.full_name}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        data-testid="invite-assigned-role-badge"
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] font-semibold text-[11px]"
                      >
                        <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                        <span>{roleDisplayMeta.badge}</span>
                      </span>
                      {assignedRole === 'technician' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                          <Briefcase className="w-3 h-3" aria-hidden="true" />
                          {invite.modality === 'full_time'
                            ? 'Disponibilidad amplia'
                            : 'Disponibilidad parcial'}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-slate-600 font-mono">{invite.email}</p>
                  {invite.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {invite.specialties.map((spec) => (
                        <span
                          key={spec}
                          className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 text-[11px] font-medium"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Password fields */}
                <div className="space-y-3.5">
                  <div>
                    <label
                      htmlFor="tech-reg-password"
                      className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                    >
                      Crea tu contraseña de acceso *
                    </label>
                    <div className="relative">
                      <Lock
                        className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id="tech-reg-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 8 caracteres (letras y números)"
                        className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-base sm:text-sm text-[#0B192C] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#0B192C]"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="tech-reg-confirm-password"
                      className="block text-xs font-semibold text-[#0B192C] mb-1.5"
                    >
                      Confirmar contraseña *
                    </label>
                    <input
                      id="tech-reg-confirm-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite tu contraseña"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base sm:text-sm text-[#0B192C] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                {/* NDA re-confirmation */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-start gap-3">
                  <input
                    id="tech-reg-nda"
                    type="checkbox"
                    checked={confirmNda}
                    onChange={(e) => setConfirmNda(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed">
                    <label htmlFor="tech-reg-nda" className="cursor-pointer">
                      Confirmo mi adhesión vigente al{' '}
                    </label>
                    <button
                      type="button"
                      onClick={() => onOpenLegalDoc('nda')}
                      className="font-semibold text-[#2563EB] underline underline-offset-2"
                    >
                      Acuerdo de Confidencialidad Interno ({invite.nda_version})
                    </button>
                    . *
                  </span>
                </div>

                {formError && (
                  <div
                    role="alert"
                    className="rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs text-red-800"
                  >
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-60 text-white text-sm font-semibold shadow-md shadow-blue-600/20 transition-all"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      <span>{roleDisplayMeta.submitting}</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                      <span>{roleDisplayMeta.cta}</span>
                      <ArrowRight className="w-4 h-4" aria-hidden="true" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
