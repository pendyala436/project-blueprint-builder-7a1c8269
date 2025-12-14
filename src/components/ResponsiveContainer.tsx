/**
 * ResponsiveContainer.tsx
 * 
 * A responsive container component that adapts to all device types
 * Provides consistent padding, max-width, and safe area handling
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useDeviceDetect } from '@/hooks/useDeviceDetect';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'responsive';
  safeArea?: boolean;
  centered?: boolean;
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
  none: '',
};

const paddingClasses = {
  none: '',
  sm: 'px-2 py-2',
  md: 'px-4 py-4',
  lg: 'px-6 py-6 md:px-8 md:py-8',
  responsive: 'px-3 py-3 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8',
};

export function ResponsiveContainer({
  children,
  className,
  as: Component = 'div',
  maxWidth = 'xl',
  padding = 'responsive',
  safeArea = true,
  centered = true,
}: ResponsiveContainerProps) {
  const { isNativeApp, isIPhone, isIPad } = useDeviceDetect();

  return (
    <Component
      className={cn(
        'w-full',
        maxWidthClasses[maxWidth],
        paddingClasses[padding],
        centered && 'mx-auto',
        safeArea && 'safe-area-inset',
        // Extra bottom padding for iOS devices with home indicator
        safeArea && (isIPhone || isIPad) && 'pb-safe-bottom',
        // Extra padding for native apps
        isNativeApp && 'pt-safe-top',
        className
      )}
    >
      {children}
    </Component>
  );
}

// Responsive Grid component
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'responsive';
}

const gapClasses = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  responsive: 'gap-3 sm:gap-4 md:gap-6 lg:gap-8',
};

export function ResponsiveGrid({
  children,
  className,
  cols = { default: 1, sm: 2, md: 3, lg: 4 },
  gap = 'responsive',
}: ResponsiveGridProps) {
  const gridCols = cn(
    'grid',
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    gapClasses[gap],
    className
  );

  return <div className={gridCols}>{children}</div>;
}

// Responsive Stack component (vertical on mobile, horizontal on desktop)
interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
  breakpoint?: 'sm' | 'md' | 'lg';
  gap?: 'sm' | 'md' | 'lg' | 'responsive';
}

export function ResponsiveStack({
  children,
  className,
  reverse = false,
  breakpoint = 'md',
  gap = 'responsive',
}: ResponsiveStackProps) {
  const breakpointClass = {
    sm: 'sm:flex-row',
    md: 'md:flex-row',
    lg: 'lg:flex-row',
  };

  return (
    <div
      className={cn(
        'flex flex-col',
        breakpointClass[breakpoint],
        reverse && 'flex-col-reverse',
        reverse && `${breakpoint}:flex-row-reverse`,
        gapClasses[gap],
        className
      )}
    >
      {children}
    </div>
  );
}

// Hide/Show components based on device
interface DeviceVisibilityProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileOnly({ children, className }: DeviceVisibilityProps) {
  return <div className={cn('block md:hidden', className)}>{children}</div>;
}

export function TabletOnly({ children, className }: DeviceVisibilityProps) {
  return <div className={cn('hidden md:block lg:hidden', className)}>{children}</div>;
}

export function DesktopOnly({ children, className }: DeviceVisibilityProps) {
  return <div className={cn('hidden lg:block', className)}>{children}</div>;
}

export function MobileAndTablet({ children, className }: DeviceVisibilityProps) {
  return <div className={cn('block lg:hidden', className)}>{children}</div>;
}

export function TabletAndDesktop({ children, className }: DeviceVisibilityProps) {
  return <div className={cn('hidden md:block', className)}>{children}</div>;
}

// Touch-friendly wrapper
interface TouchFriendlyProps {
  children: React.ReactNode;
  className?: string;
  minHeight?: number;
}

export function TouchFriendly({ 
  children, 
  className,
  minHeight = 44 
}: TouchFriendlyProps) {
  return (
    <div 
      className={cn('touch-manipulation', className)}
      style={{ minHeight: `${minHeight}px`, minWidth: `${minHeight}px` }}
    >
      {children}
    </div>
  );
}
