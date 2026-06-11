package com.petites.backend.addresses.service;

import com.petites.backend.addresses.dto.AddressCreateRequest;
import com.petites.backend.addresses.dto.AddressResponse;
import com.petites.backend.addresses.dto.AddressUpdateRequest;
import com.petites.backend.addresses.entity.Address;
import com.petites.backend.addresses.repository.AddressRepository;
import com.petites.backend.users.service.UserService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AddressService {

    private final AddressRepository addressRepository;
    private final UserService userService;

    public AddressService(AddressRepository addressRepository, UserService userService) {
        this.addressRepository = addressRepository;
        this.userService = userService;
    }

    @Transactional(readOnly = true)
    public List<AddressResponse> listMine() {
        String userId = currentUserId();
        return addressRepository.findByUserId(userId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AddressResponse getMine(String id) {
        return toResponse(getMineEntity(id));
    }

    @Transactional
    public AddressResponse create(AddressCreateRequest request) {
        String userId = currentUserId();
        Address address = new Address();
        address.setUserId(userId);
        address.setCity(request.city().trim());
        address.setArea(request.area().trim());
        address.setStreet(request.street().trim());
        address.setBuilding(trimToNull(request.building()));
        address.setNotes(trimToNull(request.notes()));
        return toResponse(addressRepository.save(address));
    }

    @Transactional
    public AddressResponse update(String id, AddressUpdateRequest request) {
        Address address = getMineEntity(id);
        if (request.city() != null) {
            address.setCity(request.city().trim());
        }
        if (request.area() != null) {
            address.setArea(request.area().trim());
        }
        if (request.street() != null) {
            address.setStreet(request.street().trim());
        }
        if (request.building() != null) {
            address.setBuilding(trimToNull(request.building()));
        }
        if (request.notes() != null) {
            address.setNotes(trimToNull(request.notes()));
        }
        return toResponse(addressRepository.save(address));
    }

    @Transactional
    public void delete(String id) {
        Address address = getMineEntity(id);
        addressRepository.delete(address);
    }

    private Address getMineEntity(String id) {
        return addressRepository.findByIdAndUserId(id, currentUserId())
                .orElseThrow(() -> new IllegalArgumentException("Address not found"));
    }

    private AddressResponse toResponse(Address address) {
        return new AddressResponse(
                address.getId(),
                address.getUserId(),
                address.getCity(),
                address.getArea(),
                address.getStreet(),
                address.getBuilding(),
                address.getNotes()
        );
    }

    private String currentUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new IllegalArgumentException("Authenticated user is required");
        }
        Object principal = authentication.getPrincipal();
        if (!(principal instanceof String userId) || userId.isBlank() || "anonymousUser".equals(userId)) {
            throw new IllegalArgumentException("Authenticated user is required");
        }
        userService.findById(userId).orElseThrow(() -> new IllegalArgumentException("Authenticated user is required"));
        return userId;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isBlank() ? null : trimmed;
    }
}