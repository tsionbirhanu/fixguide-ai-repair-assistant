// components/Input.tsx - Premium input component

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = "",
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-[rgb(15,15,15)] dark:text-white mb-2">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full px-4 py-3 rounded-lg
          bg-white dark:bg-[rgb(31,41,55)]
          border border-[rgb(229,231,235)] dark:border-[rgb(55,65,81)]
          text-[rgb(15,15,15)] dark:text-white
          placeholder-[rgb(156,163,175)]
          focus:outline-none focus:ring-2 focus:ring-[rgb(255,138,101)] focus:border-transparent
          transition-all duration-200
          ${error ? "border-red-500 focus:ring-red-500" : ""}
          ${className}
        `}
        {...props}
      />
      {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
    </div>
  );
};
