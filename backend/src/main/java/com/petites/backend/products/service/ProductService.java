package com.petites.backend.products.service;

import com.petites.backend.images.service.ImageUploadService;
import java.io.IOException;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;

import com.petites.backend.categories.entity.Category;
import com.petites.backend.categories.repository.CategoryRepository;
import com.petites.backend.products.dto.ProductCreateRequest;
import com.petites.backend.products.dto.ProductImageResponse;
import com.petites.backend.products.dto.ProductResponse;
import com.petites.backend.products.dto.ProductUpdateRequest;
import com.petites.backend.products.entity.Product;
import com.petites.backend.products.entity.ProductImage;
import com.petites.backend.products.repository.ProductRepository;
import com.petites.backend.products.entity.InstantDeliveryInventory;
import java.time.LocalDate;
import java.time.Instant;
import java.util.Optional;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private static final Logger logger = LoggerFactory.getLogger(ProductService.class);
    private final ImageUploadService imageUploadService;
    private final FulfillmentService fulfillmentService;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository, ImageUploadService imageUploadService, FulfillmentService fulfillmentService) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.imageUploadService = imageUploadService;
        this.fulfillmentService = fulfillmentService;
    }

    @Transactional
    public void delete(String id) {
        Product product = getEntity(id);
        product.setAvailable(false);
        product.setFeatured(false);
        productRepository.save(product);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> list(String categoryId, Boolean available, String fulfillmentMode, Pageable pageable) {
        String catId = (categoryId != null && !categoryId.trim().isEmpty()) ? categoryId.trim() : null;

        Page<Product> productPage;

        if ("instant".equalsIgnoreCase(fulfillmentMode)) {
            productPage = productRepository.findInstantAvailable(catId, available, Instant.now(), pageable);
        } else if ("scheduled".equalsIgnoreCase(fulfillmentMode)) {
            productPage = productRepository.findScheduledEligible(catId, available, pageable);
        } else {
            boolean hasCategory = catId != null;
            boolean hasAvailable = available != null;

            if (hasCategory && hasAvailable) {
                productPage = productRepository.findByCategoryIdAndAvailable(catId, available, pageable);
            } else if (hasCategory) {
                productPage = productRepository.findByCategoryId(catId, pageable);
            } else if (hasAvailable) {
                productPage = productRepository.findByAvailable(available, pageable);
            } else {
                productPage = productRepository.findAll(pageable);
            }
        }

        return productPage.map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public Page<ProductResponse> featured(Pageable pageable) {
        return productRepository.findByFeaturedTrueAndAvailableTrue(pageable)
                .map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public ProductResponse get(String id) {
        return toResponse(getEntity(id));
    }

    @Transactional
    public ProductResponse create(ProductCreateRequest request) {
        Product product = new Product();
        product.setName(request.name().trim());
        product.setDescription(request.description() != null ? request.description().trim() : null);
        product.setPrice(request.price());
        product.setMainImage(request.mainImage() != null ? request.mainImage().trim() : null);
        product.setAvailable(request.isAvailable() == null || request.isAvailable());
        product.setFeatured(request.isFeatured() != null && request.isFeatured());

        if (request.categoryId() != null && !request.categoryId().trim().isEmpty()) {
            Category category = categoryRepository.findById(request.categoryId().trim())
                    .orElseThrow(() -> new IllegalArgumentException("Category not found with ID: " + request.categoryId()));
            product.setCategory(category);
        }

        if (request.imageUrls() != null && !request.imageUrls().isEmpty()) {
            for (String url : request.imageUrls()) {
                if (url != null && !url.trim().isEmpty()) {
                    product.getImages().add(new ProductImage(product, url.trim()));
                }
            }
        }

        return toResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse update(String id, ProductUpdateRequest request) {
        Product product = getEntity(id);
        String previousMainImage = product.getMainImage();

        if (request.name() != null) {
            product.setName(request.name().trim());
        }
        if (request.description() != null) {
            product.setDescription(request.description().trim().isEmpty() ? null : request.description().trim());
        }
        if (request.price() != null) {
            product.setPrice(request.price());
        }
        if (request.mainImage() != null) {
            String nextMainImage = request.mainImage().trim().isEmpty() ? null : request.mainImage().trim();
            if (previousMainImage != null && !previousMainImage.equals(nextMainImage)) {
                deleteCloudinaryImage(previousMainImage);
            }
            product.setMainImage(nextMainImage);
        }
        if (request.isAvailable() != null) {
            product.setAvailable(request.isAvailable());
        }
        if (request.isFeatured() != null) {
            product.setFeatured(request.isFeatured());
        }

        if (request.categoryId() != null) {
            String catId = request.categoryId().trim();
            if (catId.isEmpty()) {
                product.setCategory(null);
            } else {
                Category category = categoryRepository.findById(catId)
                        .orElseThrow(() -> new IllegalArgumentException("Category not found with ID: " + catId));
                product.setCategory(category);
            }
        }

        if (request.imageUrls() != null) {
            List<ProductImage> existingImages = new ArrayList<>(product.getImages());
            for (ProductImage image : existingImages) {
                deleteCloudinaryImage(image.getImageUrl());
            }
            product.getImages().clear();
            for (String url : request.imageUrls()) {
                if (url != null && !url.trim().isEmpty()) {
                    product.getImages().add(new ProductImage(product, url.trim()));
                }
            }
        }

        return toResponse(productRepository.save(product));
    }

    

    private Product getEntity(String id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));
    }

    private void deleteCloudinaryImage(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank()) {
            return;
        }

        try {
            imageUploadService.delete(imageUrl);
        } catch (IOException e) {
            logger.warn("Failed to delete Cloudinary image {}: {}", imageUrl, e.getMessage());
        }
    }

    private ProductResponse toResponse(Product product) {
        String categoryId = product.getCategory() != null ? product.getCategory().getId() : null;
        String categoryName = product.getCategory() != null ? product.getCategory().getName() : null;

        List<ProductImageResponse> images = new ArrayList<>();
        if (product.getImages() != null) {
            images = product.getImages().stream()
                    .map(img -> new ProductImageResponse(img.getId(), img.getImageUrl()))
                    .toList();
        }

        LocalDate earliestDate = fulfillmentService.calculateEarliestScheduledDate();
        boolean scheduledEligible = product.isAvailable();

        Optional<InstantDeliveryInventory> activeInstant = fulfillmentService.getActiveInstantInventory(product.getId());
        boolean instantAvailableToday = activeInstant.isPresent();
        Integer instantQuantityToday = activeInstant.map(InstantDeliveryInventory::getAvailableQuantity).orElse(0);
        Instant instantAvailableUntil = activeInstant.map(InstantDeliveryInventory::getAvailableUntil).orElse(null);

        return new ProductResponse(
                product.getId(),
                categoryId,
                categoryName,
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getMainImage(),
                product.isAvailable(),
                product.isFeatured(),
                images,
                product.getCreatedAt(),
                product.getUpdatedAt(),
                scheduledEligible,
                earliestDate,
                instantAvailableToday,
                instantQuantityToday,
                instantAvailableUntil
        );
    }
}
