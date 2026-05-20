export const ADMIN_ROLES = ['SUPER_ADMIN', 'STAFF'] as const;

export function hasAdminRole(roles: readonly string[]): boolean {
	return roles.some((role) => ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]));
}
