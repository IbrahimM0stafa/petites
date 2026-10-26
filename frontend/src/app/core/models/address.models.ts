export interface AddressResponse {
	id?: string | null;
	userId?: string | null;
	governorateId?: string | null;
	governorate?: string | null;
	cityId?: string | null;
	city: string;
	areaId?: string | null;
	area: string;
	street: string;
	building: string | null;
	notes: string | null;
}

/** Saved user address from /api/addresses — always has an id. */
export type SavedAddressResponse = AddressResponse & { id: string };

export interface AddressCreateRequest {
	governorateId?: string;
	governorate?: string;
	cityId?: string;
	city: string;
	areaId?: string;
	area: string;
	street: string;
	building?: string;
	notes?: string;
}

export interface AddressUpdateRequest {
	governorateId?: string;
	governorate?: string;
	cityId?: string;
	city?: string;
	areaId?: string;
	area?: string;
	street?: string;
	building?: string;
	notes?: string;
}

export function formatAddressShort(address?: AddressResponse | null): string {
	if (!address) {
		return '';
	}

	const parts: string[] = [];
	if (address.governorate) {
		parts.push(address.governorate);
	}
	if (address.city) {
		parts.push(address.city);
	}
	if (address.area) {
		parts.push(address.area);
	}
	if (address.street) {
		parts.push(address.street);
	}
	return parts.join(' · ');
}

export function formatAddressLine2(address?: AddressResponse | null): string {
	if (!address) {
		return '';
	}

	const parts: string[] = [];
	if (address.street) {
		parts.push(address.street);
	}
	if (address.building) {
		parts.push(address.building);
	}
	return parts.join(' · ');
}