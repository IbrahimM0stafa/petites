package com.petites.backend.carts.service;

import com.petites.backend.carts.dto.CartItemRequest;
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
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CartServiceTest {

    @Mock
    private CartRepository cartRepository;

    @Mock
    private CartItemRepository cartItemRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private FulfillmentService fulfillmentService;

    @InjectMocks
    private CartService cartService;

    @Test
    void getCart_ReturnsCartResponseWithItemsAndSubtotal() throws Exception {
        String userId = "user-1";
        String cartId = "cart-1";

        Cart cart = new Cart();
        assignId(cart, cartId);
        cart.setUserId(userId);
        cart.setStatus(CartStatus.ACTIVE);
        cart.setCreatedAt(Instant.now());

        Product product = product("prod-1", "Macaron", "macaron.jpg", new BigDecimal("15.00"));
        CartItem item = cartItem(cart, product, 2, DeliveryMode.INSTANT);

        when(cartRepository.findByUserIdAndStatus(userId, CartStatus.ACTIVE)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartIdOrderByCreatedAtAsc(cartId)).thenReturn(List.of(item));

        CartResponse response = cartService.getCart(CartOwnerRef.forUser(userId));

        assertNotNull(response);
        assertEquals(cartId, response.cartId());
        assertEquals(1, response.items().size());
        assertEquals(new BigDecimal("30.00"), response.subtotal());
    }

    @Test
    void addItem_CreatesNewCartItemWhenNotAlreadyInCart() throws Exception {
        String userId = "user-1";
        String cartId = "cart-1";
        String productId = "prod-1";

        Cart cart = new Cart();
        assignId(cart, cartId);
        cart.setUserId(userId);
        cart.setStatus(CartStatus.ACTIVE);

        Product product = product(productId, "Croissant", "croissant.jpg", new BigDecimal("25.00"));

        when(cartRepository.findByUserIdAndStatus(userId, CartStatus.ACTIVE)).thenReturn(Optional.of(cart));
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(fulfillmentService.isInstantAvailable(productId, 2)).thenReturn(true);
        when(cartItemRepository.findByCartIdAndProductIdAndDeliveryMode(cartId, productId, DeliveryMode.INSTANT))
                .thenReturn(Optional.empty());
        when(cartItemRepository.findByCartIdOrderByCreatedAtAsc(cartId)).thenReturn(List.of());

        CartItemRequest request = new CartItemRequest(productId, 2, DeliveryMode.INSTANT);
        cartService.addItem(CartOwnerRef.forUser(userId), request);

        ArgumentCaptor<CartItem> captor = ArgumentCaptor.forClass(CartItem.class);
        verify(cartItemRepository).save(captor.capture());
        CartItem savedItem = captor.getValue();
        assertEquals(2, savedItem.getQuantity());
        assertEquals(new BigDecimal("25.00"), savedItem.getUnitPrice());
        assertEquals(DeliveryMode.INSTANT, savedItem.getDeliveryMode());
    }

    @Test
    void removeItem_DeletesItemFromCart() throws Exception {
        String userId = "user-1";
        String cartId = "cart-1";
        String itemId = "item-1";

        Cart cart = new Cart();
        assignId(cart, cartId);
        cart.setUserId(userId);
        cart.setStatus(CartStatus.ACTIVE);

        CartItem item = new CartItem();
        assignId(item, itemId);
        item.setCart(cart);

        when(cartRepository.findByUserIdAndStatus(userId, CartStatus.ACTIVE)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByIdAndCartId(itemId, cartId)).thenReturn(Optional.of(item));
        when(cartItemRepository.findByCartIdOrderByCreatedAtAsc(cartId)).thenReturn(List.of());

        cartService.removeItem(CartOwnerRef.forUser(userId), itemId);

        verify(cartItemRepository).delete(item);
    }

    @Test
    void clearCart_DeletesAllItemsByCartId() throws Exception {
        String userId = "user-1";
        String cartId = "cart-1";

        Cart cart = new Cart();
        assignId(cart, cartId);
        cart.setUserId(userId);
        cart.setStatus(CartStatus.ACTIVE);

        when(cartRepository.findByUserIdAndStatus(userId, CartStatus.ACTIVE)).thenReturn(Optional.of(cart));
        when(cartItemRepository.findByCartIdOrderByCreatedAtAsc(cartId)).thenReturn(List.of());

        cartService.clearCart(CartOwnerRef.forUser(userId));

        verify(cartItemRepository).deleteByCartId(cartId);
    }

    @Test
    void cleanupAbandonedGuestCarts_PurgesOnlyActiveGuestCartsOlderThanCutoff() {
        when(cartRepository.deleteAbandonedGuestCarts(eq(CartStatus.ACTIVE), any(Instant.class)))
                .thenReturn(5);

        int result = cartService.cleanupAbandonedGuestCarts();

        assertEquals(5, result);
        ArgumentCaptor<Instant> cutoffCaptor = ArgumentCaptor.forClass(Instant.class);
        verify(cartRepository).deleteAbandonedGuestCarts(eq(CartStatus.ACTIVE), cutoffCaptor.capture());

        Instant capturedCutoff = cutoffCaptor.getValue();
        Instant expectedCutoff = Instant.now().minus(14, ChronoUnit.DAYS);
        assertTrue(Math.abs(capturedCutoff.toEpochMilli() - expectedCutoff.toEpochMilli()) < 5000);
    }

    private Product product(String id, String name, String image, BigDecimal price) throws Exception {
        Product product = new Product();
        assignId(product, id);
        product.setName(name);
        product.setMainImage(image);
        product.setPrice(price);
        product.setAvailable(true);
        return product;
    }

    private CartItem cartItem(Cart cart, Product product, int quantity, DeliveryMode deliveryMode) throws Exception {
        CartItem item = new CartItem();
        assignId(item, UUID.randomUUID().toString());
        item.setCart(cart);
        item.setProduct(product);
        item.setQuantity(quantity);
        item.setUnitPrice(product.getPrice());
        item.setDeliveryMode(deliveryMode);
        item.setCreatedAt(Instant.now());
        return item;
    }

    private void assignId(Object entity, String id) throws Exception {
        Class<?> currentType = entity.getClass();
        Field field = null;
        while (currentType != null && field == null) {
            try {
                field = currentType.getDeclaredField("id");
            } catch (NoSuchFieldException ignored) {
                currentType = currentType.getSuperclass();
            }
        }
        if (field == null) {
            throw new IllegalStateException("Unable to locate id field");
        }
        field.setAccessible(true);
        field.set(entity, id);
    }
}
