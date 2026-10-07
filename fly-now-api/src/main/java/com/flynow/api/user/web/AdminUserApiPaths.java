package com.flynow.api.user.web;

public final class AdminUserApiPaths {

    public static final String BASE = "/api/admin/users";
    public static final String STATUS_BY_USER_ID = "/{userId}/status";
    public static final String ROLE_BY_USER_ID = "/{userId}/role";

    private AdminUserApiPaths() {
    }
}
