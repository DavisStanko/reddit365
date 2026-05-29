"use client";

interface ResizeHandleProps {
  /** Optional className override */
  className?: string;
}

export function ResizeHandle({ className = "" }: ResizeHandleProps) {
  // Resizing disabled as per user request
  return (
    <div
      className={`resize-handle ${className}`}
      role="separator"
      aria-orientation="vertical"
    />
  );
}
