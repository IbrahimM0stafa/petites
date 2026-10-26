export interface Governorate {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface City {
  id: string;
  governorateId: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface Area {
  id: string;
  cityId: string;
  name: string;
  deliveryFee: number;
  courierDelivery: boolean;
  active: boolean;
  sortOrder: number;
}

export interface AreaNode {
  id: string;
  cityId: string;
  name: string;
  active: boolean;
  deliveryFee: number;
  courierDelivery: boolean;
  sortOrder: number;
}

export interface CityNode {
  id: string;
  governorateId: string;
  name: string;
  active: boolean;
  sortOrder: number;
  areas: AreaNode[];
}

export interface GovernorateNode {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
  cities: CityNode[];
}
