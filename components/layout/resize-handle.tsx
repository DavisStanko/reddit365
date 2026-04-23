"use client";

import { useCallback, useRef, useEffect } from "react";

interface ResizeHandleProps {
  /** Callback fires with the delta in pixels the handle has moved */
  onResize: (deltaX: number) => void;
  /** Optional className override */
  className?: string;
}

export function ResizeHandle({ onResize, className = "" }: ResizeHandleProps) {
  const isDragging = useRef(false);
  const lastX = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDragging.current = true;
      lastX.current = e.clientX;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    []
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - lastX.current;
      lastX.current = e.clientX;
      onResize(deltaX);
    };

    const handleMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onResize]);

  return (
    <div
      className={`resize-handle ${className}`}
      onMouseDown={handleMouseDown}
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
    />
  );
}
