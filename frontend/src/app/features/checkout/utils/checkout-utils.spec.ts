import { CheckoutPricingUtil } from './checkout-pricing.util';
import { CheckoutDateUtil } from './checkout-date.util';
import { CheckoutRewardUtil } from './checkout-reward.util';
import { CartResponse } from '../../../core/models/cart.models';
import { GovernorateNode } from '../../../core/models/delivery-zone.model';
import { OrderResponse } from '../../../core/models/order.models';

describe('Checkout Utilities', () => {
    describe('CheckoutPricingUtil', () => {
        it('should detect mixed orders with both instant and scheduled items', () => {
            const mixedCart = {
                items: [
                    { deliveryMode: 'INSTANT' },
                    { deliveryMode: 'SCHEDULED' }
                ]
            } as unknown as CartResponse;

            const singleCart = {
                items: [
                    { deliveryMode: 'INSTANT' },
                    { deliveryMode: 'INSTANT' }
                ]
            } as unknown as CartResponse;

            expect(CheckoutPricingUtil.isMixedOrder(mixedCart)).toBe(true);
            expect(CheckoutPricingUtil.isMixedOrder(singleCart)).toBe(false);
            expect(CheckoutPricingUtil.isMixedOrder(null)).toBe(false);
        });

        it('should calculate delivery fee correctly for courier, pickup, and mixed orders', () => {
            expect(CheckoutPricingUtil.calculateDeliveryFee('PICKUP', false, false, 50)).toBe(0);
            expect(CheckoutPricingUtil.calculateDeliveryFee('DELIVERY', true, false, 50)).toBe(0);
            expect(CheckoutPricingUtil.calculateDeliveryFee('DELIVERY', false, false, 50)).toBe(50);
            expect(CheckoutPricingUtil.calculateDeliveryFee('DELIVERY', false, true, 50)).toBe(100);
        });

        it('should find area in zone tree', () => {
            const tree: GovernorateNode[] = [
                {
                    id: 'gov-1',
                    name: 'Cairo',
                    active: true,
                    sortOrder: 0,
                    cities: [
                        {
                            id: 'city-1',
                            name: 'Nasr City',
                            governorateId: 'gov-1',
                            active: true,
                            sortOrder: 0,
                            areas: [
                                {
                                    id: 'area-1',
                                    name: 'Zone 1',
                                    cityId: 'city-1',
                                    deliveryFee: 40,
                                    courierDelivery: false,
                                    active: true,
                                    sortOrder: 0
                                }
                            ]
                        }
                    ]
                }
            ];

            const found = CheckoutPricingUtil.findAreaInTree(tree, 'area-1');
            expect(found).not.toBeNull();
            expect(found?.name).toBe('Zone 1');
            expect(found?.deliveryFee).toBe(40);

            expect(CheckoutPricingUtil.findAreaInTree(tree, 'non-existent')).toBeNull();
            expect(CheckoutPricingUtil.findAreaInTree(tree, null)).toBeNull();
        });
    });

    describe('CheckoutDateUtil', () => {
        it('should detect blocked days of the week', () => {
            // 2026-10-30 is a Friday
            const dateStr = '2026-10-30';
            expect(CheckoutDateUtil.isDateBlocked(dateStr, ['FRIDAY'])).toBe(true);
            expect(CheckoutDateUtil.isDateBlocked(dateStr, ['MONDAY', 'TUESDAY'])).toBe(false);
            expect(CheckoutDateUtil.isDateBlocked(null, ['FRIDAY'])).toBe(false);
        });

        it('should format checkout date', () => {
            const formatted = CheckoutDateUtil.formatCheckoutDate('2026-10-30');
            expect(formatted).toContain('2026');
            expect(formatted).toContain('Oct');
        });
    });

    describe('CheckoutRewardUtil', () => {
        it('should find reward summary when order has reward item', () => {
            const orders = [
                {
                    rewardApplied: false,
                    items: [
                        {
                            unitPrice: 0,
                            productId: 'prod-reward',
                            productName: 'Free Croissant'
                        }
                    ]
                }
            ] as unknown as OrderResponse[];

            const summary = CheckoutRewardUtil.findRewardSummary(orders, 'prod-reward', 'Default Reward');
            expect(summary).not.toBeNull();
            expect(summary?.productName).toBe('Free Croissant');
        });

        it('should return null when no reward item exists', () => {
            const orders = [
                {
                    rewardApplied: false,
                    items: [
                        {
                            unitPrice: 50,
                            productId: 'prod-1',
                            productName: 'Normal Croissant'
                        }
                    ]
                }
            ] as unknown as OrderResponse[];

            const summary = CheckoutRewardUtil.findRewardSummary(orders, 'prod-reward', 'Default Reward');
            expect(summary).toBeNull();
        });
    });
});

