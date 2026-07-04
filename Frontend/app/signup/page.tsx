"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { authService } from "@/lib/auth";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const isRateLimitError =
    error.toLowerCase().includes("rate limit") ||
    error.toLowerCase().includes("too many requests");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const response = await authService.signup(email, password);

      if (response.success) {
        if (response.access_token) {
          setSuccess(response.message || "Account created. Taking you to chat...");
          setTimeout(() => {
            router.push("/chat");
          }, 800);
        } else {
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          setSuccess(response.message || "Account created. Check your email to verify your account.");
          setTimeout(() => {
            router.push(`/login?email=${encodeURIComponent(email)}&signedup=1`);
          }, 3000);
        }
      } else {
        // Show error message from backend or default message
        setError(
          response.error ||
            response.message ||
            "Signup failed. Please try again.",
        );
      }
    } catch (err) {
      console.error("Signup error:", err);
      setError("Could not reach FixGuide AI right now. Please wait a moment and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-white dark:bg-[rgb(15,15,15)] px-3 py-6 sm:px-4 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-3 sm:mb-4">
            <Logo size="lg" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Create your account
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Get started with FixGuide AI today
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">
                  {error}
                </p>
                {isRateLimitError ? (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-300">
                    Supabase is temporarily blocking more verification emails. Wait for the limit to reset, or add a custom SMTP provider in Supabase.
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-300">
                    Already created an account? Use the sign-in page instead.
                  </p>
                )}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-600 dark:text-green-400">
                  {success}
                </p>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-[rgb(255,138,101)] hover:text-[rgb(255,120,85)] font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </Card>

        <p className="mt-6 sm:mt-8 px-2 text-center text-xs leading-5 text-[rgb(156,163,175)]">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy
        </p>
      </div>
    </div>
  );
}
