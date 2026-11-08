package com.petites.backend.products.service;

import com.petites.backend.categories.repository.CategoryRepository;
import com.petites.backend.images.service.ImageUploadService;
import com.petites.backend.products.dto.ProductUpdateRequest;
import com.petites.backend.products.entity.Product;
import com.petites.backend.products.entity.ProductImage;
import com.petites.backend.products.repository.ProductRepository;
import java.lang.reflect.Field;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.clear();
    }

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

    @Test
    void updateWithoutImageChangesDoesNotTriggerImageDeletion() throws Exception {
        String productId = "product-1";
        Product product = new Product();
        assignId(product, productId);
        product.setName("Old Name");
        product.setMainImage("https://res.cloudinary.com/test/existing-main.jpg");
        product.setPrice(new BigDecimal("50.00"));

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        ProductUpdateRequest request = new ProductUpdateRequest(
                null, "New Name", null, new BigDecimal("60.00"), null, null, null, null);

        productService.update(productId, request);

        assertEquals("New Name", product.getName());
        assertEquals(new BigDecimal("60.00"), product.getPrice());
        verifyNoInteractions(imageUploadService);
    }

    @Test
    void updateWithNewMainImageDeletesPreviousMainImageWhenNonTransactional() throws Exception {
        String productId = "product-1";
        Product product = new Product();
        assignId(product, productId);
        product.setMainImage("https://res.cloudinary.com/test/old-main.jpg");

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        ProductUpdateRequest request = new ProductUpdateRequest(
                null, null, null, null, "https://res.cloudinary.com/test/new-main.jpg", null, null, null);

        productService.update(productId, request);

        assertEquals("https://res.cloudinary.com/test/new-main.jpg", product.getMainImage());
        verify(imageUploadService, times(1)).delete("https://res.cloudinary.com/test/old-main.jpg");
    }

    @Test
    void updateWithNewGalleryImagesDeletesOldGalleryImagesWhenNonTransactional() throws Exception {
        String productId = "product-1";
        Product product = new Product();
        assignId(product, productId);
        product.getImages().add(new ProductImage(product, "https://res.cloudinary.com/test/old-gallery-1.jpg"));
        product.getImages().add(new ProductImage(product, "https://res.cloudinary.com/test/old-gallery-2.jpg"));

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        ProductUpdateRequest request = new ProductUpdateRequest(
                null, null, null, null, null, null, null,
                List.of("https://res.cloudinary.com/test/new-gallery-1.jpg"));

        productService.update(productId, request);

        verify(imageUploadService).delete("https://res.cloudinary.com/test/old-gallery-1.jpg");
        verify(imageUploadService).delete("https://res.cloudinary.com/test/old-gallery-2.jpg");
        assertEquals(1, product.getImages().size());
        assertEquals("https://res.cloudinary.com/test/new-gallery-1.jpg", product.getImages().get(0).getImageUrl());
    }

    @Test
    void updateWithinActiveTransactionDefersCloudinaryDeletionUntilAfterCommit() throws Exception {
        String productId = "product-1";
        Product product = new Product();
        assignId(product, productId);
        product.setMainImage("https://res.cloudinary.com/test/old-main.jpg");

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        TransactionSynchronizationManager.initSynchronization();
        try {
            ProductUpdateRequest request = new ProductUpdateRequest(
                    null, null, null, null, "https://res.cloudinary.com/test/new-main.jpg", null, null, null);

            productService.update(productId, request);

            // Verify: DURING the transaction, image deletion was deferred, NOT called
            // synchronously
            verifyNoInteractions(imageUploadService);

            // Simulate transaction commit
            for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCommit();
            }

            // Verify: AFTER transaction commit, image deletion is triggered
            verify(imageUploadService, times(1)).delete("https://res.cloudinary.com/test/old-main.jpg");
        } finally {
            TransactionSynchronizationManager.clear();
        }
    }

    @Test
    void updateWithinActiveTransactionDoesNotDeleteImagesOnRollback() throws Exception {
        String productId = "product-1";
        Product product = new Product();
        assignId(product, productId);
        product.setMainImage("https://res.cloudinary.com/test/old-main.jpg");

        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenAnswer(inv -> inv.getArgument(0));

        TransactionSynchronizationManager.initSynchronization();
        try {
            ProductUpdateRequest request = new ProductUpdateRequest(
                    null, null, null, null, "https://res.cloudinary.com/test/new-main.jpg", null, null, null);

            productService.update(productId, request);

            // Verify: DURING the transaction, image deletion was deferred
            verifyNoInteractions(imageUploadService);

            // Simulate transaction rollback (afterCommit is NOT called, only
            // afterCompletion with rolled back)
            for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);
            }

            // Verify: Images were NOT deleted because transaction rolled back!
            verifyNoInteractions(imageUploadService);
        } finally {
            TransactionSynchronizationManager.clear();
        }
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