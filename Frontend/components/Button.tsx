// components/Button.tsx - Premium button component

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  className = "",
  children,
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-[rgb(255,138,101)] text-white hover:bg-[rgb(255,120,85)] focus:ring-[rgb(255,138,101)] shadow-sm",
    secondary:
      "bg-[rgb(31,41,55)] text-white hover:bg-[rgb(55,65,81)] focus:ring-[rgb(31,41,55)]",
    ghost:
      "bg-transparent hover:bg-[rgb(249,250,251)] dark:hover:bg-[rgb(55,65,81)] text-[rgb(15,15,15)] dark:text-white",
    outline:
      "border border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)] bg-transparent hover:bg-[rgb(249,250,251)] dark:hover:bg-[rgb(55,65,81)] text-[rgb(15,15,15)] dark:text-white",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}>
      {children}
    </button>
  );
};
