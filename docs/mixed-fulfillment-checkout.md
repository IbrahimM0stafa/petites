# Mixed fulfillment checkout in Petites

## Problem

Petites supports two fulfillment modes in the same shopping flow: instant same-day delivery and scheduled future fulfillment. The business problem is not simply “checkout a cart,” but “checkout a cart whose items may have different inventory rules, different validity windows, and different operational constraints.”

The implementation reflects that split directly. In `CartService.checkout`, the cart is loaded, grouped by `DeliveryMode`, and converted into one or more orders depending on the item type. The same cart can therefore contain both instant and scheduled items without collapsing those two fulfillment paths into one ambiguous order.

## Why instant and scheduled fulfillment are different

The project separates the two models in the domain layer:

- `InstantDeliveryInventory` tracks active same-day stock with `availableQuantity` and `availableUntil`.
- `ProductFulfillment` tracks the product’s default scheduled capacity.
- `ProductDailyCapacityUsage` stores how much scheduled capacity has already been reserved for a specific `productionDate`.

This split matters because the constraints are different. Same-day inventory expires over time; scheduled fulfillment is constrained by a daily capacity limit for a future production date. A product can be available for one flow and not the other, or have a different remaining quantity in each.

The fulfillment logic is owned by `FulfillmentService`, which exposes methods like `isInstantAvailable`, `reserveInstantQuantity`, `isScheduledAvailable`, `reserveScheduledCapacity`, and `getScheduledAvailableQuantity`. The scheduling logic also respects a Cairo-time cutoff and blocked days from settings.

## Why the cart is split into multiple orders

The checkout method groups cart items by `DeliveryMode` using a `Map<DeliveryMode, List<CartItem>>`. Each group is processed independently, and each generated order stores the metadata for that fulfillment mode:

- `deliveryMode`
- `scheduledDate` for scheduled orders
- address and delivery fee context for delivery orders
- order subtotal and discount amount scoped to that group

That means a mixed cart is not modeled as a single order with two conflicting meanings. Instead, each fulfillment path becomes its own `Order`, while the response still returns a single `CheckoutResponse` summarizing the full cart conversion.

This design is necessary because instant and scheduled items do not share the same inventory semantics. If they were merged into one order, the system would blur the distinction between same-day availability and future capacity reservation, which would make validation and operational accountability much harder.

## Checkout flow

The flow in `CartService.checkout` is straightforward and intentionally strict:

1. Load the active cart and reject empty carts.
2. Resolve customer identity, delivery address, fee, coupon, and scheduled date.
3. Validate the product is still available and that the requested quantity is valid for that fulfillment mode.
4. Reserve inventory or capacity immediately.
5. Create one `Order` per delivery group.
6. Clear the cart and mark it as `ORDERED`.

This is where the business logic is enforced. `CartService.validateItemAvailability` checks whether a product is still available, and instant items additionally require `FulfillmentService.isInstantAvailable`. Scheduled items are checked through `reserveScheduledCapacityForCheckout`, which verifies the quantity is within the product’s daily capacity before reserving it.

## Data consistency and transactions

The key correctness guarantee is the `@Transactional` boundary on checkout. Inventory reservation and order creation happen in the same transaction, so the system does not end up with partially-created orders or partially-reserved inventory.

The code also validates the item again before order creation to ensure the product has not been disabled since it was added to the cart. This prevents stale cart entries from being converted into fresh orders.

The scheduled-capacity path is more subtle: `ProductDailyCapacityUsage` stores the accumulated reserved quantity for a given product and `productionDate`. The service checks `dailyCapacity - reservedQuantity` before accepting a reservation. A failure is transformed into a `CheckoutAvailabilityException` with the product name, requested quantity, available quantity, scheduled date, and daily capacity to make the problem actionable for the client.

## Edge cases and trade-offs

The code explicitly handles several important cases:

- blocked dates are rejected
- scheduled dates earlier than the system's minimum allowed date are treated as unavailable
- expired or inactive instant inventory is rejected
- a reward can be attached only when the matching fulfillment mode has sufficient inventory
- a product disabled after being added to the cart fails checkout
- a mixed cart with both instant and scheduled items is still processed correctly, because each group is validated separately

The main trade-off is complexity. The system accepts a more elaborate checkout flow because correctness matters more than a simpler single-order abstraction. The alternative would be to flatten the cart into one order and ignore the distinct fulfillment semantics, which would be operationally risky and would misrepresent how the business actually works.

## Why this approach

The design reflects the real operational model of the platform: same-day fulfillment and future production fulfillment are different workflows with different capacity constraints. The project encodes that difference in the data model and enforces it in checkout. The result is a cart flow that stays correct even when customers combine multiple fulfillment modes in one purchase.
