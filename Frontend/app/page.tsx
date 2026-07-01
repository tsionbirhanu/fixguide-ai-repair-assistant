"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white dark:bg-[rgb(15,15,15)]">
      {/* Header */}
      <header className="border-b border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)]">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/login")}>
              Sign in
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push("/signup")}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 md:py-32">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <Logo size="lg" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-[rgb(15,15,15)] dark:text-white mb-6 leading-tight">
            Your AI-Powered
            <br />
            <span className="text-[rgb(255,138,101)]">Device Repair</span>{" "}
            Assistant
          </h1>
          <p className="text-xl text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)] mb-10 max-w-2xl mx-auto">
            Get expert repair guidance for your devices instantly. From iPhones
            to gaming consoles, we&apos;ve got you covered with AI-powered
            step-by-step instructions.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/signup")}>
              Start Fixing Now
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push("/login")}>
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-[rgb(15,15,15)] dark:text-white mb-12">
          Why Choose FixGuide AI?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgb(255,138,101)]/10 mb-6">
                <svg
                  className="w-8 h-8 text-[rgb(255,138,101)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[rgb(15,15,15)] dark:text-white mb-3">
                Instant Answers
              </h3>
              <p className="text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]">
                Get immediate repair guidance powered by advanced AI. No
                waiting, no searching through forums.
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgb(255,138,101)]/10 mb-6">
                <svg
                  className="w-8 h-8 text-[rgb(255,138,101)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[rgb(15,15,15)] dark:text-white mb-3">
                Expert Knowledge
              </h3>
              <p className="text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]">
                Trained on thousands of repair guides from iFixit and tech
                experts worldwide.
              </p>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[rgb(255,138,101)]/10 mb-6">
                <svg
                  className="w-8 h-8 text-[rgb(255,138,101)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[rgb(15,15,15)] dark:text-white mb-3">
                All Devices
              </h3>
              <p className="text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]">
                From smartphones to gaming consoles, laptops to tablets - we
                support all major devices.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Popular Repairs Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-[rgb(15,15,15)] dark:text-white mb-12">
          Popular Repairs
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            "iPhone Screen Replacement",
            "PS5 Overheating Fix",
            "Xbox Controller Drift",
            "Nintendo Switch Won't Charge",
            "MacBook Battery Replacement",
            "Laptop Keyboard Repair",
          ].map((repair, index) => (
            <div
              key={index}
              className="p-4 rounded-lg border border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] hover:border-[rgb(255,138,101)] dark:hover:border-[rgb(255,138,101)] bg-white dark:bg-[rgb(31,41,55)] cursor-pointer transition-all duration-200"
              onClick={() => router.push("/signup")}>
              <p className="text-[rgb(15,15,15)] dark:text-white font-medium">
                {repair}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <Card padding="lg">
          <div className="text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-[rgb(15,15,15)] dark:text-white mb-4">
              Ready to fix your device?
            </h2>
            <p className="text-lg text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)] mb-8 max-w-2xl mx-auto">
              Join thousands of users who have successfully repaired their
              devices with FixGuide AI. Get started in seconds.
            </p>
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/signup")}>
              Get Started for Free
            </Button>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] mt-20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Logo size="sm" />
            <p className="text-sm text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]">
              © 2026 FixGuide AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
