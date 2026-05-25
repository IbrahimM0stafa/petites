export interface AddressResponse {
	id: string;
	userId: string;
	city: string;
	area: string;
	street: string;
	building: string | null;
	notes: string | null;
}

export interface AddressCreateRequest {
	city: string;
	area: string;
	street: string;
	building?: string;
	notes?: string;
}

export interface AddressUpdateRequest {
	city?: string;
	area?: string;
	street?: string;
	building?: string;
	notes?: string;
}