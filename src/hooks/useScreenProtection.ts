/**
 * useScreenProtection Hook
 * 
 * Provides screen capture protection and detection for the application.
 * 
 * IMPORTANT LIMITATIONS:
 * - Web browsers CANNOT prevent OS-level screenshots
 * - This provides deterrents and detection, not absolute protection
 * - Native mobile apps (via Capacitor) can provide stronger protection
 * 
 * Features:
 * - Detects window blur (potential screen capture)
 * - Detects PrintScreen key press
 * - Applies visual protection when threat detected
 * - Logs potential capture attempts
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ScreenProtectionState {
  isProtected: boolean;
  captureAttempts: number;
  lastAttemptAt: Date | null;
}

interface UseScreenProtectionOptions {
  enableBlurOnFocusLoss?: boolean;
  enablePrintScreenDetection?: boolean;
  logAttempts?: boolean;
  onCaptureAttempt?: () => void;
}

export const useScreenProtection = (options: UseScreenProtectionOptions = {}) => {
  const {
    enableBlurOnFocusLoss = true,
    enablePrintScreenDetection = true,
    logAttempts = true,
    onCaptureAttempt
  } = options;

  const [state, setState] = useState<ScreenProtectionState>({
    isProtected: false,
    captureAttempts: 0,
    lastAttemptAt: null
  });

  // Log capture attempt to database
  const logCaptureAttempt = useCallback(async (type: string) => {
    if (!logAttempts) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Log to audit_logs table
      await supabase.from('audit_logs').insert({
        admin_id: user.id,
        action: 'screen_capture_attempt',
        action_type: 'security',
        resource_type: 'screen_capture',
        details: JSON.stringify({
          type,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }),
        status: 'detected'
      });

      console.warn(`[Security] Screen capture attempt detected: ${type}`);
    } catch (error) {
      console.error('[Security] Failed to log capture attempt:', error);
    }
  }, [logAttempts]);

  // Handle capture attempt
  const handleCaptureAttempt = useCallback((type: string) => {
    setState(prev => ({
      isProtected: true,
      captureAttempts: prev.captureAttempts + 1,
      lastAttemptAt: new Date()
    }));

    logCaptureAttempt(type);
    onCaptureAttempt?.();

    // Remove protection after 2 seconds
    setTimeout(() => {
      setState(prev => ({ ...prev, isProtected: false }));
    }, 2000);
  }, [logCaptureAttempt, onCaptureAttempt]);

  useEffect(() => {
    // Handle window blur (user may be taking screenshot)
    const handleVisibilityChange = () => {
      if (enableBlurOnFocusLoss && document.hidden) {
        handleCaptureAttempt('visibility_hidden');
      }
    };

    const handleWindowBlur = () => {
      if (enableBlurOnFocusLoss) {
        handleCaptureAttempt('window_blur');
      }
    };

    // Detect PrintScreen key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!enablePrintScreenDetection) return;

      // PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        handleCaptureAttempt('print_screen_key');
      }

      // Common screenshot shortcuts
      // Windows: Win+Shift+S, PrtScn
      // Mac: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
      if (
        (e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key)) ||
        (e.ctrlKey && e.key === 'p') // Print dialog
      ) {
        handleCaptureAttempt('screenshot_shortcut');
      }
    };

    // Prevent right-click context menu on images
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('[data-protected]')) {
        e.preventDefault();
        handleCaptureAttempt('context_menu');
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);

    // Apply CSS protection
    const style = document.createElement('style');
    style.id = 'screen-protection-styles';
    style.textContent = `
      /* Prevent text selection on protected elements */
      [data-protected] {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }

      /* Prevent image dragging */
      [data-protected] img {
        -webkit-user-drag: none;
        -khtml-user-drag: none;
        -moz-user-drag: none;
        -o-user-drag: none;
        pointer-events: none;
      }

      /* Protection overlay when capture detected */
      .screen-protection-active::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: black;
        z-index: 99999;
        pointer-events: none;
        animation: flash 0.3s ease-out;
      }

      @keyframes flash {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.getElementById('screen-protection-styles')?.remove();
    };
  }, [enableBlurOnFocusLoss, enablePrintScreenDetection, handleCaptureAttempt]);

  // Apply protection class to body when active
  useEffect(() => {
    if (state.isProtected) {
      document.body.classList.add('screen-protection-active');
    } else {
      document.body.classList.remove('screen-protection-active');
    }
  }, [state.isProtected]);

  return {
    isProtected: state.isProtected,
    captureAttempts: state.captureAttempts,
    lastAttemptAt: state.lastAttemptAt
  };
};

export default useScreenProtection;
