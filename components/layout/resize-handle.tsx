"use client";

interface ResizeHandleProps {
  /** Callback fires with the delta in pixels the handle has moved */
  onResize: (deltaX: number) => void;
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
