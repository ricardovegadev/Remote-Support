import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Lock,
  LogOut,
  ShieldCheck,
  Trash2,
  UserCheck,
  X,
} from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabaseClient';
import type { UserAccountProfile } from '../types/support';
import {
  ADULT_RESTRICTION_ERROR,
  calculateAgeFromBirthDate,
  generateUuid,
  isValidEmail,
  LEGAL_TERMS_VERSION,
} from '../utils/ticketLogic';
import type { LegalDocTab } from './LegalDocsModal';

interface AuthModalProps {
  isOpen: boolean;
  currentUser: UserAccountProfile | null;
  onClose: () => void;
  onAuthenticated: (profile: UserAccountProfile) => void;
  onSignOut: () => void;
  onOpenLegalDoc: (tab: LegalDocTab) => void;
  onExportUserData: () => void;
  onDeleteUserData: () => void;
}

export function AuthModal({
  isOpen,
  currentUser,
  onClose,
  onAuthenticated,
  onSignOut,
  onOpenLegalDoc,
  onExportUserData,
  onDeleteUserData,
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!isOpen) return;
    setAuthError(null);
    setConfirmDeleteOpen(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured && !import.meta.env.DEV) {
      setAuthError('El acceso está deshabilitado: falta configurar el servicio de autenticación.');
      return;
    }
    if (!isValidEmail(email) || password.trim().length < 6) {
      setAuthError('Ingresa un correo válido y una contraseña de al menos 6 caracteres.');
      return;
    }
    setAuthError(null);
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (supabaseConfigured) {
        const supabase = getSupabaseClient();
        if (!supabase) {
          setAuthError('Cliente Supabase no disponible.');
          return;
        }
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error || !data.user) {
          setAuthError(
            error ? `No se pudo iniciar sesión: ${error.message}` : 'Credenciales inválidas.'
          );
          return;
        }
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select(
            'full_name,email,role,birth_date,is_adult_verified,terms_accepted_at,terms_version,marketing_opt_in,subscription_plan,subscription_status,created_at'
          )
          .eq('id', data.user.id)
          .maybeSingle();

        const meta = data.user.user_metadata ?? {};
        const dbRole = dbProfile?.role;
        const resolvedRole: UserAccountProfile['role'] =
          dbRole === 'admin' || dbRole === 'technician' || dbRole === 'client'
            ? dbRole
            : 'client';
        const dbSubStatus = dbProfile?.subscription_status;
        const resolvedSubStatus: UserAccountProfile['subscription_status'] =
          dbSubStatus === 'active' ||
          dbSubStatus === 'past_due' ||
          dbSubStatus === 'canceled' ||
          dbSubStatus === 'none'
            ? dbSubStatus
            : 'none';

        const profile: UserAccountProfile = {
          id: data.user.id,
          full_name:
            (typeof dbProfile?.full_name === 'string' && dbProfile.full_name.trim()) ||
            (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
            cleanEmail.split('@')[0],
          email:
            (typeof dbProfile?.email === 'string' && dbProfile.email.trim()) ||
            data.user.email ||
            cleanEmail,
          role: resolvedRole,
          birth_date:
            (typeof dbProfile?.birth_date === 'string' && dbProfile.birth_date) ||
            (typeof meta.birth_date === 'string' ? meta.birth_date : ''),
          is_adult_verified:
            typeof dbProfile?.is_adult_verified === 'boolean'
              ? dbProfile.is_adult_verified
              : Boolean(meta.is_adult_verified),
          terms_accepted_at:
            (typeof dbProfile?.terms_accepted_at === 'string' &&
              dbProfile.terms_accepted_at) ||
            (typeof meta.terms_accepted_at === 'string'
              ? meta.terms_accepted_at
              : ''),
          terms_version:
            (typeof dbProfile?.terms_version === 'string' && dbProfile.terms_version) ||
            (typeof meta.terms_version === 'string'
              ? meta.terms_version
              : LEGAL_TERMS_VERSION),
          marketing_opt_in:
            typeof dbProfile?.marketing_opt_in === 'boolean'
              ? dbProfile.marketing_opt_in
              : Boolean(meta.marketing_opt_in),
          subscription_plan:
            typeof dbProfile?.subscription_plan === 'string'
              ? dbProfile.subscription_plan
              : null,
          subscription_status: resolvedSubStatus,
          created_at:
            (typeof dbProfile?.created_at === 'string' && dbProfile.created_at) ||
            data.user.created_at ||
            new Date().toISOString(),
        };
        onAuthenticated(profile);
        onClose();
        return;
      }

      const nowIso = new Date().toISOString();
      onAuthenticated({
        id: generateUuid(),
        full_name: cleanEmail.split('@')[0],
        email: cleanEmail,
        role: 'client',
        birth_date: '1990-01-01',
        is_adult_verified: true,
        terms_accepted_at: nowIso,
        terms_version: LEGAL_TERMS_VERSION,
        marketing_opt_in: false,
        subscription_status: 'none',
        created_at: nowIso,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseConfigured && !import.meta.env.DEV) {
      setAuthError('El registro está deshabilitado: falta configurar el servicio de autenticación.');
      return;
    }
    if (fullName.trim().length < 2) {
      setAuthError('Ingresa tu nombre completo.');
      return;
    }
    if (!isValidEmail(email)) {
      setAuthError('Ingresa un correo electrónico válido.');
      return;
    }
    if (password.trim().length < 6) {
      setAuthError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    const age = calculateAgeFromBirthDate(birthDate);
    if (age === null) {
      setAuthError(
        'Ingresa tu fecha de nacimiento válida para verificar que eres mayor de 18 años.'
      );
      return;
    }
    if (age < 18) {
      setAuthError(ADULT_RESTRICTION_ERROR);
      return;
    }
    if (!termsAccepted) {
      setAuthError(
        'Debes aceptar los Términos y Condiciones, la Política de Privacidad y la Política de Reembolsos.'
      );
      return;
    }

    setAuthError(null);
    setLoading(true);
    const nowIso = new Date().toISOString();
    const cleanEmail = email.trim().toLowerCase();

    try {
      if (supabaseConfigured) {
        const supabase = getSupabaseClient();
        if (!supabase) {
          setAuthError('Cliente Supabase no disponible.');
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              birth_date: birthDate,
              is_adult_verified: true,
              terms_accepted_at: nowIso,
              terms_version: LEGAL_TERMS_VERSION,
              marketing_opt_in: marketingOptIn,
            },
          },
        });
        if (error) {
          setAuthError(`No se pudo completar el registro: ${error.message}`);
          return;
        }
        if (!data.session) {
          setAuthError(
            'Cuenta creada. Revisa tu correo electrónico para confirmar tu cuenta antes de iniciar sesión.'
          );
          setMode('login');
          return;
        }
        onAuthenticated({
          id: data.user?.id ?? generateUuid(),
          full_name: fullName.trim(),
          email: cleanEmail,
          role: 'client',
          birth_date: birthDate,
          is_adult_verified: true,
          terms_accepted_at: nowIso,
          terms_version: LEGAL_TERMS_VERSION,
          marketing_opt_in: marketingOptIn,
          subscription_status: 'none',
          created_at: nowIso,
        });
        onClose();
        return;
      }

      onAuthenticated({
        id: generateUuid(),
        full_name: fullName.trim(),
        email: cleanEmail,
        role: 'client',
        birth_date: birthDate,
        is_adult_verified: true,
        terms_accepted_at: nowIso,
        terms_version: LEGAL_TERMS_VERSION,
        marketing_opt_in: marketingOptIn,
        subscription_status: 'none',
        created_at: nowIso,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      data-testid="auth-modal"
      className="fixed inset-0 z-50 bg-[#0B192C]/65 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 bg-[#0B192C] text-white flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-white/10 text-[#10B981] flex items-center justify-center shrink-0">
              {currentUser ? (
                <UserCheck className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Lock className="w-4 h-4" aria-hidden="true" />
              )}
            </span>
            <div>
              <h2 id="auth-modal-title" className="text-sm font-bold">
                {currentUser
                  ? 'Cuenta y Derechos de Privacidad'
                  : 'Acceso Seguro · Remote Support 365'}
              </h2>
              <p className="text-[11px] text-slate-300">
                {supabaseConfigured
                  ? 'Conectado a Supabase Auth'
                  : 'Modo Demo Funcional · Cumplimiento +18'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de acceso"
            className="p-1.5 text-slate-300 hover:text-white rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {currentUser ? (
          <div className="p-6 space-y-5">
            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-sm text-[#0B192C]">
                  {currentUser.full_name}
                </p>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                  Verificado +18
                </span>
              </div>
              <p className="text-slate-600 font-mono">{currentUser.email}</p>
              <p className="text-slate-600">
                Rol:{' '}
                <strong className="text-[#0B192C]">
                  {currentUser.role === 'client' ? 'Cliente' : 'Técnico / Empresa'}
                </strong>{' '}
                · Términos{' '}
                <span className="font-mono">{currentUser.terms_version}</span>
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={onExportUserData}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#0B192C] bg-white hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                <Download className="w-4 h-4 text-[#2563EB]" aria-hidden="true" />
                <span>Descargar mis datos (JSON)</span>
              </button>

              {confirmDeleteOpen ? (
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 space-y-2.5 text-xs">
                  <p className="font-semibold text-red-900">
                    ¿Confirmas eliminar y anonimizar tus datos personales? Esta acción
                    se registra en auditoría y cierra tu sesión.
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(false)}
                      className="px-3 py-1.5 font-medium text-slate-700 bg-white border border-slate-300 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteUserData();
                        setConfirmDeleteOpen(false);
                        onClose();
                      }}
                      className="px-3 py-1.5 font-semibold text-white bg-red-700 hover:bg-red-800 rounded-lg"
                    >
                      Confirmar eliminación
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                  <span>Eliminar mis datos personales</span>
                </button>
              )}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#0B192C]"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Cerrar sesión</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#0B192C] rounded-lg"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            <div
              role="tablist"
              aria-label="Modo de acceso"
              className="grid grid-cols-2 p-1 bg-slate-100 border border-slate-200 rounded-lg"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'login'}
                onClick={() => {
                  setMode('login');
                  setAuthError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'login'
                    ? 'bg-[#0B192C] text-white'
                    : 'text-slate-600 hover:text-[#0B192C]'
                }`}
              >
                Iniciar Sesión
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === 'signup'}
                onClick={() => {
                  setMode('signup');
                  setAuthError(null);
                }}
                className={`py-2 text-xs font-semibold rounded-md transition-colors ${
                  mode === 'signup'
                    ? 'bg-[#2563EB] text-white'
                    : 'text-slate-600 hover:text-[#0B192C]'
                }`}
              >
                Crear Cuenta (+18)
              </button>
            </div>

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                <div>
                  <label
                    htmlFor="auth-login-email"
                    className="block text-xs font-semibold text-[#0B192C] mb-1"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="auth-login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="usuario@empresa.com"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-[#0B192C] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                  />
                </div>

                <div>
                  <label
                    htmlFor="auth-login-password"
                    className="block text-xs font-semibold text-[#0B192C] mb-1"
                  >
                    Contraseña
                  </label>
                  <input
                    id="auth-login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-[#0B192C] focus:border-[#2563EB] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15"
                  />
                </div>

                {authError && (
                  <p role="alert" className="text-xs font-medium text-red-700">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#0B192C] hover:bg-[#0F172A] disabled:bg-slate-400 rounded-lg transition-colors"
                >
                  {loading ? 'Validando...' : 'Iniciar Sesión'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleSignUpSubmit} noValidate className="space-y-3.5">
                <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
                  Las cuentas de técnico requieren invitación y permisos asignados por un administrador.
                </p>

                <div>
                  <label
                    htmlFor="auth-signup-name"
                    className="block text-xs font-semibold text-[#0B192C] mb-1"
                  >
                    Nombre completo
                  </label>
                  <input
                    id="auth-signup-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ej. Andrea Morales"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-[#0B192C] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="auth-signup-email"
                      className="block text-xs font-semibold text-[#0B192C] mb-1"
                    >
                      Correo electrónico
                    </label>
                    <input
                      id="auth-signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@empresa.com"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#0B192C] focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="auth-signup-birth"
                      className="block text-xs font-semibold text-[#0B192C] mb-1"
                    >
                      Fecha de nacimiento (+18)
                    </label>
                    <input
                      id="auth-signup-birth"
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#0B192C] focus:border-[#2563EB] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="auth-signup-password"
                    className="block text-xs font-semibold text-[#0B192C] mb-1"
                  >
                    Contraseña
                  </label>
                  <input
                    id="auth-signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-[#0B192C] focus:border-[#2563EB] focus:outline-none"
                  />
                </div>

                {/* Mandatory Unchecked Consent */}
                <div className="flex items-start gap-2.5 text-xs text-slate-700 pt-1">
                  <input
                    id="auth-signup-terms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                  />
                  <span>
                    <label htmlFor="auth-signup-terms" className="cursor-pointer">
                      He leído y acepto los{' '}
                    </label>
                    <button
                      type="button"
                      onClick={() => onOpenLegalDoc('terms')}
                      className="font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                    >
                      Términos y Condiciones
                    </button>
                    , la{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalDoc('privacy')}
                      className="font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                    >
                      Política de Privacidad
                    </button>{' '}
                    y la{' '}
                    <button
                      type="button"
                      onClick={() => onOpenLegalDoc('refunds')}
                      className="font-semibold text-[#2563EB] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded"
                    >
                      Política de Reembolsos
                    </button>
                    .
                  </span>
                </div>

                {/* Optional Unchecked Marketing Consent */}
                <div className="flex items-start gap-2.5 text-xs text-slate-600">
                  <input
                    id="auth-signup-marketing"
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => setMarketingOptIn(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                  />
                  <label htmlFor="auth-signup-marketing" className="cursor-pointer">
                    Acepto recibir novedades y consejos técnicos por correo (puedo darme de
                    baja en cualquier momento).
                  </label>
                </div>

                {authError && (
                  <p role="alert" className="text-xs font-medium text-red-700">
                    {authError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-[#2563EB] hover:bg-blue-700 disabled:bg-slate-400 rounded-lg transition-colors"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  <span>{loading ? 'Registrando...' : 'Crear cuenta verificada +18'}</span>
                </button>
              </form>
            )}

            <div className="pt-3 border-t border-slate-200 flex items-center gap-2 text-[11px] text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <span>
                Servicio exclusivo para mayores de 18 años · Versión legal{' '}
                {LEGAL_TERMS_VERSION}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
