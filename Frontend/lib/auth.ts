// auth.ts - Authentication helper functions

import { API_CONFIG } from "./config";
import { AuthResponse } from "./types";

const isBrowser = () => typeof window !== "undefined";

/** Parse FastAPI error detail - can be string or array of validation errors */
function parseErrorDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0];
    if (typeof first === "object" && first !== null && "msg" in first) {
      return String((first as { msg: string }).msg);
    }
  }
  return "An error occurred. Please try again.";
}

function friendlyAuthError(message: string, mode: "login" | "signup"): string {
  const text = (message || "").trim();
  const normalized = text.toLowerCase();

  if (!text || normalized === "an error occurred. please try again.") {
    return mode === "login"
      ? "We could not sign you in. Check your email and password, then try again."
      : "We could not create your account. Check the form and try again.";
  }

  if (
    normalized.includes("invalid login") ||
    normalized.includes("invalid_credentials") ||
    normalized.includes("incorrect") ||
    normalized.includes("invalid email or password")
  ) {
    return "Email or password is incorrect. If you just created the account, confirm your email first, then sign in.";
  }

  if (normalized.includes("email not confirmed") || normalized.includes("confirm your email")) {
    return "Please confirm your email address before signing in. Check your inbox or spam folder.";
  }

  if (
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("already exists")
  ) {
    return "This email already has an account. Sign in instead, or use a different email.";
  }

  if (normalized.includes("password") && (normalized.includes("short") || normalized.includes("least"))) {
    return "Password must be at least 6 characters long.";
  }

  if (normalized.includes("invalid email") || normalized.includes("valid email")) {
    return "Please enter a valid email address.";
  }

  if (normalized.includes("signup") && normalized.includes("disabled")) {
    return "New account signup is currently disabled for this project.";
  }

  if (normalized.includes("network") || normalized.includes("failed to fetch")) {
    return "Could not reach the FixGuide AI backend. Please wait a moment and try again.";
  }

  return text;
}

export const authService = {
  async signup(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.SIGNUP}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        },
      );

      const data = await response.json().catch(() => ({}));

      // Handle HTTP errors
      if (!response.ok) {
        const errorMsg = friendlyAuthError(parseErrorDetail(data.detail), "signup");
        return {
          success: false,
          user: null,
          session: null,
          message: errorMsg,
          error: errorMsg,
        };
      }

      // Get access_token from response (top level or from session)
      const accessToken = data.access_token || data.session?.access_token;

      if (data.success && accessToken) {
        if (!isBrowser()) return { ...data, access_token: accessToken };
        localStorage.setItem("access_token", accessToken);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      }

      return {
        ...data,
        access_token: accessToken,
      };
    } catch (error) {
      console.error("Signup error:", error);
      const errorMsg = friendlyAuthError(error instanceof Error ? error.message : "Network error", "signup");
      return {
        success: false,
        user: null,
        session: null,
        message: errorMsg,
        error: errorMsg,
      };
    }
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim(), password }),
        },
      );

      const data = await response.json().catch(() => ({}));

      // Handle HTTP errors
      if (!response.ok) {
        const errorMsg =
          friendlyAuthError(parseErrorDetail(data.detail), "login") ||
          "We could not sign you in. Check your email and password, then try again.";
        return {
          success: false,
          user: null,
          session: null,
          message: errorMsg,
          error: errorMsg,
        };
      }

      // Get access_token from response (top level or from session)
      const accessToken = data.access_token || data.session?.access_token;

      if (data.success && accessToken) {
        if (!isBrowser()) return { ...data, access_token: accessToken };
        localStorage.setItem("access_token", accessToken);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      }

      return {
        ...data,
        access_token: accessToken,
      };
    } catch (error) {
      console.error("Login error:", error);
      const errorMsg = friendlyAuthError(error instanceof Error ? error.message : "Network error", "login");
      return {
        success: false,
        user: null,
        session: null,
        message: errorMsg,
        error: errorMsg,
      };
    }
  },

  async logout(): Promise<void> {
    if (!isBrowser()) return;
    const token = localStorage.getItem("access_token");

    if (token) {
      try {
        await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }

    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  },

  getToken(): string | null {
    if (!isBrowser()) return null;
    return localStorage.getItem("access_token");
  },

  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  getUser() {
    if (!isBrowser()) return null;
    const userStr = localStorage.getItem("user");
    return userStr ? JSON.parse(userStr) : null;
  },
};
