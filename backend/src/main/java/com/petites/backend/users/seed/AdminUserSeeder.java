package com.petites.backend.users.seed;

import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.petites.backend.users.entity.Role;
import com.petites.backend.users.entity.User;
import com.petites.backend.users.repository.RoleRepository;
import com.petites.backend.users.repository.UserRepository;

@Component
@Profile("dev")
@Order(2)
public class AdminUserSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUserSeeder.class);

    /**
     * Hard-coded so Spring property {@code $$} escaping cannot shorten the password.
     */
    private static final String SEED_PASSWORD = "abcABC12$$";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final boolean enabled;
    private final boolean syncExisting;
    private final String superAdminEmail;
    private final String staffEmail;

    public AdminUserSeeder(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.seed.admin-users.enabled:true}") boolean enabled,
            @Value("${app.seed.admin-users.sync-existing:true}") boolean syncExisting,
            @Value("${app.seed.super-admin.email:superadmin@petites.com}") String superAdminEmail,
            @Value("${app.seed.staff.email:staff@petites.com}") String staffEmail) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.enabled = enabled;
        this.syncExisting = syncExisting;
        this.superAdminEmail = superAdminEmail;
        this.staffEmail = staffEmail;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!enabled) {
            return;
        }

        seedUser(superAdminEmail, "Super Admin", "SUPER_ADMIN");
        seedUser(staffEmail, "Staff User", "STAFF");
    }

    private void seedUser(String email, String name, String roleName) {
        String normalizedEmail = normalizeEmail(email);
        Role role = roleRepository.findByName(roleName)
                .orElseThrow(() -> new IllegalStateException("Role not found: " + roleName));

        Optional<User> existing = userRepository.findByEmail(normalizedEmail);
        if (existing.isPresent()) {
            if (!syncExisting) {
                log.info("Dev seed user already exists, skipping: {}", normalizedEmail);
                return;
            }

            User user = existing.get();
            user.setPasswordHash(passwordEncoder.encode(SEED_PASSWORD));
            user.setActive(true);
            user.getRoles().add(role);
            userRepository.save(user);
            log.info("Dev seed user password and role synced: {}", normalizedEmail);
            return;
        }

        User user = new User();
        user.setName(name);
        user.setPhone("0000000000");
        user.setEmail(normalizedEmail);
        user.setPasswordHash(passwordEncoder.encode(SEED_PASSWORD));
        user.getRoles().add(role);
        userRepository.save(user);
        log.info("Dev seed user created: {}", normalizedEmail);
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }
}
