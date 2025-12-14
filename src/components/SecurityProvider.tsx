/**
 * SecurityProvider Component
 * 
 * Wraps the application with security features:
 * - Screen capture detection
 * - Developer tools detection
 * - Console protection
 * - Keyboard shortcut blocking
 * 
 * IMPORTANT: These are deterrents, not foolproof protections.
 * Determined attackers can bypass client-side protections.
 */

import React, { useEffect, createContext, useContext, useState } from 'react';
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

const SecurityProvider: React.FC<SecurityProviderProps> = ({
  children,
  enableDevToolsDetection = true,
  enableConsoleProtection = false, // Disabled by default for debugging
  enableKeyboardBlocking = true
}) => {
  const [captureAttempts, setCaptureAttempts] = useState(0);
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // ========================================
    // Developer Tools Detection
    // ========================================
    let devToolsCheckInterval: NodeJS.Timeout;

    if (enableDevToolsDetection) {
      const checkDevTools = () => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        const isOpen = widthThreshold || heightThreshold;
        
        if (isOpen !== devToolsOpen) {
          setDevToolsOpen(isOpen);
          if (isOpen) {
            console.warn('[Security] Developer tools detected');
          }
        }
      };

      devToolsCheckInterval = setInterval(checkDevTools, 1000);
    }

    // ========================================
    // Console Protection (clears console)
    // ========================================
    if (enableConsoleProtection) {
      const originalConsole = { ...console };
      
      // Override console methods in production
      if (import.meta.env.PROD) {
        console.log = () => {};
        console.warn = () => {};
        console.error = () => {};
        console.info = () => {};
      }
    }

    // ========================================
    // Keyboard Shortcut Blocking
    // ========================================
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enableKeyboardBlocking) return;

      // Block common dev shortcuts
      const blockedCombos = [
        { ctrl: true, shift: true, key: 'i' }, // DevTools
        { ctrl: true, shift: true, key: 'j' }, // Console
        { ctrl: true, shift: true, key: 'c' }, // Inspect element
        { ctrl: true, key: 'u' }, // View source
        { key: 'F12' }, // DevTools
      ];

      const isBlocked = blockedCombos.some(combo => {
        const ctrlMatch = combo.ctrl ? (e.ctrlKey || e.metaKey) : true;
        const shiftMatch = combo.shift ? e.shiftKey : true;
        const keyMatch = e.key.toLowerCase() === combo.key.toLowerCase();
        return ctrlMatch && shiftMatch && keyMatch;
      });

      if (isBlocked) {
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
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        setCaptureAttempts(prev => prev + 1);
        
        toast({
          title: "Screenshot blocked",
          description: "Screenshots are not allowed in this application.",
          variant: "destructive"
        });
      }
    };

    // ========================================
    // Disable text selection on sensitive elements
    // ========================================
    const handleSelectStart = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-protected]') || target.closest('[data-no-select]')) {
        e.preventDefault();
      }
    };

    // ========================================
    // Prevent copy on protected elements
    // ========================================
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
      clearInterval(devToolsCheckInterval);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('copy', handleCopy);
    };
  }, [enableDevToolsDetection, enableConsoleProtection, enableKeyboardBlocking, devToolsOpen, toast]);

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
};

export default SecurityProvider;
