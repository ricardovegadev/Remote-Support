/**
 * Feature flags centrales de Remote Support 365.
 * Permiten mantener en standby los módulos B2B Multitenant SaaS sin eliminar
 * componentes, props ni tablas de base de datos.
 */
export const FEATURE_FLAGS = {
  /** Standby no destructivo de la UI B2B Multitenant SaaS */
  ENABLE_SAAS_MULTITENANT: false,
  /** Habilita el portal de postulación y evaluación cronometrada para técnicos (/postular) */
  ENABLE_TECHNICIAN_RECRUITMENT: true,
} as const;
