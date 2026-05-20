package com.petites.backend.users.controller;

import java.util.List;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.petites.backend.users.dto.RoleResponse;
import com.petites.backend.users.dto.UserResponse;
import com.petites.backend.users.service.RoleService;
import com.petites.backend.users.service.UserService;

@RestController
@RequestMapping("/api")
public class RoleController {

    private final RoleService roleService;
    private final UserService userService;

    public RoleController(RoleService roleService, UserService userService) {
        this.roleService = roleService;
        this.userService = userService;
    }

    @GetMapping("/roles")
    public List<RoleResponse> listRoles() {
        return roleService.list();
    }

    @PostMapping("/users/{userId}/roles/{roleName}")
    public UserResponse assignRole(@PathVariable String userId, @PathVariable String roleName) {
        return userService.assignRole(userId, roleName);
    }

    @DeleteMapping("/users/{userId}/roles/{roleName}")
    public UserResponse removeRole(@PathVariable String userId, @PathVariable String roleName) {
        return userService.removeRole(userId, roleName);
    }
}
