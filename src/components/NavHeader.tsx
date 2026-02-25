import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import { ReactNode } from "react";

interface NavHeaderProps {
  title?: ReactNode;
  rightContent?: ReactNode;
  maxWidth?: string;
}

/**
 * Determines home route based on current path:
 * - /admin/* → /admin
 * - /women-* or female context → /women-dashboard
 * - default → /dashboard (men)
 */
const getHomeRoute = (pathname: string): string => {
  if (pathname.startsWith("/admin")) return "/admin";
  if (
    pathname.startsWith("/women-") ||
    pathname.startsWith("/shift-compliance")
  ) {
    return "/women-dashboard";
  }
  return "/dashboard";
};

const NavHeader = ({ title, rightContent, maxWidth = "max-w-md" }: NavHeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const homeRoute = getHomeRoute(location.pathname);

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className={`${maxWidth} mx-auto px-4 py-3 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Button
            variant="auroraGhost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="auroraGhost"
            size="icon"
            onClick={() => navigate(homeRoute)}
            className="rounded-full"
            aria-label="Go home"
          >
            <Home className="h-5 w-5" />
          </Button>
          {title && (
            <div className="ml-1">{typeof title === "string" ? (
              <h1 className="text-xl font-semibold">{title}</h1>
            ) : title}</div>
          )}
        </div>
        {rightContent && <div className="flex items-center gap-1">{rightContent}</div>}
      </div>
    </div>
  );
};

export default NavHeader;
