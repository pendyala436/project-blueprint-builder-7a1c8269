/**
 * ProtectedImage Component
 * 
 * Displays images with protection features:
 * - Prevents right-click/save
 * - Adds invisible watermark with user ID
 * - Blurs when window loses focus
 * - Prevents drag-and-drop
 * 
 * LIMITATIONS:
 * - Cannot prevent OS-level screenshots
 * - Cannot prevent screen recording
 * - Provides deterrents, not absolute protection
 */

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ProtectedImageProps {
  src: string;
  alt: string;
  className?: string;
  watermarkText?: string;
  blurOnFocusLoss?: boolean;
  showWatermark?: boolean;
  onClick?: () => void;
}

const ProtectedImage: React.FC<ProtectedImageProps> = ({
  src,
  alt,
  className,
  watermarkText,
  blurOnFocusLoss = true,
  showWatermark = false,
  onClick
}) => {
  const [isBlurred, setIsBlurred] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle window focus/blur
  useEffect(() => {
    if (!blurOnFocusLoss) return;

    const handleVisibilityChange = () => {
      setIsBlurred(document.hidden);
    };

    const handleBlur = () => setIsBlurred(true);
    const handleFocus = () => setIsBlurred(false);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
    };
  }, [blurOnFocusLoss]);

  // Prevent context menu
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  // Prevent drag
  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
    return false;
  };

  return (
    <div
      ref={containerRef}
      data-protected="true"
      className={cn(
        'relative overflow-hidden select-none',
        className
      )}
      onContextMenu={handleContextMenu}
      onClick={onClick}
    >
      {/* Main Image */}
      <img
        src={src}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-all duration-300',
          isBlurred && 'blur-xl scale-110',
          !isLoaded && 'opacity-0'
        )}
        onLoad={() => setIsLoaded(true)}
        onDragStart={handleDragStart}
        draggable={false}
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
          pointerEvents: 'none'
        }}
      />

      {/* Invisible overlay to prevent interaction */}
      <div
        className="absolute inset-0 z-10"
        onContextMenu={handleContextMenu}
        style={{ background: 'transparent' }}
      />

      {/* Watermark overlay (visible or invisible) */}
      {watermarkText && (
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center pointer-events-none z-20',
            showWatermark ? 'opacity-30' : 'opacity-[0.01]'
          )}
          style={{
            background: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 50px,
              rgba(255,255,255,0.03) 50px,
              rgba(255,255,255,0.03) 100px
            )`
          }}
        >
          <span
            className="text-foreground text-sm font-bold transform rotate-[-30deg] whitespace-nowrap"
            style={{
              textShadow: showWatermark ? '1px 1px 2px hsl(var(--background))' : 'none'
            }}
          >
            {watermarkText}
          </span>
        </div>
      )}

      {/* Blur overlay message */}
      {isBlurred && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-30">
          <span className="text-foreground text-sm font-medium">
            Content protected
          </span>
        </div>
      )}

      {/* Loading skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
    </div>
  );
};

export default ProtectedImage;
