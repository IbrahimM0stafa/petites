package com.petites.backend.users.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.petites.backend.users.dto.AdminUserCreateRequest;
import com.petites.backend.users.dto.AssignRoleByEmailRequest;
import com.petites.backend.users.dto.UserCreateRequest;
import com.petites.backend.users.dto.UserResponse;
import com.petites.backend.users.dto.UserUpdateRequest;
import com.petites.backend.users.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/users")
@Validated
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<UserResponse> create(@Valid @RequestBody UserCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.create(request));
    }

    @PostMapping("/admin")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<UserResponse> createAdminStaff(@Valid @RequestBody AdminUserCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(userService.createAdminStaff(request));
    }

    @PostMapping("/admin/assign-role")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public UserResponse assignRoleByEmail(@Valid @RequestBody AssignRoleByEmailRequest request) {
        return userService.assignRoleByEmail(request.email(), request.role());
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STAFF')")
    public List<UserResponse> list() {
        return userService.list();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STAFF') or #id == principal")
    public UserResponse get(@PathVariable String id) {
        return userService.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STAFF') or #id == principal")
    public UserResponse update(@PathVariable String id, @Valid @RequestBody UserUpdateRequest request) {
        return userService.update(id, request);
    }

    @PatchMapping("/{id}/deactivate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STAFF') or #id == principal")
    public UserResponse deactivate(@PathVariable String id) {
        String currentUserId = (String) org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (id.equals(currentUserId)) {
            UserResponse currentUser = userService.get(currentUserId);
            if (currentUser.roles().contains("SUPER_ADMIN")) {
                throw new IllegalArgumentException("Superadmin cannot deactivate their own account");
            }
        }
        return userService.setActive(id, false);
    }

    @PatchMapping("/{id}/reactivate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'STAFF') or #id == principal")
    public UserResponse reactivate(@PathVariable String id) {
        return userService.setActive(id, true);
    }
}
