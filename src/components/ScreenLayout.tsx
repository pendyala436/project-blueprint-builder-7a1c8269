import { memo, ReactNode, Suspense, lazy } from 'react';
import { cn } from '@/lib/utils';

const AuroraBackground = lazy(() => import('./AuroraBackground'));

interface ScreenLayoutProps {
  children: ReactNode;
  className?: string;
  showAurora?: boolean;
  headerContent?: ReactNode;
  footerContent?: ReactNode;
}

/**
 * Unified screen layout wrapper for consistent theming across all screens.
 * Provides:
 * - Aurora background (optional)
 * - Consistent padding and safe areas
 * - Header and footer slots
 */
const ScreenLayout = memo(({
  children,
  className,
  showAurora = true,
  headerContent,
  footerContent,
}: ScreenLayoutProps) => {
  return (
    <div className={cn(
      "min-h-screen flex flex-col relative bg-background text-foreground",
      className
    )}>
      {/* Aurora Background */}
      {showAurora && (
        <Suspense fallback={
          <div className="fixed inset-0 -z-10 bg-gradient-to-br from-background via-background to-secondary/30" />
        }>
          <AuroraBackground />
        </Suspense>
      )}
      
      {/* Header */}
      {headerContent && (
        <header className="px-6 pt-8 pb-4 relative z-10">
          {headerContent}
        </header>
      )}
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10">
        {children}
      </main>
      
      {/* Footer */}
      {footerContent && (
        <footer className="relative z-10">
          {footerContent}
        </footer>
      )}
    </div>
  );
});

ScreenLayout.displayName = 'ScreenLayout';

export default ScreenLayout;
