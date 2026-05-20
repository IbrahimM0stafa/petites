export interface UserCreateRequest {
	name: string;
	phone: string;
	email: string;
	password: string;
}

export interface UserUpdateRequest {
	name?: string;
	phone?: string;
	email?: string;
	active?: boolean;
}

export interface UserResponse {
	id: string;
	name: string;
	phone: string;
	email: string;
	completedOrdersCount: number;
	roles: string[];
	active: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface RoleResponse {
	id: string;
	name: string;
}