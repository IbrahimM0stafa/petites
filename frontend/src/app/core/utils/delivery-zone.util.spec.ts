import { DeliveryZoneUtil } from './delivery-zone.util';
import { GovernorateNode } from '../models/delivery-zone.model';

describe('DeliveryZoneUtil', () => {
    const mockTree: GovernorateNode[] = [
        {
            id: 'gov-cairo',
            name: 'Cairo',
            active: true,
            sortOrder: 1,
            cities: [
                {
                    id: 'city-nasr-city',
                    governorateId: 'gov-cairo',
                    name: 'Nasr City',
                    active: true,
                    sortOrder: 1,
                    areas: [
                        {
                            id: 'area-zone-1',
                            cityId: 'city-nasr-city',
                            name: 'Zone 1',
                            active: true,
                            deliveryFee: 45,
                            courierDelivery: false,
                            sortOrder: 1
                        },
                        {
                            id: 'area-zone-2',
                            cityId: 'city-nasr-city',
                            name: 'Zone 2',
                            active: true,
                            deliveryFee: 50,
                            courierDelivery: false,
                            sortOrder: 2
                        }
                    ]
                },
                {
                    id: 'city-maadi',
                    governorateId: 'gov-cairo',
                    name: 'Maadi',
                    active: true,
                    sortOrder: 2,
                    areas: [
                        {
                            id: 'area-degla',
                            cityId: 'city-maadi',
                            name: 'Degla',
                            active: true,
                            deliveryFee: 0,
                            courierDelivery: true,
                            sortOrder: 1
                        }
                    ]
                }
            ]
        },
        {
            id: 'gov-giza',
            name: 'Giza',
            active: true,
            sortOrder: 2,
            cities: [
                {
                    id: 'city-dokki',
                    governorateId: 'gov-giza',
                    name: 'Dokki',
                    active: true,
                    sortOrder: 1,
                    areas: [
                        {
                            id: 'area-messaha',
                            cityId: 'city-dokki',
                            name: 'Messaha',
                            active: true,
                            deliveryFee: 40,
                            courierDelivery: false,
                            sortOrder: 1
                        }
                    ]
                }
            ]
        }
    ];

    describe('getCities', () => {
        it('returns cities when governorate is found', () => {
            const cities = DeliveryZoneUtil.getCities(mockTree, 'gov-cairo');
            expect(cities.length).toBe(2);
            expect(cities[0].name).toBe('Nasr City');
            expect(cities[1].name).toBe('Maadi');
        });

        it('returns empty array when governorate is not found or id is empty/null', () => {
            expect(DeliveryZoneUtil.getCities(mockTree, 'unknown')).toEqual([]);
            expect(DeliveryZoneUtil.getCities(mockTree, null)).toEqual([]);
            expect(DeliveryZoneUtil.getCities(mockTree, undefined)).toEqual([]);
            expect(DeliveryZoneUtil.getCities([], 'gov-cairo')).toEqual([]);
        });
    });

    describe('getAreas', () => {
        it('returns areas for a city regardless of which governorate it belongs to', () => {
            const cairoAreas = DeliveryZoneUtil.getAreas(mockTree, 'city-nasr-city');
            expect(cairoAreas.length).toBe(2);
            expect(cairoAreas[0].name).toBe('Zone 1');

            const gizaAreas = DeliveryZoneUtil.getAreas(mockTree, 'city-dokki');
            expect(gizaAreas.length).toBe(1);
            expect(gizaAreas[0].name).toBe('Messaha');
        });

        it('returns empty array when city is not found or id is empty/null', () => {
            expect(DeliveryZoneUtil.getAreas(mockTree, 'non-existent')).toEqual([]);
            expect(DeliveryZoneUtil.getAreas(mockTree, null)).toEqual([]);
            expect(DeliveryZoneUtil.getAreas(mockTree, undefined)).toEqual([]);
            expect(DeliveryZoneUtil.getAreas([], 'city-dokki')).toEqual([]);
        });
    });

    describe('findGovernorate', () => {
        it('finds existing governorate', () => {
            const gov = DeliveryZoneUtil.findGovernorate(mockTree, 'gov-giza');
            expect(gov?.name).toBe('Giza');
        });

        it('returns null when not found or id missing', () => {
            expect(DeliveryZoneUtil.findGovernorate(mockTree, 'missing')).toBeNull();
            expect(DeliveryZoneUtil.findGovernorate(mockTree, null)).toBeNull();
        });
    });

    describe('findCity', () => {
        it('finds existing city across governorates', () => {
            const city = DeliveryZoneUtil.findCity(mockTree, 'city-dokki');
            expect(city?.name).toBe('Dokki');
            expect(city?.governorateId).toBe('gov-giza');
        });

        it('returns null when city not found or id missing', () => {
            expect(DeliveryZoneUtil.findCity(mockTree, 'missing')).toBeNull();
            expect(DeliveryZoneUtil.findCity(mockTree, undefined)).toBeNull();
        });
    });

    describe('findArea', () => {
        it('finds area across any governorate and city', () => {
            const area = DeliveryZoneUtil.findArea(mockTree, 'area-degla');
            expect(area?.name).toBe('Degla');
            expect(area?.courierDelivery).toBe(true);
        });

        it('returns null when area not found or id missing', () => {
            expect(DeliveryZoneUtil.findArea(mockTree, 'non-existent')).toBeNull();
            expect(DeliveryZoneUtil.findArea(mockTree, null)).toBeNull();
        });
    });

    describe('findAreaByName', () => {
        it('matches area by name case-insensitively and returns hierarchy', () => {
            const result = DeliveryZoneUtil.findAreaByName(mockTree, '  mEsSaHa ');
            expect(result).not.toBeNull();
            expect(result?.area.id).toBe('area-messaha');
            expect(result?.city.id).toBe('city-dokki');
            expect(result?.governorate.id).toBe('gov-giza');
        });

        it('returns null when area name does not match or is empty/null', () => {
            expect(DeliveryZoneUtil.findAreaByName(mockTree, 'Alexandria')).toBeNull();
            expect(DeliveryZoneUtil.findAreaByName(mockTree, '')).toBeNull();
            expect(DeliveryZoneUtil.findAreaByName(mockTree, null)).toBeNull();
        });
    });

    describe('formatFeeLabel', () => {
        it('formats courier delivery as Paid to courier', () => {
            const label = DeliveryZoneUtil.formatFeeLabel({
                id: '1', cityId: 'c1', name: 'A', active: true, courierDelivery: true, deliveryFee: 0, sortOrder: 1
            });
            expect(label).toBe('Paid to courier');
        });

        it('formats flat delivery fee with currency prefix', () => {
            const label = DeliveryZoneUtil.formatFeeLabel({
                id: '2', cityId: 'c1', name: 'B', active: true, courierDelivery: false, deliveryFee: 65, sortOrder: 2
            });
            expect(label).toBe('EGP 65');
        });

        it('returns empty string for null/undefined area', () => {
            expect(DeliveryZoneUtil.formatFeeLabel(null)).toBe('');
            expect(DeliveryZoneUtil.formatFeeLabel(undefined)).toBe('');
        });
    });
});

