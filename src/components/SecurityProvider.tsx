/**
 * Optimized Security Provider
 * - Debounced checks to reduce CPU usage
 * - Lazy initialization
 * - Memoized for performance
 */

import React, { useEffect, createContext, useContext, useState, memo, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SecurityContextType {
  isSecurityActive: boolean;
  captureAttempts: number;
  devToolsOpen: boolean;
}

const SecurityContext = createContext<SecurityContextType>({
  isSecurityActive: true,
  captureAttempts: 0,
  devToolsOpen: false
});

export const useSecurityContext = () => useContext(SecurityContext);

interface SecurityProviderProps {
  children: React.ReactNode;
  enableDevToolsDetection?: boolean;
  enableConsoleProtection?: boolean;
  enableKeyboardBlocking?: boolean;
}

const SecurityProvider: React.FC<SecurityProviderProps> = memo(({
  children,
  enableDevToolsDetection = true,
  enableConsoleProtection = false,
  enableKeyboardBlocking = true
}) => {
  const [captureAttempts, setCaptureAttempts] = useState(0);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const { toast } = useToast();
  const devToolsRef = useRef(devToolsOpen);

  // Update ref when state changes
  devToolsRef.current = devToolsOpen;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enableKeyboardBlocking) return;

    // Quick check for common blocked keys first - guard against undefined key
    const key = e.key?.toLowerCase?.() || '';
    if (!key) return;
    
    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    // Block DevTools shortcuts
    if (
      (isCtrlOrMeta && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
      (isCtrlOrMeta && key === 'u') ||
      key === 'f12'
    ) {
      e.preventDefault();
      e.stopPropagation();
      setCaptureAttempts(prev => prev + 1);
      toast({
        title: "Action blocked",
        description: "This action is not allowed for security reasons.",
        variant: "destructive"
      });
      return false;
    }

    // Detect PrintScreen
    if (key === 'printscreen') {
      e.preventDefault();
      setCaptureAttempts(prev => prev + 1);
      toast({
        title: "Screenshot blocked",
        description: "Screenshots are not allowed in this application.",
        variant: "destructive"
      });
    }
  }, [enableKeyboardBlocking, toast]);

  useEffect(() => {
    // DevTools detection with longer interval
    let devToolsCheckInterval: NodeJS.Timeout | undefined;

    if (enableDevToolsDetection) {
      const checkDevTools = () => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        const isOpen = widthThreshold || heightThreshold;
        
        if (isOpen !== devToolsRef.current) {
          setDevToolsOpen(isOpen);
          if (isOpen) {
            console.warn('[Security] Developer tools detected');
          }
        }
      };

      // Check less frequently - every 2 seconds instead of 1
      devToolsCheckInterval = setInterval(checkDevTools, 2000);
    }

    // Console protection in production only
    if (enableConsoleProtection && import.meta.env.PROD) {
      console.log = () => {};
      console.warn = () => {};
      console.error = () => {};
      console.info = () => {};
    }

    // Selection and copy handlers
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-protected]') || target.closest('[data-no-select]')) {
        e.preventDefault();
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      const selection = window.getSelection();
      const selectedNode = selection?.anchorNode?.parentElement;
      
      if (selectedNode?.closest('[data-protected]')) {
        e.preventDefault();
        toast({
          title: "Copy blocked",
          description: "Copying this content is not allowed.",
          variant: "destructive"
        });
      }
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('copy', handleCopy);

    return () => {
      if (devToolsCheckInterval) {
        clearInterval(devToolsCheckInterval);
      }
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleCopy);
    };
  }, [enableDevToolsDetection, enableConsoleProtection, handleKeyDown, toast]);

  return (
    <SecurityContext.Provider 
      value={{ 
        isSecurityActive: true, 
        captureAttempts, 
        devToolsOpen 
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
});

SecurityProvider.displayName = 'SecurityProvider';

export default SecurityProvider;
