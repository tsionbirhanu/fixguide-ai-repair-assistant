// components/Card.tsx - Premium card component

import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  padding = "md",
}) => {
  const paddingStyles = {
    none: "",
    sm: "p-4",
    md: "p-4 sm:p-6",
    lg: "p-5 sm:p-8",
  };

  return (
    <div
      className={`
        bg-white dark:bg-[rgb(31,41,55)]
        border border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)]
        rounded-xl shadow-sm
        ${paddingStyles[padding]}
        ${className}
      `}>
      {children}
    </div>
  );
};
