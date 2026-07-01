// components/Logo.tsx - FixGuide AI Logo component

import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ size = "md", className = "" }) => {
  const sizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative">
        <div className="w-8 h-8 bg-[rgb(255,138,101)] rounded-lg flex items-center justify-center shadow-md">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>
      <span
        className={`font-bold text-[rgb(15,15,15)] dark:text-white ${sizes[size]}`}>
        Fix<span className="text-[rgb(255,138,101)]">Guide</span>
      </span>
    </div>
  );
};
