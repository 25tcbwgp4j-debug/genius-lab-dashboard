import type { AppRole } from '@/types/database'

const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin: 4,
  manager: 3,
  reception: 2,
  technician: 1,
}

export function hasMinimumRole(userRole: AppRole, required: AppRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[required]
}

export function canAccessCustomers(role: AppRole): boolean {
  return ['admin', 'manager', 'reception'].includes(role)
}

export function canAccessDevices(role: AppRole): boolean {
  return ['admin', 'manager', 'reception'].includes(role)
}

export function canCreateTicket(role: AppRole): boolean {
  return ['admin', 'manager', 'reception'].includes(role)
}

export function canAssignTechnician(role: AppRole): boolean {
  return ['admin', 'manager'].includes(role)
}

export function canEditDiagnosis(role: AppRole): boolean {
  return ['admin', 'manager', 'technician'].includes(role)
}

export function canUseAIDiagnosis(role: AppRole): boolean {
  return ['admin', 'manager', 'technician'].includes(role)
}

export function canManageInventory(role: AppRole): boolean {
  return ['admin', 'manager'].includes(role)
}

export function canRecordPayment(role: AppRole): boolean {
  return ['admin', 'manager', 'reception'].includes(role)
}

export function canViewPayments(role: AppRole): boolean {
  return ['admin', 'manager', 'reception'].includes(role)
}

export function canAccessCommunications(role: AppRole): boolean {
  return ['admin', 'manager'].includes(role)
}

export function canAccessSettings(role: AppRole): boolean {
  return role === 'admin'
}

/** All roles can access the dashboard; param kept for API consistency with other can* functions. */
export function canAccessDashboard(role: AppRole): boolean {
  void role
  return true
}

export function canManageUsers(role: AppRole): boolean {
  return role === 'admin'
}

/** Can change ticket status (e.g. ready_for_pickup → delivered). */
export function canChangeTicketStatus(role: AppRole): boolean {
  return ['admin', 'manager', 'reception', 'technician'].includes(role)
}

/** Can edit shipping address and mark as shipped. */
export function canEditTicketShipping(role: AppRole): boolean {
  return ['admin', 'manager', 'reception'].includes(role)
}
