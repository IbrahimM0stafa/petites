package com.petites.backend.categories.service;

import java.util.List;

import com.petites.backend.images.service.ImageUploadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.petites.backend.categories.dto.CategoryCreateRequest;
import com.petites.backend.categories.dto.CategoryResponse;
import com.petites.backend.categories.dto.CategoryUpdateRequest;
import com.petites.backend.categories.entity.Category;
import com.petites.backend.categories.repository.CategoryRepository;

@Service
public class CategoryService {

    private static final Logger logger = LoggerFactory.getLogger(CategoryService.class);

    private final CategoryRepository categoryRepository;
    private final ImageUploadService imageUploadService;

    public CategoryService(CategoryRepository categoryRepository, ImageUploadService imageUploadService) {
        this.categoryRepository = categoryRepository;
        this.imageUploadService = imageUploadService;
    }

    @Transactional(readOnly = true)
    public Page<CategoryResponse> list(Pageable pageable) {
        return categoryRepository.findAll(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public CategoryResponse get(String id) {
        return toResponse(getEntity(id));
    }

    @Transactional
    public CategoryResponse create(CategoryCreateRequest request) {
        Category category = new Category();
        category.setName(request.name().trim());
        category.setImageUrl(request.imageUrl() != null ? request.imageUrl().trim() : null);
        category.setSortOrder(request.sortOrder());

        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse update(String id, CategoryUpdateRequest request) {
        Category category = getEntity(id);
        String previousImageUrl = category.getImageUrl();

        if (request.name() != null) {
            category.setName(request.name().trim());
        }
        if (request.imageUrl() != null) {
            String nextImageUrl = request.imageUrl().trim().isEmpty() ? null : request.imageUrl().trim();
            if (previousImageUrl != null && !previousImageUrl.equals(nextImageUrl)) {
                deleteCloudinaryImage(previousImageUrl);
            }
            category.setImageUrl(nextImageUrl);
        }
        if (request.sortOrder() != null) {
            category.setSortOrder(request.sortOrder());
        }

        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public void delete(String id) {
        Category category = getEntity(id);

        if (categoryRepository.hasProducts(id)) {
            throw new IllegalArgumentException("Cannot delete category as it has associated products");
        }

        deleteCloudinaryImage(category.getImageUrl());

        categoryRepository.delete(category);
    }

    private Category getEntity(String id) {
        return categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));
    }

    private void deleteCloudinaryImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }

        try {
            imageUploadService.delete(imageUrl);
        } catch (Exception e) {
            logger.warn("Failed to delete Cloudinary image {}: {}", imageUrl, e.getMessage());
        }
    }

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(
                category.getId(),
                category.getName(),
                category.getImageUrl(),
                category.getSortOrder()
        );
    }
}
