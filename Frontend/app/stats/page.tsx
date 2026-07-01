"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { authService } from "@/lib/auth";
import { API_CONFIG } from "@/lib/config";
import { UserStats } from "@/lib/types";

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check authentication
    if (!authService.isAuthenticated()) {
      router.push("/login");
      return;
    }

    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchStats = async () => {
    try {
      const token = authService.getToken();
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.STATS}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        if (response.status === 401) {
          authService.logout();
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch stats");
      }

      const data: UserStats = await response.json();
      setStats(data);
    } catch (err) {
      console.error("Error fetching stats:", err);
      setError("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    router.push("/login");
  };

  const user = authService.getUser();

  return (
    <div className="min-h-screen bg-white dark:bg-[rgb(15,15,15)]">
      {/* Header */}
      <header className="border-b border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] bg-white dark:bg-[rgb(31,41,55)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/chat")}>
              Back to Chat
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[rgb(15,15,15)] dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]">
            {user?.email || "Your statistics and usage"}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : error ? (
          <Card>
            <div className="text-center py-8">
              <p className="text-red-500">{error}</p>
              <Button variant="primary" onClick={fetchStats} className="mt-4">
                Retry
              </Button>
            </div>
          </Card>
        ) : (
          <div>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgb(255,138,101)]/10 mb-4">
                    <svg
                      className="w-6 h-6 text-[rgb(255,138,101)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-[rgb(15,15,15)] dark:text-white mb-1">
                    {stats?.total_conversations || 0}
                  </h3>
                  <p className="text-sm text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]">
                    Conversations
                  </p>
                </div>
              </Card>

              <Card>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgb(255,138,101)]/10 mb-4">
                    <svg
                      className="w-6 h-6 text-[rgb(255,138,101)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-[rgb(15,15,15)] dark:text-white mb-1">
                    {stats?.total_messages || 0}
                  </h3>
                  <p className="text-sm text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]">
                    Messages
                  </p>
                </div>
              </Card>

              <Card>
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgb(255,138,101)]/10 mb-4">
                    <svg
                      className="w-6 h-6 text-[rgb(255,138,101)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-3xl font-bold text-[rgb(15,15,15)] dark:text-white mb-1">
                    {stats?.total_tokens?.toLocaleString() || 0}
                  </h3>
                  <p className="text-sm text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]">
                    Tokens Used
                  </p>
                </div>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <h2 className="text-xl font-bold text-[rgb(15,15,15)] dark:text-white mb-4">
                Quick Actions
              </h2>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary" onClick={() => router.push("/chat")}>
                  Start New Conversation
                </Button>
                <Button variant="outline" onClick={fetchStats}>
                  Refresh Statistics
                </Button>
              </div>
            </Card>

            {/* Usage Tips */}
            <Card className="mt-6">
              <h2 className="text-xl font-bold text-[rgb(15,15,15)] dark:text-white mb-4">
                Tips for Better Results
              </h2>
              <ul className="space-y-3 text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]">
                <li className="flex items-start gap-2">
                  <span className="text-[rgb(255,138,101)] mt-1">•</span>
                  <span>
                    Be specific about your device model and the issue
                    you&apos;re experiencing
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[rgb(255,138,101)] mt-1">•</span>
                  <span>
                    Include any error messages or symptoms you&apos;ve noticed
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[rgb(255,138,101)] mt-1">•</span>
                  <span>
                    Ask follow-up questions if you need clarification on any
                    steps
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[rgb(255,138,101)] mt-1">•</span>
                  <span>
                    Use &quot;New Chat&quot; button to start fresh conversations
                    on different topics
                  </span>
                </li>
              </ul>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
