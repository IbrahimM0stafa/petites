import { InChatCheckoutCoordinator } from './in-chat-checkout-coordinator.service';
import { InChatCheckoutState } from '../../../../core/models/chatbot.models';
import { CartResponse } from '../../../../core/models/cart.models';
import { GovernorateNode } from '../../../../core/models/delivery-zone.model';
import { SavedAddressResponse } from '../../../../core/models/address.models';

describe('InChatCheckoutCoordinator', () => {
	let coordinator: InChatCheckoutCoordinator;

	const mockZoneTree: GovernorateNode[] = [
		{
			id: 'gov-cairo',
			name: 'Cairo',
			active: true,
			sortOrder: 1,
			cities: [
				{
					id: 'city-nasr',
					governorateId: 'gov-cairo',
					name: 'Nasr City',
					active: true,
					sortOrder: 1,
					areas: [
						{
							id: 'area-1',
							cityId: 'city-nasr',
							name: 'Zone 1',
							active: true,
							deliveryFee: 40,
							courierDelivery: false,
							sortOrder: 1
						},
						{
							id: 'area-courier',
							cityId: 'city-nasr',
							name: 'Zone Courier',
							active: true,
							deliveryFee: 0,
							courierDelivery: true,
							sortOrder: 2
						}
					]
				}
			]
		}
	];

	beforeEach(() => {
		// Instantiate directly (shopService is mocked or not needed for synchronous pure methods)
		coordinator = new InChatCheckoutCoordinator();
	});

	describe('createInitialCard', () => {
		it('creates card with default delivery fee when no saved address is provided', () => {
			const card = coordinator.createInitialCard(null, 50, mockZoneTree);
			expect(card.orderType).toBe('DELIVERY');
			expect(card.deliveryFee).toBe(50);
			expect(card.isCourierDelivery).toBeFalse();
			expect(card.addressId).toBeUndefined();
		});

		it('applies courier delivery and area fee when saved address matches a courier area', () => {
			const address: SavedAddressResponse = {
				id: 'addr-1',
				userId: 'user-1',
				areaId: 'area-courier',
				cityId: 'city-nasr',
				governorateId: 'gov-cairo',
				area: 'Zone Courier',
				city: 'Nasr City',
				governorate: 'Cairo',
				street: 'El-Nasr St',
				building: '10',
				notes: ''
			};

			const card = coordinator.createInitialCard(address, 50, mockZoneTree);
			expect(card.addressId).toBe('addr-1');
			expect(card.deliveryFee).toBe(0);
			expect(card.isCourierDelivery).toBeTrue();
		});
	});

	describe('validateCard', () => {
		const validCart: CartResponse = {
			cartId: 'cart-1',
			userId: null,
			guestSessionId: null,
			status: 'ACTIVE',
			createdAt: '2026-01-01',
			subtotal: 90,
			items: [
				{
					itemId: 'item-1',
					productId: 'p-1',
					productName: 'Croissant',
					productImage: null,
					quantity: 2,
					unitPrice: 45,
					lineTotal: 90,
					deliveryMode: 'INSTANT'
				}
			]
		};

		it('requires name and phone for unauthenticated guests', () => {
			const card = coordinator.createInitialCard(null, 50, mockZoneTree);
			card.customerName = '';
			card.customerPhone = '';

			const error = coordinator.validateCard(card, validCart, false, []);
			expect(error).toContain('Please enter your full name');

			card.customerName = 'Lina';
			card.customerPhone = '123';
			expect(coordinator.validateCard(card, validCart, false, [])).toContain('Please enter a valid phone number');
		});

		it('requires street, area, city, and governorate when orderType is DELIVERY and no saved address is used', () => {
			const card = coordinator.createInitialCard(null, 50, mockZoneTree);
			card.customerName = 'Lina Ahmed';
			card.customerPhone = '01012345678';
			card.orderType = 'DELIVERY';
			card.addressId = 'NEW';
			card.deliveryStreet = '';

			const error = coordinator.validateCard(card, validCart, false, []);
			expect(error).toContain('Please select governorate, city, area and enter street');
		});

		it('validates scheduled date when cart contains scheduled items', () => {
			const scheduledCart: CartResponse = {
				...validCart,
				items: [
					{
						itemId: 'item-2',
						productId: 'p-2',
						productName: 'Birthday Cake',
						productImage: null,
						quantity: 1,
						unitPrice: 350,
						lineTotal: 350,
						deliveryMode: 'SCHEDULED'
					}
				]
			};

			const card = coordinator.createInitialCard(null, 50, mockZoneTree);
			card.customerName = 'Lina Ahmed';
			card.customerPhone = '01012345678';
			card.orderType = 'PICKUP';

			// Missing scheduled date
			card.scheduledDate = '';
			expect(coordinator.validateCard(card, scheduledCart, false, [])).toContain('Please choose a scheduled delivery date');

			// Date earlier than minimum
			card.minScheduledDate = '2026-11-05';
			card.scheduledDate = '2026-11-02';
			expect(coordinator.validateCard(card, scheduledCart, false, [])).toContain('cannot be earlier than');

			// Date on blocked day (FRIDAY: 2026-11-06 is Friday)
			card.scheduledDate = '2026-11-06';
			expect(coordinator.validateCard(card, scheduledCart, false, ['FRIDAY'])).toContain('blocked bakery delivery day');
		});

		it('returns null when card details are valid', () => {
			const card = coordinator.createInitialCard(null, 50, mockZoneTree);
			card.customerName = 'Lina Ahmed';
			card.customerPhone = '01012345678';
			card.orderType = 'PICKUP';

			expect(coordinator.validateCard(card, validCart, false, [])).toBeNull();
		});
	});

	describe('calculateCheckoutTotal', () => {
		const cart: CartResponse = {
			cartId: 'cart-1',
			userId: null,
			guestSessionId: null,
			status: 'ACTIVE',
			createdAt: '2026-01-01',
			subtotal: 200,
			items: []
		};

		it('calculates total with delivery fee and coupon discount', () => {
			const card = coordinator.createInitialCard(null, 50, mockZoneTree);
			card.orderType = 'DELIVERY';
			card.deliveryFee = 40;
			card.couponPreview = {
				valid: true,
				code: 'SAVE20',
				couponId: 'c-1',
				discountAmount: 30,
				finalAmount: 170,
				message: 'Discount applied'
			};

			// (200 - 30) + 40 = 210
			const total = coordinator.calculateCheckoutTotal(card, cart, 50);
			expect(total).toBe(210);
		});

		it('does not charge delivery fee when isCourierDelivery is true', () => {
			const card = coordinator.createInitialCard(null, 50, mockZoneTree);
			card.orderType = 'DELIVERY';
			card.isCourierDelivery = true;
			card.deliveryFee = 0;

			const total = coordinator.calculateCheckoutTotal(card, cart, 50);
			expect(total).toBe(200);
		});
	});

	describe('formatCurrency', () => {
		it('formats number into Egyptian Pound string', () => {
			const formatted = coordinator.formatCurrency(250);
			expect(formatted).toContain('250');
		});
	});
});

