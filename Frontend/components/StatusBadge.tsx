// components/StatusBadge.tsx - Status indicator badge

import React from "react";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = "",
}) => {
  return (
    <div
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-full
        bg-[rgb(249,250,251)] dark:bg-[rgb(55,65,81)]
        border border-[rgb(229,231,235)] dark:border-[rgb(75,85,99)]
        text-sm text-[rgb(107,114,128)] dark:text-[rgb(156,163,175)]
        ${className}
      `}>
      <div className="w-2 h-2 rounded-full bg-[rgb(255,138,101)] animate-pulse" />
      {status}
    </div>
  );
};
