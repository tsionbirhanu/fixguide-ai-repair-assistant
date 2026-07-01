// components/LoadingSpinner.tsx - Loading spinner component

import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  className = "",
}) => {
  const sizes = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      className={`
        ${sizes[size]}
        border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)]
        border-t-[rgb(255,138,101)]
        rounded-full
        animate-spin
        ${className}
      `}
    />
  );
};
