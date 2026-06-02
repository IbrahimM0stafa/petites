package com.petites.backend.users.service;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.petites.backend.users.dto.UserCreateRequest;
import com.petites.backend.users.dto.UserResponse;
import com.petites.backend.users.dto.UserUpdateRequest;
import com.petites.backend.users.entity.Role;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.repository.RoleRepository;
import com.petites.backend.users.repository.UserRepository;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepository, RoleRepository roleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse create(UserCreateRequest request) {
        String email = normalizeEmail(request.email());
        if (email != null && userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }

        User user = new User();
        user.setName(request.name().trim());
        user.setPhone(request.phone().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));

        // Assign default USER role if it exists
        roleRepository.findByName("USER").ifPresent(user.getRoles()::add);

        return toResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public UserResponse get(String id) {
        return toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        return userRepository.findAll().stream().map(this::toResponse).toList();
    }

    @Transactional
    public UserResponse update(String id, UserUpdateRequest request) {
        User user = getEntity(id);

        if (request.name() != null) {
            user.setName(request.name().trim());
        }

        if (request.phone() != null) {
            user.setPhone(request.phone().trim());
        }

        if (request.email() != null) {
            String email = normalizeEmail(request.email());
            if (email != null) {
                Optional<User> existing = userRepository.findByEmail(email);
                if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                    throw new IllegalArgumentException("Email is already registered");
                }
            }
            user.setEmail(email);
        }

        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse setActive(String id, boolean active) {
        User user = getEntity(id);
        user.setActive(active);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse incrementCompletedOrdersCount(String id) {
        User user = getEntity(id);
        user.setCompletedOrdersCount(user.getCompletedOrdersCount() + 1);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse incrementRewardRedeemedCount(String id) {
        User user = getEntity(id);
        user.setRewardsRedeemedCount(user.getRewardsRedeemedCount() + 1);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse assignRole(String userId, String roleName) {
        User user = getEntity(userId);
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));
        user.getRoles().add(role);
        return toResponse(userRepository.save(user));
    }

    @Transactional
    public UserResponse removeRole(String userId, String roleName) {
        User user = getEntity(userId);
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalArgumentException("Role not found"));
        user.getRoles().remove(role);
        return toResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(normalizeEmail(email));
    }

    @Transactional(readOnly = true)
    public Optional<User> findById(String id) {
        return userRepository.findById(id);
    }

    private User getEntity(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }

    private UserResponse toResponse(User user) {
        Set<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        return new UserResponse(
                user.getId(),
                user.getName(),
                user.getPhone(),
                user.getEmail(),
                user.getCompletedOrdersCount(),
                user.isActive(),
                roleNames,
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }
        String normalized = email.trim().toLowerCase();
        return normalized.isBlank() ? null : normalized;
    }
}
