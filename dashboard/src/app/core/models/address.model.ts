export interface AddressResponse {
  id: string;
  userId?: string | null;
  city?: string | null;
  area?: string | null;
  street?: string | null;
  building?: string | null;
  notes?: string | null;
}

export function formatAddressShort(a?: AddressResponse | null): string {
  if (!a) return '';
  const parts: string[] = [];
  if (a.city) parts.push(a.city);
  if (a.area) parts.push(a.area);
  if (a.street) parts.push(a.street);
  return parts.join(' · ');
}

export function formatAddressLine2(a?: AddressResponse | null): string {
  if (!a) return '';
  const parts: string[] = [];
  if (a.street) parts.push(a.street);
  if (a.building) parts.push(a.building);
  return parts.join(' · ');
}
