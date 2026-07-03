// components/Logo.tsx - FixGuide AI Logo component

import React from "react";
import { Wrench } from "lucide-react";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({ size = "md", className = "", showText = true }) => {
  const sizes = {
    sm: "text-lg sm:text-xl",
    md: "text-xl sm:text-2xl",
    lg: "text-3xl sm:text-4xl",
  };
  const iconSizes = {
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-11 h-11 sm:w-12 sm:h-12",
  };
  const wrenchSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6 sm:w-7 sm:h-7",
  };

  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${className}`}>
      <div className={`${iconSizes[size]} relative flex items-center justify-center rounded-xl bg-[rgb(255,138,101)] text-white shadow-sm`}>
        <Wrench className={wrenchSizes[size]} strokeWidth={2.4} />
      </div>
      {showText && (
        <span
          className={`truncate font-bold text-[rgb(15,15,15)] dark:text-white ${sizes[size]}`}>
          Fix<span className="text-[rgb(255,138,101)]">Guide</span>
        </span>
      )}
    </div>
  );
};
