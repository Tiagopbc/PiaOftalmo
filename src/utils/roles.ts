import type { UserProfile } from '../types';

type RoleSource = Pick<UserProfile, 'role' | 'appRole'> | null | undefined;

export const normalizeRole = (role?: string | null) =>
  String(role || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

export const getUserRole = (user?: RoleSource) => normalizeRole(user?.appRole || user?.role);

export const isAdminRole = (role?: string | null) => normalizeRole(role) === 'admin';

export const isDoctorRole = (role?: string | null) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'medico' || normalizedRole === 'doctor' || normalizedRole === 'especialista';
};

export const isReceptionRole = (role?: string | null) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'recepcao' || normalizedRole === 'recepcionista' || normalizedRole === 'reception';
};

export const isSellerRole = (role?: string | null) => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole === 'vendedor' || normalizedRole === 'seller';
};

export const isAdminUser = (user?: RoleSource) => isAdminRole(getUserRole(user));

export const isDoctorUser = (user?: RoleSource) => isDoctorRole(getUserRole(user));

export const isReceptionUser = (user?: RoleSource) => isReceptionRole(getUserRole(user));

export const isSellerUser = (user?: RoleSource) => isSellerRole(getUserRole(user));

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
