package com.petites.backend.addresses.controller;

import com.petites.backend.addresses.dto.AddressCreateRequest;
import com.petites.backend.addresses.dto.AddressResponse;
import com.petites.backend.addresses.dto.AddressUpdateRequest;
import com.petites.backend.addresses.service.AddressService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/addresses")
public class AddressController {

    private final AddressService addressService;

    public AddressController(AddressService addressService) {
        this.addressService = addressService;
    }

    @GetMapping
    public List<AddressResponse> list() {
        return addressService.listMine();
    }

    @GetMapping("/{id}")
    public AddressResponse get(@PathVariable String id) {
        return addressService.getMine(id);
    }

    @PostMapping
    public ResponseEntity<AddressResponse> create(@Valid @RequestBody AddressCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(addressService.create(request));
    }

    @PutMapping("/{id}")
    public AddressResponse update(@PathVariable String id, @RequestBody AddressUpdateRequest request) {
        return addressService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        addressService.delete(id);
        return ResponseEntity.noContent().build();
    }
}