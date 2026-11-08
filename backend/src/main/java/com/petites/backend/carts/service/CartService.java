package com.petites.backend.carts.service;

import com.petites.backend.carts.dto.CartItemRequest;
import com.petites.backend.carts.dto.CartItemResponse;
import com.petites.backend.carts.dto.CartItemUpdateRequest;
import com.petites.backend.carts.dto.CartOwnerRef;
import com.petites.backend.carts.dto.CartResponse;
import com.petites.backend.carts.entity.Cart;
import com.petites.backend.carts.entity.CartItem;
import com.petites.backend.carts.enums.CartStatus;
import com.petites.backend.carts.repository.CartItemRepository;
import com.petites.backend.carts.repository.CartRepository;
import com.petites.backend.common.enums.DeliveryMode;
import com.petites.backend.products.entity.Product;
import com.petites.backend.products.repository.ProductRepository;
import com.petites.backend.products.service.FulfillmentService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {

    @Value("${app.cart.guest-retention-days:14}")
    private int guestRetentionDays = 14;

    private final CartRepository cartRepository;
    private final CartItemRepository cartItemRepository;
    private final ProductRepository productRepository;
    private final FulfillmentService fulfillmentService;

    @Autowired
    public CartService(CartRepository cartRepository,
            CartItemRepository cartItemRepository,
            ProductRepository productRepository,
            FulfillmentService fulfillmentService) {
        this.cartRepository = cartRepository;
        this.cartItemRepository = cartItemRepository;
        this.productRepository = productRepository;
        this.fulfillmentService = fulfillmentService;
    }

    @Transactional(readOnly = true)
    public CartResponse getCart(CartOwnerRef owner) {
        return toResponse(getOrCreateActiveCart(owner));
    }

    @Transactional
    public CartResponse addItem(CartOwnerRef owner, CartItemRequest request) {
        Cart cart = getOrCreateActiveCart(owner);
        Product product = getProduct(request.productId());
        DeliveryMode deliveryMode = request.deliveryMode();
        validateItemAvailability(product.getId(), request.quantity(), deliveryMode);

        CartItem item = cartItemRepository
                .findByCartIdAndProductIdAndDeliveryMode(cart.getId(), product.getId(), deliveryMode)
                .orElseGet(() -> createCartItem(cart, product, deliveryMode));

        item.setQuantity(item.getQuantity() + request.quantity());
        item.setUnitPrice(product.getPrice());
        cartItemRepository.save(item);
        return toResponse(cart);
    }

    @Transactional
    public CartResponse updateItem(CartOwnerRef owner, String itemId, CartItemUpdateRequest request) {
        Cart cart = getOrCreateActiveCart(owner);
        CartItem item = cartItemRepository.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new IllegalArgumentException("Cart item not found"));

        Product product = item.getProduct();
        DeliveryMode deliveryMode = request.deliveryMode();
        validateItemAvailability(product.getId(), request.quantity(), deliveryMode);

        item.setQuantity(request.quantity());
        item.setDeliveryMode(deliveryMode);
        item.setUnitPrice(product.getPrice());
        cartItemRepository.save(item);
        return toResponse(cart);
    }

    @Transactional
    public CartResponse removeItem(CartOwnerRef owner, String itemId) {
        Cart cart = getOrCreateActiveCart(owner);
        CartItem item = cartItemRepository.findByIdAndCartId(itemId, cart.getId())
                .orElseThrow(() -> new IllegalArgumentException("Cart item not found"));
        cartItemRepository.delete(item);
        return toResponse(cart);
    }

    @Transactional
    public CartResponse clearCart(CartOwnerRef owner) {
        Cart cart = getOrCreateActiveCart(owner);
        cartItemRepository.deleteByCartId(cart.getId());
        return toResponse(cart);
    }

    @Transactional(readOnly = true)
    public CartResponse toResponse(Cart cart) {
        List<CartItemResponse> items = cartItemRepository.findByCartIdOrderByCreatedAtAsc(cart.getId())
                .stream()
                .map(this::toResponse)
                .toList();

        BigDecimal subtotal = items.stream()
                .map(CartItemResponse::lineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new CartResponse(
                cart.getId(),
                cart.getUserId(),
                cart.getGuestSessionId(),
                cart.getStatus(),
                cart.getCreatedAt(),
                subtotal,
                items);
    }

    @Transactional(readOnly = true)
    public CartItemResponse toResponse(CartItem item) {
        BigDecimal lineTotal = item.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity()));
        return new CartItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProduct().getName(),
                item.getProduct().getMainImage(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getDeliveryMode(),
                lineTotal);
    }

    public Cart getOrCreateActiveCart(CartOwnerRef owner) {
        Cart cart = findActiveCart(owner).orElseGet(() -> {
            Cart created = new Cart();
            created.setUserId(owner.userId());
            created.setGuestSessionId(owner.guestSessionId());
            created.setStatus(CartStatus.ACTIVE);
            return cartRepository.save(created);
        });

        if (cart.getStatus() != CartStatus.ACTIVE) {
            cart.setStatus(CartStatus.ACTIVE);
            cart = cartRepository.save(cart);
        }

        return cart;
    }

    private Optional<Cart> findActiveCart(CartOwnerRef owner) {
        if (owner.isUser()) {
            return cartRepository.findByUserIdAndStatus(owner.userId(), CartStatus.ACTIVE);
        }
        if (owner.isGuest()) {
            return cartRepository.findByGuestSessionIdAndStatus(owner.guestSessionId(), CartStatus.ACTIVE);
        }
        throw new IllegalArgumentException("Cart owner is required");
    }

    private CartItem createCartItem(Cart cart, Product product, DeliveryMode deliveryMode) {
        CartItem item = new CartItem();
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(0);
        item.setUnitPrice(product.getPrice());
        item.setDeliveryMode(deliveryMode);
        return item;
    }

    private Product getProduct(String productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
    }

    private void validateItemAvailability(String productId, int quantity, DeliveryMode deliveryMode) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
        if (!product.isAvailable()) {
            throw new IllegalArgumentException("Product is not available");
        }

        if (deliveryMode == DeliveryMode.INSTANT) {
            if (!fulfillmentService.isInstantAvailable(productId, quantity)) {
                throw new IllegalArgumentException("Instant delivery inventory is not sufficient");
            }
        }
    }

    @Scheduled(cron = "${app.cart.cleanup-cron:0 0 3 * * ?}")
    @Transactional
    public int cleanupAbandonedGuestCarts() {
        Instant cutoff = Instant.now().minus(guestRetentionDays, ChronoUnit.DAYS);
        return cartRepository.deleteAbandonedGuestCarts(CartStatus.ACTIVE, cutoff);
    }

    public void setGuestRetentionDays(int guestRetentionDays) {
        this.guestRetentionDays = guestRetentionDays;
    }
}
