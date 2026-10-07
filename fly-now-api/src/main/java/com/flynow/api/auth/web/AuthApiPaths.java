package com.flynow.api.auth.web;

public final class AuthApiPaths {

    public static final String BASE = "/api/auth";
    public static final String CSRF = "/csrf";
    public static final String REGISTER = "/register";
    public static final String LOGIN = "/login";
    public static final String REFRESH = "/refresh";
    public static final String LOGOUT = "/logout";
    public static final String LOGOUT_ALL = "/logout-all";
    public static final String FORGOT_PASSWORD = "/forgot-password";
    public static final String RESET_PASSWORD = "/reset-password";
    public static final String CHANGE_PASSWORD = "/change-password";
    public static final String SESSIONS = "/sessions";
    public static final String SESSION_BY_ID = SESSIONS + "/{sessionId}";

    public static final String REGISTER_FULL = BASE + REGISTER;
    public static final String LOGIN_FULL = BASE + LOGIN;
    public static final String REFRESH_FULL = BASE + REFRESH;
    public static final String LOGOUT_FULL = BASE + LOGOUT;
    public static final String FORGOT_PASSWORD_FULL = BASE + FORGOT_PASSWORD;
    public static final String RESET_PASSWORD_FULL = BASE + RESET_PASSWORD;
    public static final String CHANGE_PASSWORD_FULL = BASE + CHANGE_PASSWORD;
    public static final String CSRF_FULL = BASE + CSRF;

    private AuthApiPaths() {
    }
}
