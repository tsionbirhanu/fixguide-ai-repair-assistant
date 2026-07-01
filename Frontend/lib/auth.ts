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
        const errorMsg = parseErrorDetail(data.detail) || "Signup failed";
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
      return {
        success: false,
        user: null,
        session: null,
        message:
          "Network error. Please check if the backend server is running.",
        error: "Network error",
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
          parseErrorDetail(data.detail) ||
          "Login failed. Please check your credentials.";
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
      return {
        success: false,
        user: null,
        session: null,
        message:
          "Network error. Please check if the backend server is running.",
        error: "Network error",
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
