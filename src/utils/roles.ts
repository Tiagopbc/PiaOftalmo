import type { UserProfile } from '../types';

type RoleSource = Pick<UserProfile, 'role' | 'appRole'> | null | undefined;

export type CanonicalRole = 'admin' | 'recepcao' | 'medico' | 'vendedor';

export const ROLE_DEFINITIONS: Record<CanonicalRole, {
  label: string;
  aliases: string[];
}> = {
  recepcao: {
    label: 'Recepção',
    aliases: ['recepcao', 'recepção', 'recepcionista', 'reception']
  },
  medico: {
    label: 'Especialista (Médico)',
    aliases: [
      'medico',
      'médico',
      'doctor',
      'oftalmologista',
      'especialista',
      'especialista medico',
      'especialista médico',
      'especialista (medico)',
      'especialista (médico)',
      'medico especialista',
      'médico especialista'
    ]
  },
  vendedor: {
    label: 'Vendedor (Óptica)',
    aliases: ['vendedor', 'seller', 'otica', 'ótica', 'optica', 'óptica', 'vendedor optica', 'vendedor óptica']
  },
  admin: {
    label: 'Administrador Geral',
    aliases: ['admin', 'administrador', 'administrador geral']
  }
};

export const ROLE_OPTIONS = Object.entries(ROLE_DEFINITIONS).map(([value, definition]) => ({
  value: value as CanonicalRole,
  label: definition.label
}));

export const normalizeRole = (role?: string | null) =>
  String(role || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[()/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

export const getCanonicalRole = (role?: string | null): CanonicalRole | '' => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return '';

  const found = ROLE_OPTIONS.find(({ value }) =>
    ROLE_DEFINITIONS[value].aliases.some((alias) => normalizeRole(alias) === normalizedRole)
  );

  return found?.value || '';
};

export const getRoleLabel = (role?: string | null) => {
  const canonicalRole = getCanonicalRole(role);
  return canonicalRole ? ROLE_DEFINITIONS[canonicalRole].label : role || '';
};

export const getUserRole = (user?: RoleSource) =>
  getCanonicalRole(user?.role) || getCanonicalRole(user?.appRole) || normalizeRole(user?.role || user?.appRole);

export const isAdminRole = (role?: string | null) => getCanonicalRole(role) === 'admin';

export const isDoctorRole = (role?: string | null) => getCanonicalRole(role) === 'medico';

export const isReceptionRole = (role?: string | null) => getCanonicalRole(role) === 'recepcao';

export const isSellerRole = (role?: string | null) => getCanonicalRole(role) === 'vendedor';

const matchesAnyUserRole = (
  user: RoleSource,
  matcher: (role?: string | null) => boolean
) => matcher(user?.role) || matcher(user?.appRole);

export const isAdminUser = (user?: RoleSource) => matchesAnyUserRole(user, isAdminRole);

export const isDoctorUser = (user?: RoleSource) => matchesAnyUserRole(user, isDoctorRole);

export const isReceptionUser = (user?: RoleSource) => matchesAnyUserRole(user, isReceptionRole);

export const isSellerUser = (user?: RoleSource) => matchesAnyUserRole(user, isSellerRole);

export const canCreatePatients = (user?: RoleSource) => isAdminUser(user) || isReceptionUser(user);

export const canManagePatientStatus = (user?: RoleSource) => isAdminUser(user);

export const canEditPatientAdministrativeFields = (user?: RoleSource) =>
  isAdminUser(user) || isReceptionUser(user);

export const canCreateAppointments = (user?: RoleSource) => isAdminUser(user) || isReceptionUser(user);

export const canManageAppointments = canCreateAppointments;

export const canManageClinicalCare = (user?: RoleSource) => isAdminUser(user) || isDoctorUser(user);

export const canViewOperationalDashboard = (user?: RoleSource) => !isDoctorUser(user);

export const canViewPatientOsTab = (user?: RoleSource) =>
  isAdminUser(user) || isReceptionUser(user) || isSellerUser(user);

export const canManageAdministrativeAlerts = (user?: RoleSource) =>
  isAdminUser(user) || isReceptionUser(user);
