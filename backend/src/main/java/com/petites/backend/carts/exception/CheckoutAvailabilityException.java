package com.petites.backend.carts.exception;

import java.util.Map;

public class CheckoutAvailabilityException extends IllegalArgumentException {

    private final Map<String, String> fields;

    public CheckoutAvailabilityException(String message, Map<String, String> fields) {
        super(message);
        this.fields = fields;
    }

    public Map<String, String> getFields() {
        return fields;
    }
}
