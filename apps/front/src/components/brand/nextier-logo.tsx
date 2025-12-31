"use client";

import { cn } from "@/lib/utils";

interface NextierLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
}

const sizes = {
  sm: { icon: 32, text: "text-lg" },
  md: { icon: 48, text: "text-2xl" },
  lg: { icon: 64, text: "text-3xl" },
  xl: { icon: 96, text: "text-5xl" },
};

export function NextierLogo({
  className,
  size = "md",
  showText = true,
}: NextierLogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* X Logo Mark */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Definitions for gradients */}
        <defs>
          {/* Blue gradient - left side */}
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#60A5FA" />
            <stop offset="50%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#1E40AF" />
          </linearGradient>
          {/* Orange gradient - right side */}
          <linearGradient id="orangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>
          {/* Cyan glow for hexagon */}
          <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22D3EE" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Left top arm (blue) */}
        <path
          d="M15 15 Q25 15 35 25 L45 40 L35 50 L20 35 Q15 30 15 20 Z"
          fill="url(#blueGrad)"
        />
        {/* Left bottom arm (blue) */}
        <path
          d="M15 85 Q15 75 20 65 L35 50 L45 60 L35 75 Q25 85 15 85 Z"
          fill="url(#blueGrad)"
        />
        {/* Right top arm (orange) */}
        <path
          d="M85 15 Q75 15 65 25 L55 40 L65 50 L80 35 Q85 30 85 20 Z"
          fill="url(#orangeGrad)"
        />
        {/* Right bottom arm (orange) */}
        <path
          d="M85 85 Q85 75 80 65 L65 50 L55 60 L65 75 Q75 85 85 85 Z"
          fill="url(#orangeGrad)"
        />

        {/* Center hexagon with glow */}
        <polygon
          points="50,35 60,42 60,58 50,65 40,58 40,42"
          fill="url(#cyanGrad)"
          filter="url(#glow)"
          stroke="#0F172A"
          strokeWidth="2"
        />
      </svg>

      {/* Text Logo */}
      {showText && (
        <span className={cn("font-bold tracking-tight", text)}>
          <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 bg-clip-text text-transparent">
            NEX
          </span>
          <span className="bg-gradient-to-r from-orange-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
            TIER
          </span>
        </span>
      )}
    </div>
  );
}

export function NextierLogoIcon({ className, size = 48 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="blueGradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
        <linearGradient id="orangeGradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="50%" stopColor="#F97316" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
        <linearGradient id="cyanGradIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#06B6D4" />
        </linearGradient>
        <filter id="glowIcon" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path d="M15 15 Q25 15 35 25 L45 40 L35 50 L20 35 Q15 30 15 20 Z" fill="url(#blueGradIcon)" />
      <path d="M15 85 Q15 75 20 65 L35 50 L45 60 L35 75 Q25 85 15 85 Z" fill="url(#blueGradIcon)" />
      <path d="M85 15 Q75 15 65 25 L55 40 L65 50 L80 35 Q85 30 85 20 Z" fill="url(#orangeGradIcon)" />
      <path d="M85 85 Q85 75 80 65 L65 50 L55 60 L65 75 Q75 85 85 85 Z" fill="url(#orangeGradIcon)" />
      <polygon
        points="50,35 60,42 60,58 50,65 40,58 40,42"
        fill="url(#cyanGradIcon)"
        filter="url(#glowIcon)"
        stroke="#0F172A"
        strokeWidth="2"
      />
    </svg>
  );
}
