package com.petites.backend.chatbot.dto;

import java.util.Collections;
import java.util.List;
import com.petites.backend.products.dto.ProductResponse;

public record ChatResponse(
    String reply,
    List<ProductResponse> products,
    ChatActionDto action,
    List<String> quickReplies
) {
    public ChatResponse(String reply, List<ProductResponse> products) {
        this(reply, products, null, Collections.emptyList());
    }

    public ChatResponse(String reply, List<ProductResponse> products, ChatActionDto action) {
        this(reply, products, action, Collections.emptyList());
    }
}
