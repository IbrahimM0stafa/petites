package com.petites.backend.products.service;

import com.petites.backend.categories.repository.CategoryRepository;
import com.petites.backend.images.service.ImageUploadService;
import com.petites.backend.products.entity.Product;
import com.petites.backend.products.repository.ProductRepository;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProductServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ImageUploadService imageUploadService;

    @Mock
    private FulfillmentService fulfillmentService;

    @InjectMocks
    private ProductService productService;

    @Test
    void deleteArchivesProductInsteadOfRemovingIt() throws Exception {
        String productId = "product-1";

        Product product = new Product();
        assignId(product, productId);
        product.setName("Cupcake");
        product.setPrice(new BigDecimal("30.00"));
        product.setAvailable(true);
        product.setFeatured(true);

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        productService.delete(productId);

        assertNotNull(product);
        assertFalse(product.isAvailable());
        assertFalse(product.isFeatured());
        verify(productRepository, never()).delete(any(Product.class));
        verify(productRepository).save(product);
        verify(imageUploadService, never()).delete(any());
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