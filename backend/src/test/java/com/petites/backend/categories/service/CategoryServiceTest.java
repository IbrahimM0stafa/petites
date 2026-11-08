package com.petites.backend.categories.service;

import com.petites.backend.categories.dto.CategoryUpdateRequest;
import com.petites.backend.categories.entity.Category;
import com.petites.backend.categories.repository.CategoryRepository;
import com.petites.backend.images.service.ImageUploadService;
import java.lang.reflect.Field;
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
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CategoryServiceTest {

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private ImageUploadService imageUploadService;

    @InjectMocks
    private CategoryService categoryService;

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.clear();
    }

    @Test
    void deleteThrowsExceptionWhenCategoryHasProducts() throws Exception {
        String catId = "cat-1";
        Category category = new Category();
        assignId(category, catId);
        category.setImageUrl("https://res.cloudinary.com/test/cat.jpg");

        when(categoryRepository.findById(catId)).thenReturn(Optional.of(category));
        when(categoryRepository.hasProducts(catId)).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> categoryService.delete(catId));

        verify(categoryRepository, never()).delete(any());
        verifyNoInteractions(imageUploadService);
    }

    @Test
    void deleteDeletesImageWhenNonTransactional() throws Exception {
        String catId = "cat-1";
        Category category = new Category();
        assignId(category, catId);
        category.setImageUrl("https://res.cloudinary.com/test/cat.jpg");

        when(categoryRepository.findById(catId)).thenReturn(Optional.of(category));
        when(categoryRepository.hasProducts(catId)).thenReturn(false);

        categoryService.delete(catId);

        verify(categoryRepository).delete(category);
        verify(imageUploadService, times(1)).delete("https://res.cloudinary.com/test/cat.jpg");
    }

    @Test
    void deleteWithinActiveTransactionDefersCloudinaryDeletionUntilAfterCommit() throws Exception {
        String catId = "cat-1";
        Category category = new Category();
        assignId(category, catId);
        category.setImageUrl("https://res.cloudinary.com/test/cat.jpg");

        when(categoryRepository.findById(catId)).thenReturn(Optional.of(category));
        when(categoryRepository.hasProducts(catId)).thenReturn(false);

        TransactionSynchronizationManager.initSynchronization();
        try {
            categoryService.delete(catId);

            verify(categoryRepository).delete(category);
            verifyNoInteractions(imageUploadService);

            for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCommit();
            }

            verify(imageUploadService, times(1)).delete("https://res.cloudinary.com/test/cat.jpg");
        } finally {
            TransactionSynchronizationManager.clear();
        }
    }

    @Test
    void updateWithNewImageDeletesOldImageAfterCommit() throws Exception {
        String catId = "cat-1";
        Category category = new Category();
        assignId(category, catId);
        category.setName("Cupcakes");
        category.setImageUrl("https://res.cloudinary.com/test/old-cat.jpg");

        when(categoryRepository.findById(catId)).thenReturn(Optional.of(category));
        when(categoryRepository.save(any(Category.class))).thenAnswer(inv -> inv.getArgument(0));

        TransactionSynchronizationManager.initSynchronization();
        try {
            CategoryUpdateRequest request = new CategoryUpdateRequest(
                    "Cupcakes Updated", "https://res.cloudinary.com/test/new-cat.jpg", 1);

            categoryService.update(catId, request);

            assertEquals("https://res.cloudinary.com/test/new-cat.jpg", category.getImageUrl());
            verifyNoInteractions(imageUploadService);

            for (TransactionSynchronization sync : TransactionSynchronizationManager.getSynchronizations()) {
                sync.afterCommit();
            }

            verify(imageUploadService, times(1)).delete("https://res.cloudinary.com/test/old-cat.jpg");
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