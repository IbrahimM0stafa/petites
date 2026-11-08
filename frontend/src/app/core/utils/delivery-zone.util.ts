import { AreaNode, CityNode, GovernorateNode } from '../models/delivery-zone.model';

export interface AreaMatchResult {
	governorate: GovernorateNode;
	city: CityNode;
	area: AreaNode;
}

export class DeliveryZoneUtil {

	static getCities(zoneTree: GovernorateNode[], govId?: string | null): CityNode[] {
		if (!govId || !zoneTree) return [];
		return zoneTree.find((g) => g.id === govId)?.cities ?? [];
	}


	static getAreas(zoneTree: GovernorateNode[], cityId?: string | null): AreaNode[] {
		if (!cityId || !zoneTree) return [];
		for (const gov of zoneTree) {
			const city = gov.cities?.find((c) => c.id === cityId);
			if (city) return city.areas ?? [];
		}
		return [];
	}


	static findGovernorate(zoneTree: GovernorateNode[], govId?: string | null): GovernorateNode | null {
		if (!govId || !zoneTree) return null;
		return zoneTree.find((g) => g.id === govId) ?? null;
	}


	static findCity(zoneTree: GovernorateNode[], cityId?: string | null): CityNode | null {
		if (!cityId || !zoneTree) return null;
		for (const gov of zoneTree) {
			const city = gov.cities?.find((c) => c.id === cityId);
			if (city) return city;
		}
		return null;
	}

	static findArea(zoneTree: GovernorateNode[], areaId?: string | null): AreaNode | null {
		if (!areaId || !zoneTree) return null;
		for (const gov of zoneTree) {
			for (const city of gov.cities ?? []) {
				const area = city.areas?.find((a) => a.id === areaId);
				if (area) return area;
			}
		}
		return null;
	}


	static findAreaByName(zoneTree: GovernorateNode[], areaName?: string | null): AreaMatchResult | null {
		if (!areaName || !zoneTree) return null;
		const normalized = areaName.trim().toLowerCase();
		for (const gov of zoneTree) {
			for (const city of gov.cities ?? []) {
				const area = city.areas?.find((a) => a.name.trim().toLowerCase() === normalized);
				if (area) {
					return { governorate: gov, city, area };
				}
			}
		}
		return null;
	}


	static formatFeeLabel(area: AreaNode | null | undefined): string {
		if (!area) return '';
		if (area.courierDelivery) return 'Paid to courier';
		return `EGP ${area.deliveryFee}`;
	}
}

