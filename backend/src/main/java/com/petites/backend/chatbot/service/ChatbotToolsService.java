package com.petites.backend.chatbot.service;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import com.petites.backend.products.dto.ProductResponse;
import com.petites.backend.products.service.ProductService;

@Service
public class ChatbotToolsService {

    private final ProductService productService;

    public ChatbotToolsService(ProductService productService) {
        this.productService = productService;
    }

    /**
     * Search menu items by query string, category, fulfillment mode, or max price limit.
     */
    public List<ProductResponse> searchMenuItems(String search, String categoryId, String fulfillmentMode, BigDecimal maxPrice, Boolean availableOnly) {
        try {
            Page<ProductResponse> page = productService.list(
                categoryId,
                availableOnly != null ? availableOnly : Boolean.TRUE,
                fulfillmentMode,
                maxPrice,
                search,
                PageRequest.of(0, 10)
            );
            return page.getContent();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    /**
     * Get featured items currently available.
     */
    public List<ProductResponse> getFeaturedItems() {
        try {
            Page<ProductResponse> page = productService.featured(PageRequest.of(0, 5));
            return page.getContent();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    /**
     * Get product by ID.
     */
    public ProductResponse getProductById(String id) {
        if (id == null || id.isBlank()) return null;
        try {
            return productService.get(id.trim());
        } catch (Exception e) {
            return null;
        }
    }
}
