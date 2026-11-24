import type { DashboardSection, OrganizationMember } from '../types/support';

export type OrganizationRole = OrganizationMember['role'];

export type RbacPermission =
  | 'dashboard:view'
  | 'tickets:view'
  | 'tickets:claim'
  | 'tickets:resolve'
  | 'tickets:billing'
  | 'devices:view'
  | 'sessions:manage'
  | 'workforce:view'
  | 'workforce:manage'
  | 'applications:review'
  | 'ai_workforce:view'
  | 'ai_workforce:configure'
  | 'analytics:view'
  | 'telemetry:view'
  | 'security:view'
  | 'rbac:manage'
  | 'settings:view'
  | 'settings:manage';

export interface RbacPermissionMeta {
  id: RbacPermission;
  label: string;
  domain: 'Operaciones' | 'Workforce & IA' | 'Telemetría' | 'Gobierno y Seguridad';
  description: string;
}

export const RBAC_PERMISSION_CATALOG: RbacPermissionMeta[] = [
  {
    id: 'dashboard:view',
    label: 'Ver resumen operativo',
    domain: 'Operaciones',
    description: 'Acceso a KPIs principales y estado de cola en vivo.',
  },
  {
    id: 'tickets:view',
    label: 'Consultar tickets y chat',
    domain: 'Operaciones',
    description: 'Lectura de solicitudes, diagnósticos IA y mensajes.',
  },
  {
    id: 'tickets:claim',
    label: 'Tomar tickets (RPC atómico)',
    domain: 'Operaciones',
    description: 'Autoasignación y ejecución de sesiones remotas RustDesk.',
  },
  {
    id: 'tickets:resolve',
    label: 'Resolver o reabrir tickets',
    domain: 'Operaciones',
    description: 'Cierre con notas técnicas e informe de resolución.',
  },
  {
    id: 'tickets:billing',
    label: 'Validar pagos y conciliación',
    domain: 'Operaciones',
    description: 'Confirmar cobros manuales o conciliación de pasarela.',
  },
  {
    id: 'devices:view',
    label: 'Directorio de equipos',
    domain: 'Operaciones',
    description: 'Consultar dispositivos Pyme e IDs de agente fijo.',
  },
  {
    id: 'sessions:manage',
    label: 'Gestionar sesiones remotas',
    domain: 'Operaciones',
    description: 'Iniciar y finalizar sesiones activas en RustDesk.',
  },
  {
    id: 'workforce:view',
    label: 'Ver directorio de técnicos',
    domain: 'Workforce & IA',
    description: 'Consultar disponibilidad y carga del equipo.',
  },
  {
    id: 'workforce:manage',
    label: 'Invitar técnicos y modo despacho',
    domain: 'Workforce & IA',
    description: 'Modificar modo de despacho y alta de especialistas.',
  },
  {
    id: 'applications:review',
    label: 'Aprobar / rechazar postulantes',
    domain: 'Workforce & IA',
    description: 'Revisar evaluaciones de /postular y emitir invitaciones SMTP.',
  },
  {
    id: 'ai_workforce:view',
    label: 'Ver agentes AI Workforce',
    domain: 'Workforce & IA',
    description: 'Supervisar estado y consumo de créditos IA.',
  },
  {
    id: 'ai_workforce:configure',
    label: 'Configurar reglas de agentes IA',
    domain: 'Workforce & IA',
    description: 'Activar, pausar y editar guardrails de IA.',
  },
  {
    id: 'analytics:view',
    label: 'Ver informes financieros y SLA',
    domain: 'Telemetría',
    description: 'Consultar ingresos, tasa de resolución y categorías.',
  },
  {
    id: 'telemetry:view',
    label: 'Telemetría operativa en vivo',
    domain: 'Telemetría',
    description: 'Inspeccionar latencia IA, salud RustDesk, OS y eventos.',
  },
  {
    id: 'security:view',
    label: 'Bitácora de auditoría',
    domain: 'Gobierno y Seguridad',
    description: 'Leer eventos inmutables de seguridad y consentimientos.',
  },
  {
    id: 'rbac:manage',
    label: 'Gobierno RBAC y roles',
    domain: 'Gobierno y Seguridad',
    description: 'Promover, degradar o suspender miembros de la organización.',
  },
  {
    id: 'settings:view',
    label: 'Ver configuración de organización',
    domain: 'Gobierno y Seguridad',
    description: 'Consultar plan, pasarelas y datos de la organización.',
  },
  {
    id: 'settings:manage',
    label: 'Editar configuración y cancelación',
    domain: 'Gobierno y Seguridad',
    description: 'Actualizar pasarelas, modo de despacho y suscripción.',
  },
];

export const DEFAULT_RBAC_MATRIX: Record<OrganizationRole, RbacPermission[]> = {
  owner: RBAC_PERMISSION_CATALOG.map((p) => p.id),
  admin: [
    'dashboard:view',
    'tickets:view',
    'tickets:claim',
    'tickets:resolve',
    'tickets:billing',
    'devices:view',
    'sessions:manage',
    'workforce:view',
    'workforce:manage',
    'applications:review',
    'ai_workforce:view',
    'ai_workforce:configure',
    'analytics:view',
    'telemetry:view',
    'security:view',
    'rbac:manage',
    'settings:view',
    'settings:manage',
  ],
  technician: [
    'dashboard:view',
    'tickets:view',
    'tickets:claim',
    'tickets:resolve',
    'devices:view',
    'sessions:manage',
    'workforce:view',
    'analytics:view',
    'telemetry:view',
  ],
};

export const SECTION_REQUIRED_PERMISSION: Record<
  DashboardSection,
  RbacPermission
> = {
  overview: 'dashboard:view',
  tickets: 'tickets:view',
  devices: 'devices:view',
  sessions: 'sessions:manage',
  workforce: 'workforce:view',
  ai_workforce: 'ai_workforce:view',
  analytics: 'analytics:view',
  security: 'security:view',
  settings: 'settings:view',
};

export function hasPermission(
  role: OrganizationRole,
  permission: RbacPermission,
  customMatrix?: Partial<Record<OrganizationRole, RbacPermission[]>>
): boolean {
  const list = customMatrix?.[role] ?? DEFAULT_RBAC_MATRIX[role];
  return list.includes(permission);
}

export function canAccessSection(
  role: OrganizationRole,
  section: DashboardSection,
  customMatrix?: Partial<Record<OrganizationRole, RbacPermission[]>>
): boolean {
  return hasPermission(
    role,
    SECTION_REQUIRED_PERMISSION[section],
    customMatrix
  );
}

export function canManageMemberRole(
  actorRole: OrganizationRole,
  targetRole: OrganizationRole,
  nextRole: OrganizationRole
): boolean {
  if (!hasPermission(actorRole, 'rbac:manage')) return false;
  if (targetRole === 'owner' && actorRole !== 'owner') return false;
  if (nextRole === 'owner' && actorRole !== 'owner') return false;
  return true;
}

export function getRoleLabel(role: OrganizationRole): string {
  switch (role) {
    case 'owner':
      return 'Owner · Propietario';
    case 'admin':
      return 'Admin · Operaciones';
    case 'technician':
      return 'Técnico Especialista';
  }
}
