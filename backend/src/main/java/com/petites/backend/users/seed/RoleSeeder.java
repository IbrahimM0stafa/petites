package com.petites.backend.users.seed;

import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.petites.backend.users.entity.Role;
import com.petites.backend.users.repository.RoleRepository;

@Component
public class RoleSeeder implements CommandLineRunner {

    private static final List<String> DEFAULT_ROLES = List.of("SUPER_ADMIN", "STAFF", "USER");

    private final RoleRepository roleRepository;

    public RoleSeeder(RoleRepository roleRepository) {
        this.roleRepository = roleRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        for (String roleName : DEFAULT_ROLES) {
            if (roleRepository.findByName(roleName).isEmpty()) {
                roleRepository.save(new Role(roleName));
            }
        }
    }
}
