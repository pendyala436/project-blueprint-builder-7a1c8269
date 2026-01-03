import { memo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationHeaderProps {
  title?: string;
  showBack?: boolean;
  showForward?: boolean;
  showHome?: boolean;
  backPath?: string;
  homePath?: string;
  className?: string;
  rightContent?: React.ReactNode;
}

/**
 * Reusable navigation header with back, forward, and home buttons.
 */
const NavigationHeader = memo(({
  title,
  showBack = true,
  showForward = false,
  showHome = true,
  backPath,
  homePath,
  className,
  rightContent,
}: NavigationHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine home path based on current route or user type
  const defaultHomePath = location.pathname.includes('women') || 
    location.pathname.includes('shift') ? '/women-dashboard' : '/dashboard';
  const finalHomePath = homePath || defaultHomePath;

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const handleForward = () => {
    navigate(1);
  };

  const handleHome = () => {
    navigate(finalHomePath);
  };

  return (
    <div className={cn(
      "flex items-center justify-between gap-3 py-2",
      className
    )}>
      <div className="flex items-center gap-2">
        {showBack && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full hover:bg-muted"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        
        {showForward && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleForward}
            className="rounded-full hover:bg-muted"
            aria-label="Go forward"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
        )}
        
        {showHome && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleHome}
            className="rounded-full hover:bg-muted"
            aria-label="Go home"
          >
            <Home className="h-5 w-5" />
          </Button>
        )}
        
        {title && (
          <h1 className="text-lg font-semibold ml-2">{title}</h1>
        )}
      </div>
      
      {rightContent && (
        <div className="flex items-center gap-2">
          {rightContent}
        </div>
      )}
    </div>
  );
});

NavigationHeader.displayName = 'NavigationHeader';

export default NavigationHeader;
